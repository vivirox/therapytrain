import { TestEnvironment, TestConfig } from './setup';
import { JIFFAdapter, JIFFAdapterConfig } from '../jiff-adapter';
import { MPCProtocol, MPCShare, NetworkMessage, ProtocolMessageType } from '../types';

describe('Comprehensive Integration Tests', () => {
  const protocols = [MPCProtocol.MASCOT, MPCProtocol.SPDZ2K, MPCProtocol.SEMI2K];
  const numParties = 3;
  const testValues = Array.from({ length: 100 }, (_, i) => i);

  protocols.forEach(protocol => {
    describe(`${protocol} Protocol`, () => {
      let env: TestEnvironment;
      let adapters: JIFFAdapter[];

      const testConfig: TestConfig = {
        protocol,
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
        
        // Create adapters for each party
        adapters = Array.from({ length: numParties }, (_, i) => {
          const config: JIFFAdapterConfig = {
            partyId: i,
            numParties,
            threshold: 1,
            protocol
          };
          return new JIFFAdapter(config);
        });
      }, 60000); // Allow 60s for setup

      afterAll(async () => {
        await env.cleanup();
      });

      describe('Basic Operations', () => {
        it('should share and open values correctly', async () => {
          const value = 42;
          const shares = await Promise.all(
            adapters.map(adapter => adapter.share(value))
          );

          const opened = await Promise.all(
            adapters.map((adapter, i) => adapter.open(shares[i]))
          );

          opened.forEach(result => {
            expect(result).toBe(value);
          });
        });

        it('should handle large numbers', async () => {
          const value = 2n ** 32n - 1n;
          const shares = await Promise.all(
            adapters.map(adapter => adapter.share(value))
          );

          const opened = await Promise.all(
            adapters.map((adapter, i) => adapter.open(shares[i]))
          );

          opened.forEach(result => {
            expect(result).toBe(value);
          });
        });
      });

      describe('Arithmetic Operations', () => {
        it('should perform addition correctly', async () => {
          const a = 5;
          const b = 3;
          
          const sharesA = await Promise.all(
            adapters.map(adapter => adapter.share(a))
          );
          const sharesB = await Promise.all(
            adapters.map(adapter => adapter.share(b))
          );

          const sums = await Promise.all(
            adapters.map((adapter, i) => adapter.add(sharesA[i], sharesB[i]))
          );

          const opened = await Promise.all(
            adapters.map((adapter, i) => adapter.open(sums[i]))
          );

          opened.forEach(result => {
            expect(result).toBe(8n);
          });
        });

        it('should perform multiplication correctly', async () => {
          const a = 5;
          const b = 3;
          
          const sharesA = await Promise.all(
            adapters.map(adapter => adapter.share(a))
          );
          const sharesB = await Promise.all(
            adapters.map(adapter => adapter.share(b))
          );

          const products = await Promise.all(
            adapters.map((adapter, i) => adapter.multiply(sharesA[i], sharesB[i]))
          );

          const opened = await Promise.all(
            adapters.map((adapter, i) => adapter.open(products[i]))
          );

          opened.forEach(result => {
            expect(result).toBe(15n);
          });
        });
      });

      describe('Comparison Operations', () => {
        it('should compare values correctly', async () => {
          const a = 5;
          const b = 3;
          
          const sharesA = await Promise.all(
            adapters.map(adapter => adapter.share(a))
          );
          const sharesB = await Promise.all(
            adapters.map(adapter => adapter.share(b))
          );

          const comparisons = await Promise.all(
            adapters.map((adapter, i) => adapter.greaterThan(sharesA[i], sharesB[i]))
          );

          const opened = await Promise.all(
            adapters.map((adapter, i) => adapter.open(comparisons[i]))
          );

          opened.forEach(result => {
            expect(result).toBe(1n);
          });
        });

        it('should handle equality correctly', async () => {
          const a = 5;
          const b = 5;
          
          const sharesA = await Promise.all(
            adapters.map(adapter => adapter.share(a))
          );
          const sharesB = await Promise.all(
            adapters.map(adapter => adapter.share(b))
          );

          const equals = await Promise.all(
            adapters.map((adapter, i) => adapter.equals(sharesA[i], sharesB[i]))
          );

          const opened = await Promise.all(
            adapters.map((adapter, i) => adapter.open(equals[i]))
          );

          opened.forEach(result => {
            expect(result).toBe(1n);
          });
        });
      });

      describe('Bitwise Operations', () => {
        it('should perform XOR correctly', async () => {
          const a = 5n; // 101
          const b = 3n; // 011
          
          const sharesA = await Promise.all(
            adapters.map(adapter => adapter.share(a))
          );
          const sharesB = await Promise.all(
            adapters.map(adapter => adapter.share(b))
          );

          const results = await Promise.all(
            adapters.map((adapter, i) => adapter.xor(sharesA[i], sharesB[i]))
          );

          const opened = await Promise.all(
            adapters.map((adapter, i) => adapter.open(results[i]))
          );

          opened.forEach(result => {
            expect(result).toBe(6n); // 110
          });
        });

        it('should perform AND correctly', async () => {
          const a = 5n; // 101
          const b = 3n; // 011
          
          const sharesA = await Promise.all(
            adapters.map(adapter => adapter.share(a))
          );
          const sharesB = await Promise.all(
            adapters.map(adapter => adapter.share(b))
          );

          const results = await Promise.all(
            adapters.map((adapter, i) => adapter.and(sharesA[i], sharesB[i]))
          );

          const opened = await Promise.all(
            adapters.map((adapter, i) => adapter.open(results[i]))
          );

          opened.forEach(result => {
            expect(result).toBe(1n); // 001
          });
        });
      });

      describe('Performance', () => {
        it('should handle batch operations efficiently', async () => {
          const startTime = Date.now();

          // Share all test values
          const shares = await Promise.all(
            testValues.map(value => 
              Promise.all(adapters.map(adapter => adapter.share(value)))
            )
          );

          // Perform operations
          const operations = shares.map(async (partyShares, i) => {
            if (i === shares.length - 1) return;
            const nextShares = shares[i + 1];

            return Promise.all(
              adapters.map((adapter, j) => 
                adapter.multiply(partyShares[j], nextShares[j])
              )
            );
          });

          const results = await Promise.all(operations);
          
          // Open results
          await Promise.all(
            results.map(async result => {
              if (!result) return;
              await Promise.all(
                result.map((share, i) => adapters[i].open(share))
              );
            })
          );

          const timePerOperation = (Date.now() - startTime) / testValues.length;
          console.log(`${protocol} average time per operation: ${timePerOperation}ms`);
          expect(timePerOperation).toBeLessThan(100); // Each operation should take less than 100ms
        });

        it('should handle concurrent operations', async () => {
          const startTime = Date.now();
          const numConcurrent = 10;

          const operations = Array.from({ length: numConcurrent }, async () => {
            const shares = await Promise.all(
              adapters.map(adapter => adapter.share(42))
            );

            const products = await Promise.all(
              adapters.map((adapter, i) => adapter.multiply(shares[i], shares[i]))
            );

            return Promise.all(
              adapters.map((adapter, i) => adapter.open(products[i]))
            );
          });

          await Promise.all(operations);

          const timePerBatch = (Date.now() - startTime) / numConcurrent;
          console.log(`${protocol} average time per concurrent batch: ${timePerBatch}ms`);
          expect(timePerBatch).toBeLessThan(200); // Each batch should take less than 200ms
        });
      });

      describe('Error Handling', () => {
        it('should handle invalid shares', async () => {
          const invalidShare = {
            value: 42,
            sender: -1,
            receivers: [0, 1, 2],
            threshold: 1,
            Zp: 2n ** 64n - 1n
          };

          await Promise.all(
            adapters.map(adapter =>
              expect(adapter.open(invalidShare)).rejects.toThrow()
            )
          );
        });

        it('should handle network errors gracefully', async () => {
          // Stop one party
          await env.cleanup();

          // Try to perform operation
          await Promise.all(
            adapters.map(adapter =>
              expect(adapter.share(42)).rejects.toThrow()
            )
          );

          // Restart parties for other tests
          await env.startAllParties();
        });
      });
    });
  });
}); 