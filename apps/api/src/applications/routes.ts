import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, authorize, enforceInstitutionScope, ROLES } from '../middleware/auth.js';
import { validateAndExecuteTransition } from '../workflow/engine.js';
import { recordAuditEvent } from '../audit/recorder.js';
import { evaluateApplicationRisk } from '../risk/calculator.js';

const router = Router();

const CreateApplicationSchema = z.object({
  institutionId: z.string().uuid(),
  category: z.enum(['NEW_INSTITUTION', 'EXTENSION_OF_APPROVAL', 'INTAKE_INCREASE', 'NEW_COURSE']),
  workflowTemplateCode: z.string().default('FULL_CYCLE'),
  academicYear: z.string().default('2025-2026'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  metadata: z.record(z.any()).optional(),
  autoSubmit: z.boolean().default(false),
});

const TransitionSchema = z.object({
  targetStage: z.string(),
  action: z.string().default('TRANSITION'),
  comments: z.string().optional(),
  reason: z.string().optional(),
  prerequisites: z.array(z.string()).optional(),
});

const ReturnSchema = z.object({
  reason: z.string().min(5, 'A clear reason for return must be supplied'),
  deficiencies: z.array(z.string()).optional(),
});

const AssignSchema = z.object({
  assignedToId: z.string().uuid(),
  role: z.string(),
  dueDays: z.number().default(5),
  notes: z.string().optional(),
});

router.get('/', authenticate, async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const {
      search,
      region,
      stage,
      status,
      category,
      riskCategory,
      page = '1',
      limit = '15',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * take;

    // Institution isolation
    const institutionFilter = user.role === ROLES.INSTITUTION_USER && user.institutionId ? { institutionId: user.institutionId } : {};

    const where: any = {
      ...institutionFilter,
      ...(region ? { region: region as string } : {}),
      ...(stage ? { currentStage: stage as string } : {}),
      ...(status ? { status: status as string } : {}),
      ...(category ? { category: category as string } : {}),
      ...(riskCategory ? { riskCategory: riskCategory as string } : {}),
    };

    if (search) {
      where.OR = [
        { applicationNumber: { contains: search as string } },
        { institution: { name: { contains: search as string } } },
        { institution: { code: { contains: search as string } } },
      ];
    }

    const [total, applications] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        include: {
          institution: { select: { id: true, name: true, code: true, region: true, type: true } },
          workflowTemplate: { select: { name: true, code: true } },
          assignments: {
            where: { status: 'ACTIVE' },
            include: { assignedTo: { select: { name: true, role: true } } },
            take: 1,
          },
        },
        orderBy: [{ riskScore: 'desc' }, { stageEntryDate: 'asc' }],
        skip,
        take,
      }),
    ]);

    return res.json({
      success: true,
      data: applications.map((app) => ({
        ...app,
        riskFactors: JSON.parse(app.riskFactorsJson || '[]'),
        metadata: JSON.parse(app.metadataJson || '{}'),
      })),
      pagination: {
        page: pageNum,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const body = CreateApplicationSchema.parse(req.body);

    // Enforce institution ownership
    if (user.role === ROLES.INSTITUTION_USER && user.institutionId !== body.institutionId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only submit applications on behalf of your designated institution.',
      });
    }

    const institution = await prisma.institution.findUnique({
      where: { id: body.institutionId },
    });

    if (!institution) {
      return res.status(404).json({ success: false, error: 'Institution record not found.' });
    }

    // Resolve Workflow Template
    const template = await prisma.workflowTemplate.findFirst({
      where: { code: body.workflowTemplateCode },
      include: { versions: { where: { isPublished: true }, orderBy: { versionNumber: 'desc' }, take: 1 } },
    });

    if (!template || !template.versions[0]) {
      return res.status(400).json({ success: false, error: 'Configured workflow template not found.' });
    }

    const version = template.versions[0];
    const initialStage = body.autoSubmit ? 'SUBMITTED' : 'DRAFT';
    const appSeq = Math.floor(1000 + Math.random() * 9000);
    const regCode = (institution.region || 'HQ').substring(0, 3).toUpperCase();
    const appNumber = `APP-2025-${regCode}-${appSeq}`;

    const now = new Date();
    const initialDeadline = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

    const initialRisk = evaluateApplicationRisk({
      currentStage: initialStage,
      stageEntryDate: now,
      deadlineDate: initialDeadline,
    });

    const application = await prisma.$transaction(async (tx) => {
      const app = await tx.application.create({
        data: {
          applicationNumber: appNumber,
          institutionId: institution.id,
          region: institution.region,
          category: body.category,
          academicYear: body.academicYear,
          workflowTemplateId: template.id,
          workflowVersionId: version.id,
          currentStage: initialStage,
          status: initialStage === 'SUBMITTED' ? 'IN_PROGRESS' : 'PENDING_ACTION',
          priority: body.priority,
          riskScore: initialRisk.score,
          riskCategory: initialRisk.category,
          riskFactorsJson: JSON.stringify(initialRisk.factors),
          submissionDate: now,
          stageEntryDate: now,
          deadlineDate: initialDeadline,
          metadataJson: JSON.stringify(body.metadata || {}),
        },
      });

      await tx.stageHistory.create({
        data: {
          applicationId: app.id,
          fromStage: 'NONE',
          toStage: initialStage,
          actorId: user.id,
          actorRole: user.role,
          action: 'APPLICATION_CREATED',
          comments: `Created application under template ${template.name}`,
        },
      });

      return app;
    });

    await recordAuditEvent({
      actor: user,
      actionType: 'APPLICATION_CREATE',
      targetType: 'APPLICATION',
      targetId: application.id,
      newState: { applicationNumber: application.applicationNumber, stage: initialStage },
      reason: `New ${body.category} submitted for ${institution.name}`,
    });

    return res.status(201).json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        institution: true,
        workflowTemplate: true,
        workflowVersion: true,
        stageHistories: { orderBy: { createdAt: 'desc' } },
        assignments: {
          include: { assignedTo: { select: { id: true, name: true, role: true, email: true } } },
          orderBy: { assignedAt: 'desc' },
        },
        evcVisits: {
          include: { committeeLead: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
        complianceObligations: { orderBy: { dueDate: 'asc' } },
        documentRecords: { orderBy: { createdAt: 'desc' } },
        alerts: { where: { status: 'UNRESOLVED' }, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found.' });
    }

    if (!enforceInstitutionScope(req, application.institutionId)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You are not authorized to view applications belonging to other institutions.',
      });
    }

    return res.json({
      success: true,
      data: {
        ...application,
        riskFactors: JSON.parse(application.riskFactorsJson || '[]'),
        metadata: JSON.parse(application.metadataJson || '{}'),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/transition', authenticate, async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const body = TransitionSchema.parse(req.body);

    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) {
      return res.status(404).json({ success: false, error: 'Application not found.' });
    }

    if (!enforceInstitutionScope(req, app.institutionId)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Institution scope restriction.' });
    }

    const result = await validateAndExecuteTransition({
      applicationId: id,
      targetStage: body.targetStage,
      action: body.action,
      actor: user,
      comments: body.comments,
      reason: body.reason,
      prerequisites: body.prerequisites,
    });

    return res.json({
      success: true,
      data: result,
      message: `Application advanced to stage ${body.targetStage}`,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/return', authenticate, authorize([ROLES.REGIONAL_OFFICER, ROLES.BUREAU_OFFICER, ROLES.SYSTEM_ADMIN]), async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const body = ReturnSchema.parse(req.body);

    const result = await validateAndExecuteTransition({
      applicationId: id,
      targetStage: 'CLARIFICATION_REQUIRED',
      action: 'RETURN_FOR_CLARIFICATION',
      actor: user,
      reason: body.reason,
      comments: body.deficiencies?.length ? `Deficiencies: ${body.deficiencies.join('; ')}` : body.reason,
    });

    return res.json({
      success: true,
      data: result,
      message: 'Application returned to institution with recorded deficiency observations.',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/assign', authenticate, authorize([ROLES.REGIONAL_OFFICER, ROLES.BUREAU_OFFICER, ROLES.SYSTEM_ADMIN]), async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const body = AssignSchema.parse(req.body);

    const targetUser = await prisma.user.findUnique({ where: { id: body.assignedToId } });
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'Target officer not found.' });
    }

    const now = new Date();
    const dueAt = new Date(now.getTime() + body.dueDays * 24 * 60 * 60 * 1000);

    const assignment = await prisma.caseAssignment.create({
      data: {
        applicationId: id,
        assignedToId: targetUser.id,
        assignedById: user.id,
        role: body.role,
        dueAt,
        notes: body.notes,
      },
      include: {
        assignedTo: { select: { id: true, name: true, role: true, email: true } },
      },
    });

    await recordAuditEvent({
      actor: user,
      actionType: 'CASE_ASSIGNMENT',
      targetType: 'APPLICATION',
      targetId: id,
      newState: { assignedTo: targetUser.name, role: body.role },
      reason: body.notes || `Assigned case review to ${targetUser.name}`,
    });

    return res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    next(error);
  }
});

export default router;
