import * as crypto from 'crypto';

// AES-256-GCM authenticated encryption for short text fields
// Stores as base64 string: iv:ciphertext:tag

const getKey = () => {
  const key = process.env.ENCRYPTION_KEY || '';
  if (key.length < 32) {
    // Pad or derive to 32 bytes for simplicity; in prod, ensure a 32-byte random key
    return crypto.createHash('sha256').update(key).digest();
  }
  // If provided as string, hash to 32 bytes
  return crypto.createHash('sha256').update(key).digest();
};

export function encryptField(plain: string | null | undefined): string | null {
  if (plain === null || plain === undefined) return null;
  const value = String(plain);
  if (value.length === 0) return '';
  const iv = crypto.randomBytes(12);
  const key = getKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, Buffer.from(':'), ciphertext, Buffer.from(':'), tag]).toString('base64');
}

export function decryptField(stored: string | null | undefined): string | null {
  if (stored === null || stored === undefined) return null;
  if (stored === '') return '';
  const buf = Buffer.from(stored, 'base64');
  // Split by ':'
  const parts: Buffer[] = [];
  let last = 0;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0x3a) { // ':'
      parts.push(buf.slice(last, i));
      last = i + 1;
    }
  }
  parts.push(buf.slice(last));
  if (parts.length !== 3) return null;
  const iv = parts[0];
  const ciphertext = parts[1];
  const tag = parts[2];
  const key = getKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  return plain;
}

// TypeORM transformer
export const encryptedTransformer = {
  to: (value?: string | null) => encryptField(value ?? null),
  from: (value?: string | null) => decryptField(value ?? null),
};

export function hashEmailBlindIndex(email: string): string {
  const salt = process.env.ENCRYPTION_SALT || 'bukki-salt';
  return crypto.createHash('sha256').update(`${salt}::${email.trim().toLowerCase()}`).digest('hex');
}


