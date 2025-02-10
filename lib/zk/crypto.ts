import { randomBytes, createCipheriv, createDecipheriv, scrypt } from 'crypto';
import { promisify } from 'util';
import { ZKConfig, ZKEncryptedPayload, ZKKeyPair } from './types';

const scryptAsync = promisify(scrypt);

export const defaultConfig: ZKConfig = {
  keySize: 32,
  ivSize: 16,
  algorithm: 'aes-256-gcm',
  iterations: 1000,
};

export async function generateKeyPair(): Promise<ZKKeyPair> {
  const privateKey = randomBytes(defaultConfig.keySize).toString('hex');
  const publicKey = await derivePublicKey(privateKey);
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

export async function encrypt(message: string, key: string): Promise<ZKEncryptedPayload> {
  const iv = randomBytes(defaultConfig.ivSize);
  const cipher = createCipheriv(
    defaultConfig.algorithm,
    Buffer.from(key, 'hex'),
    iv
  );

  const encryptedContent = Buffer.concat([
    cipher.update(message, 'utf8'),
    cipher.final(),
  ]);

  return {
    content: encryptedContent.toString('hex'),
    iv: iv.toString('hex'),
  };
}

export async function decrypt(payload: ZKEncryptedPayload, key: string): Promise<string> {
  const decipher = createDecipheriv(
    defaultConfig.algorithm,
    Buffer.from(key, 'hex'),
    Buffer.from(payload.iv, 'hex')
  );

  const decryptedContent = Buffer.concat([
    decipher.update(Buffer.from(payload.content, 'hex')),
    decipher.final(),
  ]);

  return decryptedContent.toString('utf8');
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