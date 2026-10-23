import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, authorize, ROLES } from '../middleware/auth.js';
import { recordAuditEvent } from '../audit/recorder.js';
import { sha256 } from '../lib/hash.js';

const router = Router();

const ScheduleEVCSchema = z.object({
  scheduledDate: z.string().optional(),
  committeeLeadId: z.string().uuid().optional(),
  committeeMembers: z.array(z.string()).optional(),
  reschedulingReason: z.string().optional(),
  findings: z.string().optional(),
  status: z.enum(['PENDING_SCHEDULE', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'RESCHEDULED', 'CANCELLED']).optional(),
  overridePrerequisites: z.boolean().optional(),
});

router.get('/', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { status, region } = req.query;

    const where: any = {
      ...(status ? { status: status as string } : {}),
      ...(region ? { application: { region: region as string } } : {}),
    };

    const evcVisits = await prisma.eVCVisit.findMany({
      where,
      include: {
        application: {
          include: {
            institution: { select: { id: true, name: true, code: true, region: true, type: true } },
          },
        },
        committeeLead: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'desc' }],
    });

    return res.json({
      success: true,
      data: evcVisits.map((v) => ({
        ...v,
        committeeMembers: JSON.parse(v.committeeMembersJson || '[]'),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, authorize([ROLES.REGIONAL_OFFICER, ROLES.BUREAU_OFFICER, ROLES.SYSTEM_ADMIN]), async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const { applicationId, visitType = 'REGULAR', schedulingDeadlineDays = 14 } = req.body;

    const application = await prisma.application.findUnique({ where: { id: applicationId } });
    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    const deadline = new Date(Date.now() + schedulingDeadlineDays * 24 * 60 * 60 * 1000);

    const evc = await prisma.eVCVisit.create({
      data: {
        applicationId,
        visitType,
        status: 'PENDING_SCHEDULE',
        schedulingDeadline: deadline,
        prerequisitesSatisfied: application.currentStage === 'UNDER_SCRUTINY' || application.currentStage === 'EVC_PENDING',
      },
    });

    await recordAuditEvent({
      actor: user,
      actionType: 'EVC_CREATED',
      targetType: 'EVC',
      targetId: evc.id,
      reason: `EVC entry queued for ${application.applicationNumber}`,
    });

    return res.status(201).json({ success: true, data: evc });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', authenticate, authorize([ROLES.REGIONAL_OFFICER, ROLES.BUREAU_OFFICER, ROLES.COMMITTEE_REVIEWER, ROLES.SYSTEM_ADMIN]), async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const body = ScheduleEVCSchema.parse(req.body);

    const evc = await prisma.eVCVisit.findUnique({
      where: { id },
      include: { application: true },
    });

    if (!evc) {
      return res.status(404).json({ success: false, error: 'EVC visit record not found' });
    }

    // Enforce prerequisite check when moving to SCHEDULED
    if (body.status === 'SCHEDULED' && !evc.prerequisitesSatisfied && !body.overridePrerequisites) {
      return res.status(400).json({
        success: false,
        error: 'EVC Scheduling Rejected: Mandatory scrutiny clearance prerequisites are not satisfied.',
        remedy: 'Resolve all outstanding scrutiny deficiencies or apply authorized administrative override.',
      });
    }

    const updateData: any = {};
    if (body.scheduledDate) updateData.scheduledDate = new Date(body.scheduledDate);
    if (body.committeeLeadId) updateData.committeeLeadId = body.committeeLeadId;
    if (body.committeeMembers) updateData.committeeMembersJson = JSON.stringify(body.committeeMembers);
    if (body.status) updateData.status = body.status;
    if (body.reschedulingReason) updateData.reschedulingReason = body.reschedulingReason;
    if (body.findings) {
      updateData.findings = body.findings;
      updateData.completedDate = new Date();
      updateData.reportHash = sha256(body.findings + ':' + id);
      updateData.reportReference = `EVC-REP-${id.substring(0, 8).toUpperCase()}`;
    }
    if (body.overridePrerequisites) {
      updateData.prerequisitesSatisfied = true;
    }

    const updatedEvc = await prisma.eVCVisit.update({
      where: { id },
      data: updateData,
    });

    // If EVC is scheduled, synchronize application stage
    if (body.status === 'SCHEDULED' && evc.application.currentStage === 'EVC_PENDING') {
      await prisma.application.update({
        where: { id: evc.applicationId },
        data: { currentStage: 'EVC_SCHEDULED' },
      });
    } else if (body.status === 'COMPLETED' && evc.application.currentStage === 'EVC_SCHEDULED') {
      await prisma.application.update({
        where: { id: evc.applicationId },
        data: { currentStage: 'EVC_COMPLETED' },
      });
    }

    await recordAuditEvent({
      actor: user,
      actionType: 'EVC_UPDATED',
      targetType: 'EVC',
      targetId: evc.id,
      previousState: { status: evc.status, scheduledDate: evc.scheduledDate },
      newState: { status: updatedEvc.status, scheduledDate: updatedEvc.scheduledDate },
      reason: body.reschedulingReason || (body.findings ? 'EVC Findings Submitted' : 'EVC Schedule Modified'),
      documentHash: updatedEvc.reportHash || undefined,
    });

    return res.json({ success: true, data: updatedEvc });
  } catch (error) {
    next(error);
  }
});

export default router;
