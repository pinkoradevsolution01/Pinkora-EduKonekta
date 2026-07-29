import { createHash, timingSafeEqual } from 'node:crypto';

export function hashInvitationCode(code: string): string {
  if (!code) throw new Error('Invitation code is required');
  return createHash('sha256').update(code, 'utf8').digest('hex');
}

export function invitationCodeMatches(code: string, codeHash: string): boolean {
  const actual = Buffer.from(hashInvitationCode(code), 'utf8');
  const expected = Buffer.from(codeHash, 'utf8');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
