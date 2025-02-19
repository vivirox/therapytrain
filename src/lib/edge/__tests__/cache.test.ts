import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { kv } from '@vercel/kv';
import { edgeCache, invalidateCache, warmCache } from '../cache';

// Mock @vercel/kv
vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    sadd: vi.fn(),
    keys: vi.fn(),
  },
}));

describe('Edge Cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('edgeCache', () => {
    it('should return cached value if exists', async () => {
      const mockValue = { data: 'test' };
      (kv.get as any).mockResolvedValueOnce(mockValue);

      const result = await edgeCache(
        'test-key',
        async () => ({ data: 'fresh' }),
        { ttl: 60 }
      );

      expect(result).toEqual(mockValue);
      expect(kv.get).toHaveBeenCalledTimes(1);
      expect(kv.set).not.toHaveBeenCalled();
    });

    it('should cache new value if not exists', async () => {
      const mockValue = { data: 'fresh' };
      (kv.get as any).mockResolvedValueOnce(null);
      (kv.set as any).mockResolvedValueOnce('OK');

      const result = await edgeCache(
        'test-key',
        async () => mockValue,
        { ttl: 60 }
      );

      expect(result).toEqual(mockValue);
      expect(kv.get).toHaveBeenCalledTimes(1);
      expect(kv.set).toHaveBeenCalledTimes(1);
    });

    it('should handle request coalescing', async () => {
      const mockValue = { data: 'coalesced' };
      (kv.get as any).mockResolvedValue(null);
      (kv.set as any).mockResolvedValue('OK');

      // Make multiple concurrent requests
      const requests = Array(3).fill(null).map(() =>
        edgeCache(
          'coalesce-key',
          async () => mockValue,
          { ttl: 60, coalesce: true }
        )
      );

      const results = await Promise.all(requests);

      // All requests should return the same value
      results.forEach(result => {
        expect(result).toEqual(mockValue);
      });

      // Only one cache get and set should have occurred
      expect(kv.get).toHaveBeenCalledTimes(1);
      expect(kv.set).toHaveBeenCalledTimes(1);
    });

    it('should handle cache tags', async () => {
      const mockValue = { data: 'tagged' };
      (kv.get as any).mockResolvedValueOnce(null);
      (kv.set as any).mockResolvedValueOnce('OK');
      (kv.sadd as any).mockResolvedValueOnce(1);

      await edgeCache(
        'tagged-key',
        async () => mockValue,
        { ttl: 60, tags: ['test-tag'] }
      );

      expect(kv.sadd).toHaveBeenCalledWith(
        expect.stringContaining(':tags'),
        'test-tag'
      );
    });

    it('should handle errors during cache operations', async () => {
      (kv.get as any).mockRejectedValueOnce(new Error('Cache error'));

      await expect(
        edgeCache(
          'error-key',
          async () => ({ data: 'error' })
        )
      ).rejects.toThrow('Cache error');
    });
  });

  describe('invalidateCache', () => {
    it('should delete cache entry', async () => {
      (kv.del as any).mockResolvedValueOnce(1);

      await invalidateCache('test-key');

      expect(kv.del).toHaveBeenCalledWith(
        expect.stringContaining('test-key')
      );
    });
  });

  describe('warmCache', () => {
    it('should warm multiple cache entries', async () => {
      const mockFn = vi.fn().mockImplementation(
        (key: string) => ({ data: key })
      );

      await warmCache(
        ['key1', 'key2', 'key3'],
        mockFn,
        { ttl: 60, tags: ['warm'] }
      );

      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(kv.set).toHaveBeenCalledTimes(3);
      expect(kv.sadd).toHaveBeenCalledTimes(3);
    });

    it('should handle batch size limits', async () => {
      const keys = Array(15).fill(null).map((_, i) => `key${i}`);
      const mockFn = vi.fn().mockImplementation(
        (key: string) => ({ data: key })
      );

      await warmCache(keys, mockFn);

      expect(mockFn).toHaveBeenCalledTimes(15);
      // Should have made 2 batches (10 + 5)
      expect(Promise.all).toHaveBeenCalledTimes(2);
    });
  });
}); 