import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { calculateAuditHash, escapeFormulaInjection } from '../lib/hash.js';
import { AuthUser } from '../middleware/auth.js';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export interface AuditParams {
  actor?: AuthUser | { id: string; name: string; role: string };
  actionType: string;
  targetType: string;
  targetId: string;
  previousState?: any;
  newState?: any;
  reason?: string;
  documentHash?: string;
  ruleVersion?: string;
  correlationId?: string;
}

export async function recordAuditEvent(params: AuditParams) {
  const actorId = params.actor?.id || 'SYSTEM';
  const actorName = params.actor?.name || 'PRISM Automated Kernel';
  const actorRole = params.actor?.role || 'SYSTEM_KERNEL';
  const correlationId = params.correlationId || crypto.randomUUID();

  // Find latest sequence and hash
  const latestEvent = await prisma.auditEvent.findFirst({
    orderBy: { sequenceIndex: 'desc' },
  });

  const sequenceIndex = latestEvent ? latestEvent.sequenceIndex + 1 : 1;
  const previousHash = latestEvent ? latestEvent.currentHash : GENESIS_HASH;
  const now = new Date();

  const prevJson = params.previousState ? JSON.stringify(params.previousState) : null;
  const newJson = params.newState ? JSON.stringify(params.newState) : null;

  const currentHash = calculateAuditHash(
    previousHash,
    sequenceIndex,
    now,
    actorId,
    params.actionType,
    params.targetId,
    newJson || ''
  );

  return prisma.auditEvent.create({
    data: {
      sequenceIndex,
      correlationId,
      actorId,
      actorName,
      actorRole,
      actionType: params.actionType,
      targetType: params.targetType,
      targetId: params.targetId,
      previousState: prevJson,
      newState: newJson,
      reason: params.reason,
      documentHash: params.documentHash,
      ruleVersion: params.ruleVersion || 'APH-2025-V1',
      currentHash,
      previousHash,
      createdAt: now,
    },
  });
}

export async function verifyAuditChainIntegrity(): Promise<{
  valid: boolean;
  totalEvents: number;
  brokenIndex?: number;
}> {
  const events = await prisma.auditEvent.findMany({
    orderBy: { sequenceIndex: 'asc' },
  });

  let previousHash = GENESIS_HASH;

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.previousHash !== previousHash) {
      return { valid: false, totalEvents: events.length, brokenIndex: e.sequenceIndex };
    }

    const expectedHash = calculateAuditHash(
      previousHash,
      e.sequenceIndex,
      e.createdAt,
      e.actorId,
      e.actionType,
      e.targetId,
      e.newState || ''
    );

    if (e.currentHash !== expectedHash) {
      return { valid: false, totalEvents: events.length, brokenIndex: e.sequenceIndex };
    }

    previousHash = e.currentHash;
  }

  return { valid: true, totalEvents: events.length };
}

export async function generateAuditCsv(targetId?: string): Promise<string> {
  const events = await prisma.auditEvent.findMany({
    where: targetId ? { targetId } : {},
    orderBy: { sequenceIndex: 'asc' },
  });

  const headers = [
    'Sequence',
    'Timestamp',
    'Correlation ID',
    'Actor Name',
    'Actor Role',
    'Action Type',
    'Target Type',
    'Target ID',
    'Reason',
    'Document Hash',
    'Current Hash',
    'Previous Hash',
  ];

  const rows = events.map((e) => [
    e.sequenceIndex,
    e.createdAt.toISOString(),
    escapeFormulaInjection(e.correlationId),
    escapeFormulaInjection(e.actorName),
    escapeFormulaInjection(e.actorRole),
    escapeFormulaInjection(e.actionType),
    escapeFormulaInjection(e.targetType),
    escapeFormulaInjection(e.targetId),
    escapeFormulaInjection(e.reason || ''),
    escapeFormulaInjection(e.documentHash || ''),
    e.currentHash,
    e.previousHash,
  ]);

  return [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
}
