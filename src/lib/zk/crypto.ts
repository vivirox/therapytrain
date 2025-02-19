import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto';

// Constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;

export function generateMessageId(): string {
  return randomBytes(16).toString('hex');
}

export async function encrypt(
  content: string,
  key: string
): Promise<{ content: string; iv: string }> {
  const iv = randomBytes(IV_LENGTH);
  const keyBuffer = Buffer.from(key, 'hex');
  
  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);
  
  let encrypted = cipher.update(content, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  // Combine encrypted content and auth tag
  const finalContent = encrypted + authTag.toString('hex');
  
  return {
    content: finalContent,
    iv: iv.toString('hex')
  };
}

export async function decrypt(
  encryptedContent: string,
  iv: string,
  key: string
): Promise<string> {
  const keyBuffer = Buffer.from(key, 'hex');
  const ivBuffer = Buffer.from(iv, 'hex');
  
  // Split encrypted content and auth tag
  const authTagPos = encryptedContent.length - (AUTH_TAG_LENGTH * 2); // *2 because hex
  const encrypted = encryptedContent.slice(0, authTagPos);
  const authTag = Buffer.from(encryptedContent.slice(authTagPos), 'hex');
  
  const decipher = createDecipheriv(ALGORITHM, keyBuffer, ivBuffer);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export function generateKey(): string {
  return randomBytes(KEY_LENGTH).toString('hex');
}

export function deriveKey(input: string, salt: string): string {
  const hash = createHash('sha256');
  hash.update(input + salt);
  return hash.digest('hex');
}

export function verifyKey(key: string): boolean {
  try {
    const keyBuffer = Buffer.from(key, 'hex');
    return keyBuffer.length === KEY_LENGTH;
  } catch {
    return false;
  }
}

export function generateNonce(): string {
  return randomBytes(12).toString('hex');
}

export function hashContent(content: string): string {
  const hash = createHash('sha256');
  hash.update(content);
  return hash.digest('hex');
} 