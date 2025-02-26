import { MascotProtocolHandler } from '../mascot-protocol';
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
  fieldSize: BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F'), // secp256k1 prime
  preprocessingBatchSize: 1000,
  messageTimeout: 5000,
  protocolType: 'MASCOT'
};

describe('MascotProtocolHandler', () => {
  let handler: MascotProtocolHandler;
  let parties: MascotProtocolHandler[];

  beforeEach(() => {
    // Create multiple parties for testing
    parties = Array.from({ length: testConfig.numParties }, (_, i) => {
      const party = new MascotProtocolHandler(testConfig);
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
    it('should generate valid shares that sum to the original value', async () => {
      const value = 'test';
      const shares = await handler.share(value);

      expect(shares).toHaveLength(testConfig.numParties);
      shares.forEach(share => {
        expect(share).toHaveProperty('value');
        expect(share).toHaveProperty('mac');
        expect(share).toHaveProperty('index');
      });

      // Verify shares reconstruct to original value
      const result = await handler.reconstruct(shares);
      expect(result.value).toBe(value);
    });
  });

  describe('multiply', () => {
    it('should correctly multiply two shared values', async () => {
      const a = { value: '2', index: 0, mac: 'mac1' };
      const b = { value: '3', index: 0, mac: 'mac2' };

      const result = await handler.multiply(a, b);

      expect(result).toHaveProperty('value');
      expect(result).toHaveProperty('mac');
      expect(result).toHaveProperty('index');

      // Verify multiplication result
      const shares = await Promise.all(parties.map(p => p.multiply(a, b)));
      const reconstructed = await handler.reconstruct(shares);
      expect(BigInt(`0x${reconstructed.value}`)).toBe(BigInt(6)); // 2 * 3 = 6
    });
  });

  describe('compare', () => {
    it('should correctly compare two shared values', async () => {
      const a = { value: '5', index: 0, mac: 'mac1' };
      const b = { value: '3', index: 0, mac: 'mac2' };

      const result = await handler.compare(a, b);

      expect(result).toHaveProperty('value');
      expect(result).toHaveProperty('mac');
      expect(result).toHaveProperty('index');

      // Verify comparison result
      const shares = await Promise.all(parties.map(p => p.compare(a, b)));
      const reconstructed = await handler.reconstruct(shares);
      expect(BigInt(`0x${reconstructed.value}`)).toBe(BigInt(1)); // 5 > 3
    });

    it('should handle equal values', async () => {
      const a = { value: '5', index: 0, mac: 'mac1' };
      const b = { value: '5', index: 0, mac: 'mac2' };

      // Verify comparison result
      const shares = await Promise.all(parties.map(p => p.compare(a, b)));
      const reconstructed = await handler.reconstruct(shares);
      expect(BigInt(`0x${reconstructed.value}`)).toBe(BigInt(0)); // 5 = 5
    });

    it('should handle negative comparison results', async () => {
      const a = { value: '3', index: 0, mac: 'mac1' };
      const b = { value: '5', index: 0, mac: 'mac2' };

      // Verify comparison result
      const shares = await Promise.all(parties.map(p => p.compare(a, b)));
      const reconstructed = await handler.reconstruct(shares);
      expect(BigInt(`0x${reconstructed.value}`)).toBe(BigInt(-1)); // 3 < 5
    });
  });

  describe('error handling', () => {
    it('should throw error when preprocessing manager is not initialized', async () => {
      const newHandler = new MascotProtocolHandler(testConfig);
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
  });
}); 