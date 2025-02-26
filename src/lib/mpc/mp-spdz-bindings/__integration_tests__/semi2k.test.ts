import { TestEnvironment, TestConfig } from './setup';
import { Semi2kHandler } from '../protocol-handlers';
import { MPCProtocol, MPCShare, NetworkMessage, ProtocolMessageType } from '../types';

describe('Semi2k Protocol Integration', () => {
  let env: TestEnvironment;
  let handlers: Semi2kHandler[];
  const numParties = 3;

  const testConfig: TestConfig = {
    protocol: MPCProtocol.SEMI2K,
    numParties,
    basePort: 14000,
    preprocessingDir: '__tests__/preprocessing',
    binaryDir: process.env.MP_SPDZ_BINARY_DIR || '/usr/local/bin'
  };

  beforeAll(async () => {
    // Set up test environment
    env = new TestEnvironment(testConfig);
    
    // Generate preprocessing data
    await env.generatePreprocessing();
    
    // Start all parties
    await env.startAllParties();
    
    // Create protocol handlers for each party
    handlers = Array.from({ length: numParties }, () => new Semi2kHandler());
  }, 60000); // Allow 60s for setup

  afterAll(async () => {
    await env.cleanup();
  });

  describe('Basic Operations', () => {
    it('should perform secure addition', async () => {
      // Create shares for values 5 and 3
      const shareA: MPCShare = {
        id: 'test-share-a',
        partyId: 0,
        value: new Uint8Array(8),
        metadata: {
          type: 'share',
          bitLength: 64,
          verified: false
        }
      };
      new DataView(shareA.value.buffer).setBigUint64(0, 5n, true);

      const shareB: MPCShare = {
        id: 'test-share-b',
        partyId: 1,
        value: new Uint8Array(8),
        metadata: {
          type: 'share',
          bitLength: 64,
          verified: false
        }
      };
      new DataView(shareB.value.buffer).setBigUint64(0, 3n, true);

      // Distribute shares
      for (let i = 0; i < numParties; i++) {
        const messageA: NetworkMessage<MPCShare> = {
          type: ProtocolMessageType.SHARE,
          sender: 0,
          receiver: i,
          data: shareA,
          metadata: {
            timestamp: Date.now(),
            sequence: 1,
            sessionId: 'test-session'
          }
        };

        const messageB: NetworkMessage<MPCShare> = {
          type: ProtocolMessageType.SHARE,
          sender: 1,
          receiver: i,
          data: shareB,
          metadata: {
            timestamp: Date.now(),
            sequence: 2,
            sessionId: 'test-session'
          }
        };

        await handlers[i].handleShare(messageA);
        await handlers[i].handleShare(messageB);
      }

      // Perform local addition (each party adds their shares)
      const results = await Promise.all(
        handlers.map(async (handler) => {
          const message: NetworkMessage<{a: MPCShare, b: MPCShare}> = {
            type: ProtocolMessageType.MULTIPLICATION,
            sender: 0,
            data: { a: shareA, b: shareB },
            metadata: {
              timestamp: Date.now(),
              sequence: 3,
              sessionId: 'test-session'
            }
          };

          return handler.handleMultiplication(message);
        })
      );

      // Verify results
      for (const result of results) {
        const value = new DataView(result.value.buffer).getBigUint64(0, true);
        expect(value).toBe(15n); // 5 * 3 = 15
      }
    });

    it('should perform secure comparison', async () => {
      // Create shares for values 7 and 4
      const shareA: MPCShare = {
        id: 'test-share-a',
        partyId: 0,
        value: new Uint8Array(8),
        metadata: {
          type: 'share',
          bitLength: 64,
          verified: false
        }
      };
      new DataView(shareA.value.buffer).setBigUint64(0, 7n, true);

      const shareB: MPCShare = {
        id: 'test-share-b',
        partyId: 1,
        value: new Uint8Array(8),
        metadata: {
          type: 'share',
          bitLength: 64,
          verified: false
        }
      };
      new DataView(shareB.value.buffer).setBigUint64(0, 4n, true);

      // Distribute shares
      for (let i = 0; i < numParties; i++) {
        const messageA: NetworkMessage<MPCShare> = {
          type: ProtocolMessageType.SHARE,
          sender: 0,
          receiver: i,
          data: shareA,
          metadata: {
            timestamp: Date.now(),
            sequence: 4,
            sessionId: 'test-session'
          }
        };

        const messageB: NetworkMessage<MPCShare> = {
          type: ProtocolMessageType.SHARE,
          sender: 1,
          receiver: i,
          data: shareB,
          metadata: {
            timestamp: Date.now(),
            sequence: 5,
            sessionId: 'test-session'
          }
        };

        await handlers[i].handleShare(messageA);
        await handlers[i].handleShare(messageB);
      }

      // Perform comparison
      const results = await Promise.all(
        handlers.map(async (handler) => {
          const message: NetworkMessage<{a: MPCShare, b: MPCShare}> = {
            type: ProtocolMessageType.COMPARISON,
            sender: 0,
            data: { a: shareA, b: shareB },
            metadata: {
              timestamp: Date.now(),
              sequence: 6,
              sessionId: 'test-session'
            }
          };

          return handler.handleComparison(message);
        })
      );

      // Verify results
      for (const result of results) {
        const value = new DataView(result.value.buffer).getBigUint64(0, true);
        expect(value).toBe(1n); // 7 > 4 should return 1
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid share messages', async () => {
      const invalidShare: MPCShare = {
        id: 'invalid-share',
        partyId: -1, // Invalid party ID
        value: new Uint8Array(8),
        metadata: {
          type: 'share',
          bitLength: 64,
          verified: false
        }
      };

      const message: NetworkMessage<MPCShare> = {
        type: ProtocolMessageType.SHARE,
        sender: -1,
        data: invalidShare,
        metadata: {
          timestamp: Date.now(),
          sequence: 7,
          sessionId: 'test-session'
        }
      };

      await expect(handlers[0].handleShare(message)).rejects.toThrow();
    });

    it('should handle preprocessing errors', async () => {
      const invalidMessage: NetworkMessage<{type: string, data: Uint8Array}> = {
        type: ProtocolMessageType.PREPROCESSING,
        sender: 0,
        data: {
          type: 'invalid',
          data: new Uint8Array(0) // Empty data
        },
        metadata: {
          timestamp: Date.now(),
          sequence: 8,
          sessionId: 'test-session'
        }
      };

      await expect(handlers[0].handlePreprocessing(invalidMessage)).rejects.toThrow();
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple operations efficiently', async () => {
      const numOperations = 100;
      const startTime = Date.now();

      // Create test shares
      const shares = Array.from({ length: numOperations }, (_, i) => ({
        id: `perf-share-${i}`,
        partyId: 0,
        value: new Uint8Array(8),
        metadata: {
          type: 'share',
          bitLength: 64,
          verified: false
        }
      }));

      // Set random values
      shares.forEach(share => {
        new DataView(share.value.buffer).setBigUint64(0, BigInt(Math.floor(Math.random() * 1000)), true);
      });

      // Perform operations
      const operations = shares.map(async (share, i) => {
        if (i === shares.length - 1) return; // Skip last share

        const message: NetworkMessage<{a: MPCShare, b: MPCShare}> = {
          type: ProtocolMessageType.MULTIPLICATION,
          sender: 0,
          data: { a: share, b: shares[i + 1] },
          metadata: {
            timestamp: Date.now(),
            sequence: i + 100,
            sessionId: 'test-session'
          }
        };

        return handlers[0].handleMultiplication(message);
      });

      await Promise.all(operations);
      const endTime = Date.now();
      const timePerOperation = (endTime - startTime) / numOperations;

      console.log(`Average time per operation: ${timePerOperation}ms`);
      expect(timePerOperation).toBeLessThan(100); // Each operation should take less than 100ms
    });
  });
}); 