import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';

function key() {
  return createHash('sha256')
    .update(process.env.SAFETY_ENCRYPTION_KEY ?? process.env.SESSION_SECRET ?? 'development-only-safety-key')
    .digest();
}

export function encryptProtected(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return [iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptProtected<T>(value: string): T {
  const [ivText, tagText, encryptedText] = value.split('.');
  if (!ivText || !tagText || !encryptedText) throw new Error('Protected content is malformed');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64url')), decipher.final()]).toString('utf8')) as T;
}

export function safetyFingerprint(schoolId: string, description: string, incidentDate: Date) {
  return createHmac('sha256', key())
    .update(`${schoolId}:${incidentDate.toISOString().slice(0, 10)}:${description.trim().toLowerCase()}`)
    .digest('hex');
}
