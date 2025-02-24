// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

// Mock ZK validation
vi.mock('../validation', () => ({
  initializeCircuit: vi.fn().mockResolvedValue(undefined),
  generateProof: vi.fn().mockResolvedValue({
    proof: new Uint8Array([1, 2, 3, 4]),
    publicInputs: [new Uint8Array([5, 6, 7, 8])]
  }),
  verifyProof: vi.fn().mockResolvedValue(true),
  validateCircuitConstraints: vi.fn().mockResolvedValue({ isValid: true })
}));

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          gt: () => ({
            single: () => Promise.resolve({ 
              data: {
                id: 'test-session-id',
                publicKey: Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex').toString('base64'),
                privateKey: Buffer.from('fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210', 'hex').toString('base64'),
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
              },
              error: null
            })
          })
        }),
        single: () => Promise.resolve({
          data: {
            id: 'test-session-id',
            publicKey: Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex').toString('base64'),
            privateKey: Buffer.from('fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210', 'hex').toString('base64'),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          },
          error: null
        })
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({
            data: {
              id: 'test-key-id',
              publicKey: Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex').toString('base64'),
              privateKey: Buffer.from('fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210', 'hex').toString('base64'),
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            },
            error: null
          })
        })
      }),
      update: () => ({
        eq: () => Promise.resolve({
          data: {
            id: 'test-session-id',
            publicKey: Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex').toString('base64'),
            privateKey: Buffer.from('fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210', 'hex').toString('base64'),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          },
          error: null
        })
      })
    })
  })
}));

// Mock SecurityAuditService
const mockSecurityAuditService = {
  logEvent: vi.fn(),
  logMessageEncryption: vi.fn(),
  logMessageDecryption: vi.fn(),
  logError: vi.fn(),
  logOperation: vi.fn(),
  getUserOperations: vi.fn().mockResolvedValue([]),
  getSessionOperations: vi.fn().mockResolvedValue([]),
  getThreadOperations: vi.fn().mockResolvedValue([]),
  getOperationsByType: vi.fn().mockResolvedValue([]),
  getOperationsByDateRange: vi.fn().mockResolvedValue([]),
  getOperationsByUser: vi.fn().mockResolvedValue([]),
  getOperationsInTimeRange: vi.fn().mockResolvedValue([]),
  getFailedOperations: vi.fn().mockResolvedValue([]),
  clearAuditLog: vi.fn().mockResolvedValue(undefined),
  auditLog: [],
  severity: 'info'
};

vi.mock('../../audit/SecurityAuditService', () => ({
  SecurityAuditService: vi.fn().mockImplementation(() => mockSecurityAuditService)
}));

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ZKService } from '../ZKService';
import { ForwardSecrecyService } from '../ForwardSecrecyService';
import { generateKey, generateNonce } from '../crypto';
import { SecurityAuditService } from '@/services/SecurityAuditService';
import { initializeCircuit } from '../validation';
import { createHash } from 'crypto';
import { randomBytes } from 'crypto';

