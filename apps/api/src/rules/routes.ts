import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, authorize, ROLES } from '../middleware/auth.js';
import { recordAuditEvent } from '../audit/recorder.js';

const router = Router();

const ExtractRulesSchema = z.object({
  sourceDoc: z.string().default('AICTE Approval Process Handbook 2025-26'),
  sourceVersion: z.string().default('2025.1'),
  sectionText: z.string().min(10),
  sectionRef: z.string().optional(),
});

const ReviewRuleSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  comments: z.string().optional(),
  conditionJson: z.string().optional(),
  actionJson: z.string().optional(),
  timelineDays: z.number().optional(),
});

router.get('/drafts', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { status } = req.query;
    const drafts = await prisma.ruleDraft.findMany({
      where: status ? { status: status as string } : {},
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      data: drafts.map((d) => ({
        ...d,
        condition: JSON.parse(d.conditionJson || '{}'),
        action: JSON.parse(d.actionJson || '{}'),
        prerequisites: JSON.parse(d.prerequisitesJson || '[]'),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/extract', authenticate, authorize([ROLES.SYSTEM_ADMIN, ROLES.BUREAU_OFFICER]), async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const body = ExtractRulesSchema.parse(req.body);

    // Deterministic rule parser & entity extractor for regulatory APH text
    const textLower = body.sectionText.toLowerCase();
    let proposedTitle = 'Regulatory Compliance Condition';
    let timelineDays = 15;
    const prerequisites: string[] = [];

    if (textLower.includes('evc') || textLower.includes('expert visit')) {
      proposedTitle = 'EVC Appointment & Inspection Mandatory Prerequisite';
      timelineDays = 10;
      prerequisites.push('LAND_DOCUMENTS_VERIFIED', 'AFFIDAVIT_UPLOADED');
    } else if (textLower.includes('scrutiny') || textLower.includes('deficiency')) {
      proposedTitle = 'Scrutiny Committee Document Deficiencies Remediation';
      timelineDays = 7;
      prerequisites.push('DEFICIENCY_RESPONSE_ATTACHED');
    } else if (textLower.includes('lease') || textLower.includes('land')) {
      proposedTitle = 'Registered Land Lease 30-Year Encumbrance Verification';
      timelineDays = 30;
      prerequisites.push('REGISTERED_LEASE_DEED', 'SUB_REGISTRAR_NOC');
    }

    const ruleCode = `APH-2025-RULE-${Math.floor(100 + Math.random() * 900)}`;

    const ruleDraft = await prisma.ruleDraft.create({
      data: {
        ruleId: ruleCode,
        sourceDoc: body.sourceDoc,
        sourceVersion: body.sourceVersion,
        sectionRef: body.sectionRef || 'Chapter II, Section 4.3',
        title: proposedTitle,
        extractedText: body.sectionText,
        conditionJson: JSON.stringify({
          trigger: 'APPLICATION_INSPECTION_PREREQUISITE',
          scope: 'TECHNICAL_INSTITUTIONS',
        }),
        actionJson: JSON.stringify({
          action: 'ENFORCE_STAGE_HOLD',
          remedyDays: timelineDays,
        }),
        timelineDays,
        prerequisitesJson: JSON.stringify(prerequisites),
        confidenceScore: 0.94,
        status: 'DRAFT',
      },
    });

    await recordAuditEvent({
      actor: user,
      actionType: 'RULE_EXTRACTED',
      targetType: 'WORKFLOW_RULE',
      targetId: ruleDraft.id,
      reason: `APH rule compiler parsed candidate rule ${ruleCode}`,
    });

    return res.status(201).json({
      success: true,
      data: ruleDraft,
      message: 'Draft rule extracted. Pending official administrative validation before publication.',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/drafts/:id/review', authenticate, authorize([ROLES.SYSTEM_ADMIN, ROLES.BUREAU_OFFICER]), async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const body = ReviewRuleSchema.parse(req.body);

    const draft = await prisma.ruleDraft.findUnique({ where: { id } });
    if (!draft) {
      return res.status(404).json({ success: false, error: 'Rule draft not found' });
    }

    const updated = await prisma.ruleDraft.update({
      where: { id },
      data: {
        status: body.status,
        reviewerId: user.id,
        reviewComments: body.comments,
        ...(body.conditionJson ? { conditionJson: body.conditionJson } : {}),
        ...(body.actionJson ? { actionJson: body.actionJson } : {}),
        ...(body.timelineDays ? { timelineDays: body.timelineDays } : {}),
      },
    });

    await recordAuditEvent({
      actor: user,
      actionType: body.status === 'APPROVED' ? 'RULE_APPROVED' : 'RULE_REJECTED',
      targetType: 'WORKFLOW_RULE',
      targetId: draft.id,
      reason: body.comments || `Rule draft ${draft.ruleId} ${body.status}`,
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
