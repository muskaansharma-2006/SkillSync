import crypto from 'node:crypto';

function getDerivedKey() {
  const secret = process.env.ENCRYPTION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'skillsync-default-dev-encryption-secret-32b';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * @param {string} text 
 * @returns {string} iv:authTag:encryptedHex
 */
export function encryptApiKey(text) {
  if (!text) return '';
  const key = getDerivedKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * @param {string} encryptedData format: iv:authTag:encryptedHex
 * @returns {string} plaintext
 */
export function decryptApiKey(encryptedData) {
  if (!encryptedData) return '';
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getDerivedKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Returns a masked representation of an API key for safe UI display (e.g. ••••••••••••1234).
 * @param {string} rawKey 
 * @returns {string}
 */
export function maskApiKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') return '';
  const clean = rawKey.trim();
  if (clean.length <= 4) return '••••' + clean;
  const last4 = clean.slice(-4);
  return '••••••••••••' + last4;
}