// Mock window.crypto
const mockCrypto: Crypto = {
  subtle: {
    generateKey: vi.fn().mockImplementation(async (algorithm, extractable, keyUsages) => {
      const privateKey = Buffer.from(randomBytes(32));
      const publicKey = createHash('sha256').update(privateKey).digest();
      
      if (algorithm.name === 'ECDH') {
        return {
          privateKey: {
            type: 'private',
            algorithm: { name: 'ECDH', namedCurve: 'P-256' },
            extractable: true,
            usages: ['deriveKey', 'deriveBits'],
            key: privateKey
          },
          publicKey: {
            type: 'public',
            algorithm: { name: 'ECDH', namedCurve: 'P-256' },
            extractable: true,
            usages: [],
            key: publicKey
          }
        };
      } else {
        return {
          type: 'secret',
          algorithm: algorithm,
          extractable: true,
          usages: keyUsages,
          key: privateKey
        };
      }
    }),
    exportKey: vi.fn().mockImplementation(async (format, key) => {
      return key.key;
    }),
    importKey: vi.fn().mockImplementation(async (format, keyData, algorithm, extractable, keyUsages) => {
      if (algorithm.name === 'ECDH') {
        return {
          type: keyUsages.includes('deriveBits') ? 'private' : 'public',
          algorithm: { name: 'ECDH', namedCurve: 'P-256' },
          extractable: true,
          usages: keyUsages,
          key: keyData
        };
      } else if (algorithm.name === 'HKDF') {
        return {
          type: 'secret',
          algorithm: { name: 'HKDF', hash: 'SHA-256' },
          extractable: false,
          usages: ['deriveBits'],
          key: keyData
        };
      } else if (algorithm.name === 'AES-GCM') {
        return {
          type: 'secret',
          algorithm: { name: 'AES-GCM', length: 256 },
          extractable: false,
          usages: keyUsages,
          key: keyData
        };
      }
      throw new Error(`Unsupported algorithm: ${algorithm.name}`);
    }),
    deriveKey: vi.fn().mockImplementation(async (algorithm, baseKey, derivedKeyAlgorithm, extractable, keyUsages) => {
      const bits = await mockCrypto.subtle.deriveBits(algorithm, baseKey, 256);
      return {
        type: 'secret',
        algorithm: derivedKeyAlgorithm,
        extractable,
        usages: keyUsages,
        key: bits
      };
    }),
    deriveBits: vi.fn().mockImplementation(async (algorithm, baseKey, length) => {
      if (algorithm.name === 'ECDH') {
        // Simulate DH key agreement
        const privateKey = baseKey.key;
        const publicKey = algorithm.public.key;
        
        // In real DH, this would be an actual DH computation
        // For testing, we'll use HKDF with both keys as input
        const hash = createHash('sha256');
        hash.update(privateKey);
        hash.update(publicKey);
        return hash.digest();
      } else if (algorithm.name === 'HKDF') {
        // Simulate HKDF
        const hash = createHash('sha256');
        hash.update(baseKey.key);
        if (algorithm.salt) hash.update(algorithm.salt);
        if (algorithm.info) hash.update(algorithm.info);
        const output = hash.digest();
        return output.slice(0, length / 8);
      }
      throw new Error(`Unsupported algorithm: ${algorithm.name}`);
    }),
    encrypt: vi.fn().mockImplementation(async (algorithm, key, data) => {
      if (algorithm.name !== 'AES-GCM') {
        throw new Error(`Unsupported algorithm: ${algorithm.name}`);
      }

      const message = Buffer.from(data);
      const keyBuffer = key.key;
      const iv = algorithm.iv;
      
      // Use HKDF to derive encryption key and MAC key
      const hash1 = createHash('sha256');
      hash1.update(keyBuffer);
      hash1.update(iv);
      hash1.update(Buffer.from('encryption'));
      const encryptionKey = hash1.digest();
      
      const hash2 = createHash('sha256');
      hash2.update(keyBuffer);
      hash2.update(iv);
      hash2.update(Buffer.from('mac'));
      const macKey = hash2.digest();
      
      // Encrypt message
      const ciphertext = Buffer.alloc(message.length);
      for (let i = 0; i < message.length; i++) {
        ciphertext[i] = message[i] ^ encryptionKey[i % encryptionKey.length];
      }
      
      // Calculate MAC
      const mac = createHash('sha256');
      mac.update(macKey);
      mac.update(ciphertext);
      mac.update(iv);
      const tag = mac.digest();
      
      // Combine ciphertext and MAC
      return Buffer.concat([ciphertext, tag]);
    }),
    decrypt: vi.fn().mockImplementation(async (algorithm, key, data) => {
      if (algorithm.name !== 'AES-GCM') {
        throw new Error(`Unsupported algorithm: ${algorithm.name}`);
      }

      const keyBuffer = key.key;
      const iv = algorithm.iv;
      
      // Use HKDF to derive encryption key and MAC key
      const hash1 = createHash('sha256');
      hash1.update(keyBuffer);
      hash1.update(iv);
      hash1.update(Buffer.from('encryption'));
      const encryptionKey = hash1.digest();
      
      const hash2 = createHash('sha256');
      hash2.update(keyBuffer);
      hash2.update(iv);
      hash2.update(Buffer.from('mac'));
      const macKey = hash2.digest();
      
      // Split ciphertext and MAC
      const ciphertext = data.slice(0, data.length - 32);
      const receivedTag = data.slice(data.length - 32);
      
      // Verify MAC
      const mac = createHash('sha256');
      mac.update(macKey);
      mac.update(ciphertext);
      mac.update(iv);
      const calculatedTag = mac.digest();
      
      if (!calculatedTag.equals(receivedTag)) {
        throw new Error('Message authentication failed');
      }
      
      // Decrypt message
      const plaintext = Buffer.alloc(ciphertext.length);
      for (let i = 0; i < ciphertext.length; i++) {
        plaintext[i] = ciphertext[i] ^ encryptionKey[i % encryptionKey.length];
      }
      
      return plaintext;
    }),
    digest: vi.fn().mockImplementation(async (algorithm, data) => {
      const hash = createHash('sha256');
      hash.update(Buffer.from(data));
      return hash.digest();
    }),
    sign: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
    verify: vi.fn().mockResolvedValue(true),
    wrapKey: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
    unwrapKey: vi.fn().mockResolvedValue({
      type: 'secret',
      algorithm: { name: 'AES-GCM', length: 256 },
      extractable: true,
      usages: ['encrypt', 'decrypt'],
      key: Buffer.from(randomBytes(32))
    })
  } as SubtleCrypto,
  getRandomValues: vi.fn().mockImplementation((array) => {
    // Generate different random values each time
    const randomBytes = Buffer.from(createHash('sha256')
      .update(Buffer.from(String(Date.now() + Math.random())))
      .digest());
    
    for (let i = 0; i < array.length; i++) {
      array[i] = randomBytes[i % randomBytes.length];
    }
    return array;
  }),
  randomUUID: vi.fn().mockReturnValue('test-uuid')
};

