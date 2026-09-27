import { randomBytes, randomUUID } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Human-friendly investigation id, e.g. ZOD-20260927-K7Q2MX */
export function createInvestigationId(date = new Date()) {
  const bytes = randomBytes(6);
  let suffix = '';
  for (const b of bytes) suffix += ALPHABET[b % ALPHABET.length];
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `ZOD-${ymd}-${suffix}`;
}

export function createRequestId() {
  return randomUUID();
}
