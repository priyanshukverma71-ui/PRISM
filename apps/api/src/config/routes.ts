import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, authorize, ROLES } from '../middleware/auth.js';
import { recordAuditEvent } from '../audit/recorder.js';
import { DEFAULT_WORKFLOW_STAGES, DEFAULT_TRANSITIONS } from '../workflow/engine.js';

const router = Router();

const CreateWorkflowVersionSchema = z.object({
  templateId: z.string().uuid(),
  changeSummary: z.string().min(5),
  stages: z.record(z.any()).optional(),
  transitions: z.array(z.any()).optional(),
});

router.get('/workflows', authenticate, async (req: Request, res: Response, next) => {
  try {
    const templates = await prisma.workflowTemplate.findMany({
      include: {
        versions: { orderBy: { versionNumber: 'desc' } },
      },
    });

    const formatted = templates.map((t) => ({
      ...t,
      versions: t.versions.map((v) => ({
        ...v,
        stages: JSON.parse(v.stagesJson),
        transitions: JSON.parse(v.transitionsJson),
      })),
    }));

    return res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
});

router.post('/workflows', authenticate, authorize([ROLES.SYSTEM_ADMIN]), async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const body = CreateWorkflowVersionSchema.parse(req.body);

    const template = await prisma.workflowTemplate.findUnique({
      where: { id: body.templateId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });

    if (!template) {
      return res.status(404).json({ success: false, error: 'Workflow template not found' });
    }

    const nextVer = template.versions[0] ? template.versions[0].versionNumber + 1 : 1;
    const stagesJson = JSON.stringify(body.stages || DEFAULT_WORKFLOW_STAGES);
    const transitionsJson = JSON.stringify(body.transitions || DEFAULT_TRANSITIONS);

    const version = await prisma.workflowVersion.create({
      data: {
        templateId: template.id,
        versionNumber: nextVer,
        changeSummary: body.changeSummary,
        stagesJson,
        transitionsJson,
        isPublished: false,
      },
    });

    await recordAuditEvent({
      actor: user,
      actionType: 'WORKFLOW_VERSION_DRAFTED',
      targetType: 'WORKFLOW_RULE',
      targetId: version.id,
      reason: `Drafted version ${nextVer} for template ${template.code}: ${body.changeSummary}`,
    });

    return res.status(201).json({ success: true, data: version });
  } catch (error) {
    next(error);
  }
});

router.post('/workflows/:id/publish', authenticate, authorize([ROLES.SYSTEM_ADMIN]), async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const version = await prisma.workflowVersion.findUnique({
      where: { id },
      include: { template: true },
    });

    if (!version) {
      return res.status(404).json({ success: false, error: 'Workflow version not found' });
    }

    const [published] = await prisma.$transaction([
      prisma.workflowVersion.update({
        where: { id },
        data: {
          isPublished: true,
          publishedAt: new Date(),
          publishedBy: user.id,
        },
      }),
      prisma.workflowTemplate.update({
        where: { id: version.templateId },
        data: { activeVersion: version.versionNumber },
      }),
    ]);

    await recordAuditEvent({
      actor: user,
      actionType: 'RULE_PUBLISHED',
      targetType: 'WORKFLOW_RULE',
      targetId: version.id,
      reason: `Published version ${version.versionNumber} for template ${version.template.code}`,
      ruleVersion: `V${version.versionNumber}`,
    });

    return res.json({ success: true, data: published, message: 'Workflow version published and active' });
  } catch (error) {
    next(error);
  }
});

export default router;
