import crypto from 'crypto';

export function sha256(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function generateStableKey(...parts: (string | number | undefined | null)[]): string {
  return parts.filter(Boolean).join(':');
}

export function calculateAuditHash(
  previousHash: string,
  sequenceIndex: number,
  timestamp: string | Date,
  actorId: string,
  actionType: string,
  targetId: string,
  payload: any
): string {
  const timeStr = typeof timestamp === 'string' ? timestamp : timestamp.toISOString();
  const canonicalPayload = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
  const data = `${previousHash}|${sequenceIndex}|${timeStr}|${actorId}|${actionType}|${targetId}|${canonicalPayload}`;
  return sha256(data);
}

export function escapeFormulaInjection(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=+@-]$/.test(str[0])) {
    return `'${str}`;
  }
  return str;
}
