import { kv } from '@vercel/kv';
import { cache } from 'react';

const KEY_PREFIX = 'encryption:keys:';
const KEY_SIZE = 256;
const ITERATION_COUNT = 100000;

interface KeyPair {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
  createdAt: string;
  version: number;
}

interface EncryptedKey {
  encryptedKey: string;
  iv: string;
  salt: string;
}

// Generate a new key pair for a user
export async function generateKeyPair(userId: string): Promise<KeyPair> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveKey', 'deriveBits']
  );

  const publicKey = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKey = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);

  const keyPairData: KeyPair = {
    publicKey,
    privateKey,
    createdAt: new Date().toISOString(),
    version: 1,
  };

  await storeKeyPair(userId, keyPairData);
  return keyPairData;
}

// Store encrypted key pair in KV store
async function storeKeyPair(userId: string, keyPair: KeyPair): Promise<void> {
  const key = `${KEY_PREFIX}${userId}`;
  await kv.set(key, keyPair);
}

// Get user's key pair from KV store
export const getUserKeyPair = cache(async (userId: string): Promise<KeyPair | null> => {
  const key = `${KEY_PREFIX}${userId}`;
  return await kv.get<KeyPair>(key);
});

// Derive a shared secret for message encryption
export async function deriveSharedSecret(privateKey: JsonWebKey, publicKey: JsonWebKey): Promise<CryptoKey> {
  const importedPrivateKey = await window.crypto.subtle.importKey(
    'jwk',
    privateKey,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    false,
    ['deriveKey', 'deriveBits']
  );

  const importedPublicKey = await window.crypto.subtle.importKey(
    'jwk',
    publicKey,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    false,
    []
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: importedPublicKey,
    },
    importedPrivateKey,
    {
      name: 'AES-GCM',
      length: KEY_SIZE,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt a message using a shared secret
export async function encryptMessage(message: string, sharedKey: CryptoKey): Promise<{ encryptedData: string; iv: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    sharedKey,
    data
  );

  return {
    encryptedData: Buffer.from(encryptedData).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
  };
}

// Decrypt a message using a shared secret
export async function decryptMessage(
  encryptedData: string,
  iv: string,
  sharedKey: CryptoKey
): Promise<string> {
  const decoder = new TextDecoder();
  const data = Buffer.from(encryptedData, 'base64');
  const ivArray = Buffer.from(iv, 'base64');

  const decryptedData = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivArray,
    },
    sharedKey,
    data
  );

  return decoder.decode(decryptedData);
}

// Rotate user's key pair
export async function rotateKeyPair(userId: string): Promise<KeyPair> {
  const currentKeyPair = await getUserKeyPair(userId);
  const newKeyPair = await generateKeyPair(userId);

  if (currentKeyPair) {
    newKeyPair.version = currentKeyPair.version + 1;
  }

  await storeKeyPair(userId, newKeyPair);
  return newKeyPair;
}

// Encrypt a key for storage
export async function encryptKey(key: CryptoKey, password: string): Promise<EncryptedKey> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATION_COUNT,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: KEY_SIZE },
    false,
    ['encrypt']
  );

  const exportedKey = await window.crypto.subtle.exportKey('raw', key);
  const encryptedKey = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    aesKey,
    exportedKey
  );

  return {
    encryptedKey: Buffer.from(encryptedKey).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
    salt: Buffer.from(salt).toString('base64'),
  };
}

// Decrypt a stored key
export async function decryptKey(
  encryptedKey: EncryptedKey,
  password: string
): Promise<CryptoKey> {
  const salt = Buffer.from(encryptedKey.salt, 'base64');
  const iv = Buffer.from(encryptedKey.iv, 'base64');
  const encryptedData = Buffer.from(encryptedKey.encryptedKey, 'base64');

  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATION_COUNT,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: KEY_SIZE },
    false,
    ['decrypt']
  );

  const decryptedKey = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    aesKey,
    encryptedData
  );

  return await window.crypto.subtle.importKey(
    'raw',
    decryptedKey,
    { name: 'AES-GCM', length: KEY_SIZE },
    true,
    ['encrypt', 'decrypt']
  );
} 