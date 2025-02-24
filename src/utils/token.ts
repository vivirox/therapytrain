import { randomBytes, createHash } from 'crypto';
import { promisify } from 'util';

const randomBytesAsync = promisify(randomBytes);

/**
 * Generate a secure random token
 */
export async function generateToken(length: number = 32): Promise<string> {
  const bytes = await randomBytesAsync(length);
  return bytes.toString('hex');
}

/**
 * Hash a token for storage
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Verify a token against its hash
 */
export function verifyToken(token: string, hash: string): boolean {
  const computedHash = hashToken(token);
  return computedHash === hash;
}

/**
 * Generate a time-based token that expires
 */
export async function generateExpiringToken(
  data: Record<string, any>,
  expiresIn: number = 30 * 60 * 1000 // 30 minutes
): Promise<string> {
  const token = await generateToken();
  const payload = {
    ...data,
    exp: Date.now() + expiresIn,
    token,
  };
  
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Verify and decode an expiring token
 */
export function verifyExpiringToken<T extends Record<string, any>>(token: string): T | null {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString()) as T & { exp: number };
    
    if (Date.now() > payload.exp) {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
} 