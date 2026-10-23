import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, enforceInstitutionScope, ROLES } from '../middleware/auth.js';
import { recordAuditEvent } from '../audit/recorder.js';
import { sha256 } from '../lib/hash.js';

const router = Router();

const CreateDocSchema = z.object({
  institutionId: z.string().uuid(),
  applicationId: z.string().uuid().optional(),
  title: z.string().min(3),
  category: z.string(),
  fileName: z.string().min(1),
  fileSize: z.number().min(1),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

router.get('/', authenticate, async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const { category, expiryFilter, search } = req.query;

    const institutionFilter = user.role === ROLES.INSTITUTION_USER && user.institutionId ? { institutionId: user.institutionId } : {};

    const now = new Date();
    let expiryCondition = {};
    if (expiryFilter === 'EXPIRED') {
      expiryCondition = { expiryDate: { lt: now } };
    } else if (expiryFilter === 'EXPIRING_30_DAYS') {
      expiryCondition = {
        expiryDate: {
          gte: now,
          lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      };
    }

    const where: any = {
      ...institutionFilter,
      ...expiryCondition,
      ...(category ? { category: category as string } : {}),
      ...(search ? { title: { contains: search as string } } : {}),
    };

    const documents = await prisma.documentRecord.findMany({
      where,
      include: {
        institution: { select: { id: true, name: true, code: true, region: true } },
        application: { select: { id: true, applicationNumber: true } },
      },
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'desc' }],
    });

    return res.json({
      success: true,
      data: documents.map((d) => ({
        ...d,
        metadata: JSON.parse(d.metadataJson || '{}'),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const body = CreateDocSchema.parse(req.body);

    if (!enforceInstitutionScope(req, body.institutionId)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Cannot create documents for other institutions' });
    }

    const fileHash = sha256(`${body.fileName}:${body.fileSize}:${body.category}:${Date.now()}`);
    const storageKey = `vault/${body.institutionId}/${fileHash.substring(0, 16)}_${body.fileName}`;

    const doc = await prisma.documentRecord.create({
      data: {
        institutionId: body.institutionId,
        applicationId: body.applicationId,
        title: body.title,
        category: body.category,
        issueDate: body.issueDate ? new Date(body.issueDate) : null,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        storageKey,
        fileHash,
        fileName: body.fileName,
        fileSize: body.fileSize,
        verificationStatus: 'PENDING',
        metadataJson: JSON.stringify(body.metadata || {}),
      },
    });

    await recordAuditEvent({
      actor: user,
      actionType: 'DOCUMENT_UPLOAD',
      targetType: 'DOCUMENT',
      targetId: doc.id,
      reason: `Uploaded prescribed document '${body.title}'`,
      documentHash: fileHash,
    });

    return res.status(201).json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
});

export default router;
