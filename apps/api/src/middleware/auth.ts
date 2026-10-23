import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import prisma from '../lib/prisma.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  institutionId: string | null;
  region: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const ROLES = {
  INSTITUTION_USER: 'INSTITUTION_USER',
  REGIONAL_OFFICER: 'REGIONAL_OFFICER',
  BUREAU_OFFICER: 'BUREAU_OFFICER',
  COMMITTEE_REVIEWER: 'COMMITTEE_REVIEWER',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
  AUDITOR: 'AUDITOR',
} as const;

export type RoleType = keyof typeof ROLES;

export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.headers.cookie) {
      const match = req.headers.cookie.match(/prism_token=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No session or token found.',
      });
    }

    const decoded = jwt.verify(token, config.jwtSecret) as AuthUser;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session token. Please log in again.',
    });
  }
}

export function authorize(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Role '${req.user.role}' is not authorized to perform this operation.`,
        requiredRoles: allowedRoles,
      });
    }

    next();
  };
}

export function enforceInstitutionScope(req: Request, targetInstitutionId: string): boolean {
  if (!req.user) return false;
  // Non-institution users (Officers, Admins, Auditors) can access all or regional institutions
  if (req.user.role !== ROLES.INSTITUTION_USER) {
    return true;
  }
  // Institution user MUST match target institutionId
  return req.user.institutionId === targetInstitutionId;
}
