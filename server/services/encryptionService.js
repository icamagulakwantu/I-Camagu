// AES-256-GCM encryption for sensitive fields we must store but never expose
// in plaintext — currently just the ID number. Ciphertext format is
// base64(iv):base64(authTag):base64(encrypted), so it stays a single string
// column. ID_ENCRYPTION_KEY must be a 32-byte key, base64-encoded, set via env
// (generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))").
import crypto from 'crypto';

function getKey() {
  const raw = process.env.ID_ENCRYPTION_KEY;
  if (!raw) throw new Error('ID_ENCRYPTION_KEY is not set — identity verification cannot run without it');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('ID_ENCRYPTION_KEY must decode to exactly 32 bytes');
  return key;
}

export function encryptSensitive(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSensitive(ciphertext) {
  const key = getKey();
  const [ivB64, tagB64, dataB64] = String(ciphertext).split(':');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Malformed ciphertext');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
  return decrypted.toString('utf8');
}
