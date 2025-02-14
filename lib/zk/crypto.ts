import { randomBytes, createCipheriv, createDecipheriv, scrypt } from 'crypto';
import { promisify } from 'util';
import { ZKConfig, ZKEncryptedPayload, ZKKeyPair } from './types';

const scryptAsync = promisify<string, Buffer, number, Buffer>(scrypt);

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

export const defaultConfig: ZKConfig = {
  keySize: 32,
  ivSize: 16,
  algorithm: 'aes-256-gcm',
  iterations: 1000,
};

export async function generateKeyPair(): Promise<ZKKeyPair> {
  const privateKey = randomBytes(KEY_LENGTH).toString('hex');
  const publicKey = randomBytes(KEY_LENGTH).toString('hex');
  return { privateKey, publicKey };
}

export async function derivePublicKey(privateKey: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await scryptAsync(privateKey, salt, defaultConfig.keySize);
  return derivedKey.toString('hex');
}

export async function generateSharedKey(privateKey: string, recipientPublicKey: string): Promise<string> {
  const salt = Buffer.from(recipientPublicKey, 'hex');
  const derivedKey = await scryptAsync(privateKey, salt, defaultConfig.keySize);
  return derivedKey.toString('hex');
}

export async function encrypt(content: string, key: string) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(content, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    content: encrypted,
    iv: iv.toString('hex')
  };
}

export async function decrypt(encryptedContent: string, iv: string, key: string): Promise<string> {
  const decipher = createDecipheriv(
    ALGORITHM,
    Buffer.from(key, 'hex'),
    Buffer.from(iv, 'hex')
  );
  
  let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export function generateMessageId(): string {
  return randomBytes(16).toString('hex');
}

export async function verifyKeyPair(keyPair: ZKKeyPair): Promise<boolean> {
  try {
    const derivedPublic = await derivePublicKey(keyPair.privateKey);
    return derivedPublic === keyPair.publicKey;
  } catch {
    return false;
  }
}

export function generateKey(): string {
  return randomBytes(KEY_LENGTH).toString('hex');
} 