import { JIFFAdapter, JIFFAdapterConfig, JIFFShare } from '../jiff-adapter';
import { MPCProtocol } from '../mp-spdz-bindings/types';

describe('JIFF Adapter', () => {
  let adapter: JIFFAdapter;
  const config: JIFFAdapterConfig = {
    partyId: 0,
    numParties: 3,
    threshold: 1,
    prime: 2n ** 64n - 1n,
    protocol: MPCProtocol.SEMI2K
  };

  beforeEach(() => {
    adapter = new JIFFAdapter(config);
  });

  describe('Share Operations', () => {
    it('should create and store shares', async () => {
      const value = 42;
      const share = await adapter.share(value);

      expect(share).toBeDefined();
      expect(share.value).toBe(value);
      expect(share.sender).toBe(config.partyId);
      expect(share.receivers).toHaveLength(config.numParties);
      expect(share.threshold).toBe(config.threshold);
      expect(share.Zp).toBe(config.prime);
    });

    it('should open shares correctly', async () => {
      const value = 42;
      const share = await adapter.share(value);
      const opened = await adapter.open(share);

      expect(opened).toBe(value);
    });

    it('should handle large numbers', async () => {
      const value = 2n ** 32n - 1n;
      const share = await adapter.share(value);
      const opened = await adapter.open(share);

      expect(opened).toBe(value);
    });
  });

  describe('Arithmetic Operations', () => {
    it('should add shares correctly', async () => {
      const a = await adapter.share(5);
      const b = await adapter.share(3);
      const result = await adapter.add(a, b);
      const opened = await adapter.open(result);

      expect(opened).toBe(8n);
    });

    it('should multiply shares correctly', async () => {
      const a = await adapter.share(5);
      const b = await adapter.share(3);
      const result = await adapter.multiply(a, b);
      const opened = await adapter.open(result);

      expect(opened).toBe(15n);
    });

    it('should handle arithmetic with large numbers', async () => {
      const a = await adapter.share(2n ** 32n - 1n);
      const b = await adapter.share(2n);
      const result = await adapter.multiply(a, b);
      const opened = await adapter.open(result);

      expect(opened).toBe((2n ** 32n - 1n) * 2n);
    });
  });

  describe('Comparison Operations', () => {
    it('should compare less than correctly', async () => {
      const a = await adapter.share(5);
      const b = await adapter.share(8);
      const result = await adapter.lessThan(a, b);
      const opened = await adapter.open(result);

      expect(opened).toBe(1n); // true
    });

    it('should compare greater than correctly', async () => {
      const a = await adapter.share(8);
      const b = await adapter.share(5);
      const result = await adapter.greaterThan(a, b);
      const opened = await adapter.open(result);

      expect(opened).toBe(1n); // true
    });

    it('should compare equals correctly', async () => {
      const a = await adapter.share(5);
      const b = await adapter.share(5);
      const result = await adapter.equals(a, b);
      const opened = await adapter.open(result);

      expect(opened).toBe(1n); // true

      const c = await adapter.share(6);
      const notEqual = await adapter.equals(a, c);
      const notEqualOpened = await adapter.open(notEqual);

      expect(notEqualOpened).toBe(0n); // false
    });
  });

  describe('Bitwise Operations', () => {
    it('should perform XOR correctly', async () => {
      const a = await adapter.share(5n); // 101
      const b = await adapter.share(3n); // 011
      const result = await adapter.xor(a, b);
      const opened = await adapter.open(result);

      expect(opened).toBe(6n); // 110
    });

    it('should perform OR correctly', async () => {
      const a = await adapter.share(5n); // 101
      const b = await adapter.share(3n); // 011
      const result = await adapter.or(a, b);
      const opened = await adapter.open(result);

      expect(opened).toBe(7n); // 111
    });

    it('should perform AND correctly', async () => {
      const a = await adapter.share(5n); // 101
      const b = await adapter.share(3n); // 011
      const result = await adapter.and(a, b);
      const opened = await adapter.open(result);

      expect(opened).toBe(1n); // 001
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid shares', async () => {
      const invalidShare: JIFFShare = {
        value: 42,
        sender: -1, // Invalid sender
        receivers: [0, 1, 2],
        threshold: 1,
        Zp: 2n ** 64n - 1n
      };

      await expect(adapter.open(invalidShare)).rejects.toThrow();
    });

    it('should handle missing shares', async () => {
      const share: JIFFShare = {
        value: 42,
        sender: 0,
        receivers: [0, 1, 2],
        threshold: 1,
        Zp: 2n ** 64n - 1n
      };

      await expect(adapter.open(share)).rejects.toThrow();
    });
  });

  describe('Protocol Selection', () => {
    it('should work with different protocols', async () => {
      const protocols = [MPCProtocol.SEMI2K, MPCProtocol.SPDZ2K, MPCProtocol.MASCOT];

      for (const protocol of protocols) {
        const protocolConfig = { ...config, protocol };
        const protocolAdapter = new JIFFAdapter(protocolConfig);

        const a = await protocolAdapter.share(5);
        const b = await protocolAdapter.share(3);
        const result = await protocolAdapter.multiply(a, b);
        const opened = await protocolAdapter.open(result);

        expect(opened).toBe(15n);
      }
    });
  });

  describe('Performance', () => {
    it('should handle multiple operations efficiently', async () => {
      const numOperations = 100;
      const startTime = Date.now();

      const shares = await Promise.all(
        Array.from({ length: numOperations }, (_, i) => adapter.share(i))
      );

      const results = await Promise.all(
        shares.map(async (share, i) => {
          if (i === shares.length - 1) return share;
          const next = shares[i + 1];
          return adapter.multiply(share, next);
        })
      );

      await Promise.all(results.map(result => adapter.open(result)));

      const timePerOperation = (Date.now() - startTime) / numOperations;
      expect(timePerOperation).toBeLessThan(100); // Each operation should take less than 100ms
    });
  });
}); 