// @ts-ignore
global.window = {
  crypto: mockCrypto
};

describe('Forward Secrecy', () => {
  let zkService: ZKService;
  let forwardSecrecy: ForwardSecrecyService;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Reset singleton instance
    // @ts-ignore - Access private static instance for testing
    ForwardSecrecyService.instance = undefined;
    
    // Initialize services
    // @ts-ignore - Mock security audit service for testing
    zkService = new ZKService(undefined, mockSecurityAuditService);
    // @ts-ignore - Mock security audit service for testing
    forwardSecrecy = ForwardSecrecyService.getInstance(undefined, mockSecurityAuditService);
    // @ts-ignore - Ensure security audit service is properly set
    forwardSecrecy.securityAudit = mockSecurityAuditService;

    // Initialize ZK circuit
    await initializeCircuit('test-circuit-path');
  });

  describe('Message Encryption and Decryption', () => {
    it('should encrypt and decrypt a message successfully', async () => {
      const sessionKeys = await zkService.getOrCreateSessionKeys('test-thread-id');
      const sessionPublicKey = Buffer.from(sessionKeys.publicKey, 'base64').toString('hex');
      const sessionPrivateKey = Buffer.from(sessionKeys.privateKey, 'base64').toString('hex');
      
      const message = 'Hello, World!';
      const metadata = {
        senderId: 'sender123',
        recipientId: 'recipient456',
        threadId: 'test-thread-id'
      };

      const encrypted = await zkService.encryptMessageWithSessionKey(
        message,
        sessionPublicKey,
        metadata
      );

      expect(encrypted).toBeDefined();
      expect(encrypted.encryptedContent).toBeDefined();
      expect(encrypted.iv).toBeDefined();

      // Decrypt message
      const decrypted = await zkService.decryptMessageWithSessionKey(
        encrypted.encryptedContent,
        encrypted.iv,
        sessionPrivateKey,
        {
          threadId: metadata.threadId,
          messageNumber: 0,
          previousChainLength: 0
        }
      );

      expect(decrypted).toBe(message);
    });

    it('should generate different keys for each message', async () => {
      const threadId = 'test-thread';
      const senderId = 'sender';
      const recipientId = 'recipient';
      const message = 'Test message';

      const sessionKeys = await zkService.getOrCreateSessionKeys(threadId);

      const encrypted1 = await zkService.encryptMessageWithSessionKey(
        message,
        sessionKeys.publicKey,
        {
          senderId,
          recipientId,
          threadId
        }
      );

      const encrypted2 = await zkService.encryptMessageWithSessionKey(
        message,
        sessionKeys.publicKey,
        {
          senderId,
          recipientId,
          threadId
        }
      );

      expect(encrypted1.encryptedContent).not.toBe(encrypted2.encryptedContent);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should handle out-of-order messages', async () => {
      const threadId = 'test-thread';
      const senderId = 'sender';
      const recipientId = 'recipient';
      const messages = ['First', 'Second', 'Third'];
      const sessionKeys = await zkService.getOrCreateSessionKeys(threadId);

      // Encrypt messages
      const encrypted = await Promise.all(
        messages.map((msg, i) => 
          zkService.encryptMessageWithSessionKey(
            msg,
            sessionKeys.publicKey,
            {
              senderId,
              recipientId,
              threadId
            }
          )
        )
      );

      // Decrypt in reverse order
      const decrypted = await Promise.all([
        zkService.decryptMessageWithSessionKey(
          encrypted[2].encryptedContent,
          encrypted[2].iv,
          sessionKeys.privateKey,
          {
            threadId,
            messageNumber: 2,
            previousChainLength: 0
          }
        ),
        zkService.decryptMessageWithSessionKey(
          encrypted[1].encryptedContent,
          encrypted[1].iv,
          sessionKeys.privateKey,
          {
            threadId,
            messageNumber: 1,
            previousChainLength: 1
          }
        ),
        zkService.decryptMessageWithSessionKey(
          encrypted[0].encryptedContent,
          encrypted[0].iv,
          sessionKeys.privateKey,
          {
            threadId,
            messageNumber: 0,
            previousChainLength: 2
          }
        )
      ]);

      expect(decrypted.reverse()).toEqual(messages);
    });

    it('should prevent replay attacks', async () => {
      const threadId = 'test-thread';
      const senderId = 'sender';
      const recipientId = 'recipient';
      const message = 'Test message';
      const sessionKeys = await zkService.getOrCreateSessionKeys(threadId);

      const encrypted = await zkService.encryptMessageWithSessionKey(
        message,
        sessionKeys.publicKey,
        {
          senderId,
          recipientId,
          threadId
        }
      );

      // First decryption should succeed
      const decrypted1 = await zkService.decryptMessageWithSessionKey(
        encrypted.encryptedContent,
        encrypted.iv,
        sessionKeys.privateKey,
        {
          threadId,
          messageNumber: 0,
          previousChainLength: 0
        }
      );
      expect(decrypted1).toBe(message);

      // Second decryption with same message number should fail
      await expect(
        zkService.decryptMessageWithSessionKey(
          encrypted.encryptedContent,
          encrypted.iv,
          sessionKeys.privateKey,
          {
            threadId,
            messageNumber: 0,
            previousChainLength: 0
          }
        )
      ).rejects.toThrow();
    });

    it('should maintain forward secrecy with new session keys', async () => {
      const threadId = 'test-thread';
      const senderId = 'sender';
      const recipientId = 'recipient';
      const message1 = 'Message with first key';
      const message2 = 'Message with second key';

      // First session
      const sessionKeys1 = await zkService.getOrCreateSessionKeys(threadId);
      const encrypted1 = await zkService.encryptMessageWithSessionKey(
        message1,
        sessionKeys1.publicKey,
        {
          senderId,
          recipientId,
          threadId
        }
      );

      // Second session with new keys
      const sessionKeys2 = await zkService.getOrCreateSessionKeys(threadId);
      const encrypted2 = await zkService.encryptMessageWithSessionKey(
        message2,
        sessionKeys2.publicKey,
        {
          senderId,
          recipientId,
          threadId
        }
      );

      // Both messages should decrypt correctly with their respective keys
      const decrypted1 = await zkService.decryptMessageWithSessionKey(
        encrypted1.encryptedContent,
        encrypted1.iv,
        sessionKeys1.privateKey,
        {
          threadId,
          messageNumber: 0,
          previousChainLength: 0
        }
      );

      const decrypted2 = await zkService.decryptMessageWithSessionKey(
        encrypted2.encryptedContent,
        encrypted2.iv,
        sessionKeys2.privateKey,
        {
          threadId,
          messageNumber: 0,
          previousChainLength: 0
        }
      );

      expect(decrypted1).toBe(message1);
      expect(decrypted2).toBe(message2);

      // Attempting to decrypt message2 with old keys should fail
      await expect(
        zkService.decryptMessageWithSessionKey(
          encrypted2.encryptedContent,
          encrypted2.iv,
          sessionKeys1.privateKey,
          {
            threadId,
            messageNumber: 0,
            previousChainLength: 0
          }
        )
      ).rejects.toThrow();
    });
  });

  describe('Ratchet State Management', () => {
    it('should maintain separate ratchet states for different threads', async () => {
      const thread1 = 'thread-1';
      const thread2 = 'thread-2';
      const senderId = 'sender';
      const recipientId = 'recipient';
      const message = 'Test message';

      const sessionKeys1 = await zkService.getOrCreateSessionKeys(thread1);
      const sessionKeys2 = await zkService.getOrCreateSessionKeys(thread2);

      const encrypted1 = await zkService.encryptMessageWithSessionKey(
        message,
        sessionKeys1.publicKey,
        {
          senderId,
          recipientId,
          threadId: thread1
        }
      );

      const encrypted2 = await zkService.encryptMessageWithSessionKey(
        message,
        sessionKeys2.publicKey,
        {
          senderId,
          recipientId,
          threadId: thread2
        }
      );

      const decrypted1 = await zkService.decryptMessageWithSessionKey(
        encrypted1.encryptedContent,
        encrypted1.iv,
        sessionKeys1.privateKey,
        {
          threadId: thread1,
          messageNumber: 0,
          previousChainLength: 0
        }
      );

      const decrypted2 = await zkService.decryptMessageWithSessionKey(
        encrypted2.encryptedContent,
        encrypted2.iv,
        sessionKeys2.privateKey,
        {
          threadId: thread2,
          messageNumber: 0,
          previousChainLength: 0
        }
      );

      expect(decrypted1).toBe(message);
      expect(decrypted2).toBe(message);
    });

    it('should handle multiple messages in a thread', async () => {
      const threadId = 'test-thread';
      const senderId = 'sender';
      const recipientId = 'recipient';
      const messages = Array.from({ length: 10 }, (_, i) => `Message ${i + 1}`);
      const sessionKeys = await zkService.getOrCreateSessionKeys(threadId);

      // Encrypt all messages
      const encrypted = await Promise.all(
        messages.map((msg, i) => 
          zkService.encryptMessageWithSessionKey(
            msg,
            sessionKeys.publicKey,
            {
              senderId,
              recipientId,
              threadId
            }
          )
        )
      );

      // Decrypt all messages
      const decrypted = await Promise.all(
        encrypted.map((enc, i) => 
          zkService.decryptMessageWithSessionKey(
            enc.encryptedContent,
            enc.iv,
            sessionKeys.privateKey,
            {
              threadId,
              messageNumber: i,
              previousChainLength: 0
            }
          )
        )
      );

      expect(decrypted).toEqual(messages);
    });
  });
}); 