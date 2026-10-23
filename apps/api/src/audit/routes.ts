import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { verifyAuditChainIntegrity, generateAuditCsv } from './recorder.js';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { targetType, actionType, page = '1', limit = '25' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * take;

    const where: any = {
      ...(targetType ? { targetType: targetType as string } : {}),
      ...(actionType ? { actionType: actionType as string } : {}),
    };

    const [total, events] = await Promise.all([
      prisma.auditEvent.count({ where }),
      prisma.auditEvent.findMany({
        where,
        orderBy: { sequenceIndex: 'desc' },
        skip,
        take,
      }),
    ]);

    return res.json({
      success: true,
      data: events.map((e) => ({
        ...e,
        previousState: e.previousState ? JSON.parse(e.previousState) : null,
        newState: e.newState ? JSON.parse(e.newState) : null,
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

router.get('/verify', authenticate, async (req: Request, res: Response, next) => {
  try {
    const verification = await verifyAuditChainIntegrity();
    return res.json({
      success: true,
      verification,
      status: verification.valid ? 'CRYPTO_CHAIN_VALID_TAMPER_EVIDENT' : 'INTEGRITY_BREACH_DETECTED',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/export', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { targetId } = req.query;
    const csvData = await generateAuditCsv(targetId as string | undefined);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=prism-flight-recorder-${Date.now()}.csv`);
    return res.send(csvData);
  } catch (error) {
    next(error);
  }
});

export default router;
