import { SPDZ2kProtocolHandler } from '../spdz2k-protocol';
import { MPCConfig, MPCShare, MPCResult } from '../types';
import { EventEmitter } from 'events';

// Mock the preprocessing manager
class MockPreprocessingManager {
  async generateTriples(count: number): Promise<void> {}
  async generateBits(count: number): Promise<void> {}
  async getTriple(): Promise<[MPCShare, MPCShare, MPCShare]> {
    return [
      { value: '1', index: 0, mac: 'mac1' },
      { value: '2', index: 0, mac: 'mac2' },
      { value: '2', index: 0, mac: 'mac3' } // 1 * 2 = 2
    ];
  }
  async getBit(): Promise<MPCShare> {
    return { value: '1', index: 0, mac: 'mac' };
  }
  async cleanup(): Promise<void> {}
}

// Test configuration
const testConfig: MPCConfig = {
  numParties: 3,
  threshold: 2,
  bitLength: 64, // Use 64-bit integers
  preprocessingBatchSize: 1000,
  messageTimeout: 5000,
  protocolType: 'SPDZ2k'
};

describe('SPDZ2kProtocolHandler', () => {
  let handler: SPDZ2kProtocolHandler;
  let parties: SPDZ2kProtocolHandler[];

  beforeEach(() => {
    // Create multiple parties for testing
    parties = Array.from({ length: testConfig.numParties }, (_, i) => {
      const party = new SPDZ2kProtocolHandler(testConfig);
      // @ts-ignore - accessing protected property for testing
      party.partyId = i;
      // @ts-ignore - accessing protected property for testing
      party.preprocessingManager = new MockPreprocessingManager();
      // @ts-ignore - accessing protected property for testing
      party.sessionId = 'test-session';
      return party;
    });

    // Set up connections between parties
    parties.forEach(party => {
      party.on('message', (message: any) => {
        if (message.receiver === -1) {
          // Broadcast
          parties.forEach(p => {
            if (p !== party) {
              p.handleProtocolMessage(message);
            }
          });
        } else {
          // Direct message
          parties[message.receiver].handleProtocolMessage(message);
        }
      });
    });

    handler = parties[0];
  });

  describe('share', () => {
    it('should generate valid k-bit shares that sum to the original value', async () => {
      const value = '12345'; // Test with a small integer
      const shares = await handler.share(value);

      expect(shares).toHaveLength(testConfig.numParties);
      shares.forEach(share => {
        expect(share).toHaveProperty('value');
        expect(share).toHaveProperty('mac');
        expect(share).toHaveProperty('index');
        // Verify share is within k bits
        const shareValue = BigInt(`0x${share.value}`);
        expect(shareValue < (1n << 64n)).toBe(true);
      });

      // Verify shares reconstruct to original value
      const result = await handler.reconstruct(shares);
      expect(result.value).toBe(value);
    });

    it('should handle large integers up to k bits', async () => {
      const largeValue = (1n << 63n).toString(); // Test with max signed 64-bit integer
      const shares = await handler.share(largeValue);
      const result = await handler.reconstruct(shares);
      expect(BigInt(result.value)).toBe(BigInt(largeValue));
    });

    it('should truncate values larger than k bits', async () => {
      const tooLargeValue = (1n << 65n).toString(); // Value larger than 64 bits
      const shares = await handler.share(tooLargeValue);
      const result = await handler.reconstruct(shares);
      const truncatedValue = BigInt(tooLargeValue) & ((1n << 64n) - 1n);
      expect(BigInt(result.value)).toBe(truncatedValue);
    });
  });

  describe('multiply', () => {
    it('should correctly multiply two k-bit integers', async () => {
      const a = { value: '2', index: 0, mac: 'mac1' };
      const b = { value: '3', index: 0, mac: 'mac2' };

      const result = await handler.multiply(a, b);

      expect(result).toHaveProperty('value');
      expect(result).toHaveProperty('mac');
      expect(result).toHaveProperty('index');

      // Verify multiplication result
      const shares = await Promise.all(parties.map(p => p.multiply(a, b)));
      const reconstructed = await handler.reconstruct(shares);
      expect(BigInt(reconstructed.value)).toBe(6n); // 2 * 3 = 6
    });

    it('should handle multiplication overflow correctly', async () => {
      const largeValue = (1n << 32n).toString();
      const a = { value: largeValue, index: 0, mac: 'mac1' };
      const b = { value: '2', index: 0, mac: 'mac2' };

      // Verify multiplication with overflow
      const shares = await Promise.all(parties.map(p => p.multiply(a, b)));
      const reconstructed = await handler.reconstruct(shares);
      const expected = ((BigInt(largeValue) * 2n) & ((1n << 64n) - 1n)).toString();
      expect(reconstructed.value).toBe(expected);
    });
  });

  describe('compare', () => {
    it('should correctly compare two k-bit integers', async () => {
      const a = { value: '5', index: 0, mac: 'mac1' };
      const b = { value: '3', index: 0, mac: 'mac2' };

      const result = await handler.compare(a, b);

      expect(result).toHaveProperty('value');
      expect(result).toHaveProperty('mac');
      expect(result).toHaveProperty('index');

      // Verify comparison result
      const shares = await Promise.all(parties.map(p => p.compare(a, b)));
      const reconstructed = await handler.reconstruct(shares);
      expect(BigInt(reconstructed.value)).toBe(1n); // 5 > 3
    });

    it('should handle equal values', async () => {
      const a = { value: '5', index: 0, mac: 'mac1' };
      const b = { value: '5', index: 0, mac: 'mac2' };

      // Verify comparison result
      const shares = await Promise.all(parties.map(p => p.compare(a, b)));
      const reconstructed = await handler.reconstruct(shares);
      expect(BigInt(reconstructed.value)).toBe(0n); // 5 = 5
    });

    it('should handle negative comparison results', async () => {
      const a = { value: '3', index: 0, mac: 'mac1' };
      const b = { value: '5', index: 0, mac: 'mac2' };

      // Verify comparison result
      const shares = await Promise.all(parties.map(p => p.compare(a, b)));
      const reconstructed = await handler.reconstruct(shares);
      expect(BigInt(reconstructed.value)).toBe(-1n); // 3 < 5
    });

    it('should handle comparison of large k-bit integers', async () => {
      const a = { value: (1n << 63n).toString(16), index: 0, mac: 'mac1' };
      const b = { value: '1', index: 0, mac: 'mac2' };

      // Verify comparison result
      const shares = await Promise.all(parties.map(p => p.compare(a, b)));
      const reconstructed = await handler.reconstruct(shares);
      expect(BigInt(reconstructed.value)).toBe(1n); // 2^63 > 1
    });
  });

  describe('error handling', () => {
    it('should throw error when preprocessing manager is not initialized', async () => {
      const newHandler = new SPDZ2kProtocolHandler(testConfig);
      const a = { value: '2', index: 0, mac: 'mac1' };
      const b = { value: '3', index: 0, mac: 'mac2' };

      await expect(newHandler.multiply(a, b)).rejects.toThrow('Preprocessing manager not initialized');
      await expect(newHandler.compare(a, b)).rejects.toThrow('Preprocessing manager not initialized');
    });

    it('should throw error on invalid MAC', async () => {
      const shares = [
        { value: '1', index: 0, mac: 'invalid' },
        { value: '2', index: 1, mac: 'mac2' }
      ];

      await expect(handler.reconstruct(shares)).rejects.toThrow('MAC verification failed');
    });

    it('should handle timeout on multiplication messages', async () => {
      const a = { value: '2', index: 0, mac: 'mac1' };
      const b = { value: '3', index: 0, mac: 'mac2' };

      // Disconnect a party
      parties[1].removeAllListeners('message');

      await expect(handler.multiply(a, b)).rejects.toThrow('Timeout waiting for multiplication messages');
    });
  });

  describe('bit operations', () => {
    it('should correctly handle bitwise operations within k bits', async () => {
      const value = (1n << 63n).toString(); // Set the highest bit
      const shares = await handler.share(value);
      const result = await handler.reconstruct(shares);
      expect(BigInt(result.value)).toBe(BigInt(value));
    });

    it('should truncate bits beyond k bits', async () => {
      const value = (1n << 65n).toString(); // Set a bit beyond k bits
      const shares = await handler.share(value);
      const result = await handler.reconstruct(shares);
      const expected = BigInt(value) & ((1n << 64n) - 1n);
      expect(BigInt(result.value)).toBe(expected);
    });
  });
}); 