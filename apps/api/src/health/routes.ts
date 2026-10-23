import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const userCount = await prisma.user.count();
    return res.json({
      status: 'healthy',
      system: 'PRISM Regulatory Intelligence & Status Monitoring',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: 'connected',
      activeUsers: userCount,
      uptimeSeconds: Math.floor(process.uptime()),
    });
  } catch (error: any) {
    return res.status(503).json({
      status: 'unhealthy',
      error: error.message || 'Database unreachable',
    });
  }
});

export default router;
