import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { evaluateDeadlinesAndGenerateAlerts } from './evaluator.js';
import { recordAuditEvent } from '../audit/recorder.js';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const { status, severity, alertType } = req.query;

    const where: any = {
      ...(status ? { status: status as string } : {}),
      ...(severity ? { severity: severity as string } : {}),
      ...(alertType ? { alertType: alertType as string } : {}),
      ...(user.role === 'INSTITUTION_USER' ? { recipientRole: 'INSTITUTION_USER' } : {}),
    };

    const alerts = await prisma.alert.findMany({
      where,
      include: {
        application: {
          select: {
            id: true,
            applicationNumber: true,
            currentStage: true,
            deadlineDate: true,
            institution: { select: { name: true, code: true } },
          },
        },
        obligation: { select: { id: true, title: true, dueDate: true } },
        deliveryAttempts: true,
        escalations: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    });

    return res.json({ success: true, data: alerts });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/resolve', authenticate, async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { notes } = req.body;

    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedById: user.id,
      },
    });

    await recordAuditEvent({
      actor: user,
      actionType: 'ALERT_RESOLVED',
      targetType: 'ALERT',
      targetId: id,
      reason: notes || 'Alert acknowledged and resolved by operator',
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/history', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    const alert = await prisma.alert.findUnique({
      where: { id },
      include: {
        deliveryAttempts: { orderBy: { attemptedAt: 'desc' } },
        escalations: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    return res.json({ success: true, data: alert });
  } catch (error) {
    next(error);
  }
});

router.post('/evaluate', authenticate, async (req: Request, res: Response, next) => {
  try {
    const result = await evaluateDeadlinesAndGenerateAlerts();
    return res.json({
      success: true,
      message: `Deadline evaluation completed: ${result.alertsGenerated} alerts generated, ${result.escalationsTriggered} escalations processed.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
