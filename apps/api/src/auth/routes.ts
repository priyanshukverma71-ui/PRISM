import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { config } from '../config/index.js';
import { authenticate, ROLES } from '../middleware/auth.js';
import { recordAuditEvent } from '../audit/recorder.js';

const router = Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req: Request, res: Response, next) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { institution: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email address or credentials provided.',
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: `Account is currently ${user.status}. Please contact PRISM administration.`,
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password. Access rejected.',
      });
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      institutionId: user.institutionId,
      region: user.region,
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '8h' });

    res.cookie('prism_token', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    });

    await recordAuditEvent({
      actor: payload,
      actionType: 'USER_LOGIN',
      targetType: 'USER',
      targetId: user.id,
      reason: 'User session successfully authenticated',
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        institutionId: user.institutionId,
        institutionName: user.institution?.name,
        institutionCode: user.institution?.code,
        region: user.region,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', authenticate, async (req: Request, res: Response, next) => {
  try {
    if (req.user) {
      await recordAuditEvent({
        actor: req.user,
        actionType: 'USER_LOGOUT',
        targetType: 'USER',
        targetId: req.user.id,
        reason: 'User logged out and session terminated',
      });
    }

    res.clearCookie('prism_token');
    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, async (req: Request, res: Response, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { institution: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User record not found' });
    }

    const userObj = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      institutionId: user.institutionId,
      institutionName: user.institution?.name,
      institutionCode: user.institution?.code,
      region: user.region,
    };

    return res.json({
      success: true,
      data: userObj,
      user: userObj,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/users', authenticate, async (req: Request, res: Response, next) => {
  try {
    const users = await prisma.user.findMany({
      include: { institution: { select: { id: true, name: true, code: true, region: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return res.json({
      success: true,
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        region: u.region,
        status: u.status,
        institutionName: u.institution?.name,
        institutionCode: u.institution?.code,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// Demo switch role helper: allows quick switching between seeded demo roles for testing/demonstration
router.post('/switch-demo-role', async (req: Request, res: Response, next) => {
  try {
    const { role } = req.body;
    if (!role || !Object.values(ROLES).includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role requested' });
    }

    const demoUser = await prisma.user.findFirst({
      where: { role, status: 'ACTIVE' },
      include: { institution: true },
    });

    if (!demoUser) {
      return res.status(404).json({ success: false, error: `No active demo user found for role ${role}` });
    }

    const payload = {
      id: demoUser.id,
      email: demoUser.email,
      name: demoUser.name,
      role: demoUser.role,
      institutionId: demoUser.institutionId,
      region: demoUser.region,
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '8h' });

    res.cookie('prism_token', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      token,
      user: {
        id: demoUser.id,
        email: demoUser.email,
        name: demoUser.name,
        role: demoUser.role,
        institutionId: demoUser.institutionId,
        institutionName: demoUser.institution?.name,
        institutionCode: demoUser.institution?.code,
        region: demoUser.region,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
