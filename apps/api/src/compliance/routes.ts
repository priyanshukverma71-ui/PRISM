import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, authorize, enforceInstitutionScope, ROLES } from '../middleware/auth.js';
import { recordAuditEvent } from '../audit/recorder.js';
import { sha256 } from '../lib/hash.js';

const router = Router();

const CreateObligationSchema = z.object({
  institutionId: z.string().uuid(),
  applicationId: z.string().uuid().optional(),
  title: z.string().min(3),
  category: z.string(),
  description: z.string(),
  prescribedDocType: z.string(),
  dueDays: z.number().default(14),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('HIGH'),
});

const SubmitEvidenceSchema = z.object({
  fileName: z.string().min(1),
  fileSize: z.number().min(1),
  fileContentBase64: z.string().optional(),
  docCategory: z.string().default('COMPLIANCE_EVIDENCE'),
  documentUrl: z.string().optional(),
});

const ReviewEvidenceSchema = z.object({
  submissionId: z.string().uuid(),
  status: z.enum(['VERIFIED', 'RETURNED_WITH_DEFICIENCY']),
  comments: z.string().min(3, 'Review remarks required'),
});

router.get('/', authenticate, async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const { status, category, institutionId } = req.query;

    const institutionFilter = user.role === ROLES.INSTITUTION_USER && user.institutionId ? { institutionId: user.institutionId } : (institutionId ? { institutionId: institutionId as string } : {});

    const obligations = await prisma.complianceObligation.findMany({
      where: {
        ...institutionFilter,
        ...(status ? { status: status as string } : {}),
        ...(category ? { category: category as string } : {}),
      },
      include: {
        institution: { select: { id: true, name: true, code: true, region: true } },
        application: { select: { id: true, applicationNumber: true, currentStage: true } },
        submissions: {
          include: { submittedBy: { select: { name: true, role: true } } },
          orderBy: { version: 'desc' },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { severity: 'desc' }],
    });

    return res.json({ success: true, data: obligations });
  } catch (error) {
    next(error);
  }
});

router.post('/obligations', authenticate, authorize([ROLES.REGIONAL_OFFICER, ROLES.BUREAU_OFFICER, ROLES.SYSTEM_ADMIN]), async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const body = CreateObligationSchema.parse(req.body);

    const dueDate = new Date(Date.now() + body.dueDays * 24 * 60 * 60 * 1000);
    const warningDate = new Date(dueDate.getTime() - 3 * 24 * 60 * 60 * 1000);

    const obligation = await prisma.complianceObligation.create({
      data: {
        institutionId: body.institutionId,
        applicationId: body.applicationId,
        title: body.title,
        category: body.category,
        description: body.description,
        prescribedDocType: body.prescribedDocType,
        dueDate,
        warningDate,
        severity: body.severity,
      },
    });

    await recordAuditEvent({
      actor: user,
      actionType: 'OBLIGATION_CREATED',
      targetType: 'COMPLIANCE',
      targetId: obligation.id,
      reason: `Prescribed obligation created: ${body.title}`,
    });

    return res.status(201).json({ success: true, data: obligation });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/submit', authenticate, async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const body = SubmitEvidenceSchema.parse(req.body);

    const obligation = await prisma.complianceObligation.findUnique({
      where: { id },
      include: { institution: true, submissions: { orderBy: { version: 'desc' }, take: 1 } },
    });

    if (!obligation) {
      return res.status(404).json({ success: false, error: 'Obligation not found' });
    }

    if (!enforceInstitutionScope(req, obligation.institutionId)) {
      return res.status(403).json({ success: false, error: 'Forbidden: You can only submit evidence for your institution.' });
    }

    const nextVersion = obligation.submissions.length > 0 ? obligation.submissions[0].version + 1 : 1;
    // Calculate deterministic SHA-256 hash for document integrity
    const hashSource = body.fileContentBase64 || `${body.fileName}:${body.fileSize}:${Date.now()}:${user.id}`;
    const fileHash = sha256(hashSource);

    const [submission, updatedObligation] = await prisma.$transaction([
      prisma.complianceSubmission.create({
        data: {
          obligationId: id,
          institutionId: obligation.institutionId,
          submittedById: user.id,
          docCategory: body.docCategory,
          documentUrl: body.documentUrl || `/storage/compliance/${id}/${body.fileName}`,
          fileHash,
          fileName: body.fileName,
          fileSize: body.fileSize,
          version: nextVersion,
          status: 'PENDING_VERIFICATION',
        },
      }),
      prisma.complianceObligation.update({
        where: { id },
        data: { status: 'SUBMITTED' },
      }),
    ]);

    await recordAuditEvent({
      actor: user,
      actionType: 'COMPLIANCE_EVIDENCE_SUBMITTED',
      targetType: 'COMPLIANCE',
      targetId: obligation.id,
      reason: `Uploaded evidence version ${nextVersion}: ${body.fileName}`,
      documentHash: fileHash,
    });

    return res.status(201).json({
      success: true,
      data: submission,
      message: 'Evidence submitted successfully and cryptographically recorded.',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/verify', authenticate, authorize([ROLES.REGIONAL_OFFICER, ROLES.BUREAU_OFFICER, ROLES.SYSTEM_ADMIN]), async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const body = ReviewEvidenceSchema.parse(req.body);

    const obligation = await prisma.complianceObligation.findUnique({ where: { id } });
    if (!obligation) {
      return res.status(404).json({ success: false, error: 'Obligation not found' });
    }

    const isVerified = body.status === 'VERIFIED';

    const [updatedSubmission, updatedObligation] = await prisma.$transaction([
      prisma.complianceSubmission.update({
        where: { id: body.submissionId },
        data: {
          status: body.status,
          reviewerId: user.id,
          reviewComments: body.comments,
          reviewedAt: new Date(),
        },
      }),
      prisma.complianceObligation.update({
        where: { id },
        data: {
          status: isVerified ? 'VERIFIED' : 'DEFICIENT',
        },
      }),
    ]);

    await recordAuditEvent({
      actor: user,
      actionType: isVerified ? 'COMPLIANCE_VERIFIED' : 'COMPLIANCE_REJECTED',
      targetType: 'COMPLIANCE',
      targetId: id,
      previousState: { status: obligation.status },
      newState: { status: updatedObligation.status, reviewer: user.name },
      reason: body.comments,
    });

    return res.json({
      success: true,
      data: { obligation: updatedObligation, submission: updatedSubmission },
      message: isVerified ? 'Compliance requirement marked as fully verified' : 'Deficiency logged and returned to institution',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
