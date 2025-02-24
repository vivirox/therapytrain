import { vi, describe, it, expect, beforeEach } from 'vitest';
import { defaultFetcher, swrConfig, cacheConfig, createCachedFetcher, createOptimisticMutation } from '../config';
import { edgeCache } from '../../edge/cache';

// Mock dependencies
vi.mock('../../edge/cache', () => ({
  edgeCache: vi.fn(),
  invalidateByTag: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

describe('SWR Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('defaultFetcher', () => {
    it('should fetch and return JSON data on success', async () => {
      const mockData = { test: 'data' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await defaultFetcher('test-url');

      expect(global.fetch).toHaveBeenCalledWith('test-url');
      expect(result).toEqual(mockData);
    });

    it('should throw error on failed fetch', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      await expect(defaultFetcher('test-url')).rejects.toThrow('Failed to fetch data');
    });
  });

  describe('swrConfig', () => {
    it('should have correct default configuration', () => {
      expect(swrConfig).toMatchObject({
        fetcher: defaultFetcher,
        focusThrottleInterval: 300000,
        dedupingInterval: 60000,
        errorRetryCount: 3,
        errorRetryInterval: 1000,
        suspense: true,
        revalidateOnReconnect: true,
        revalidateOnFocus: false,
        revalidateOnMount: false,
        optimisticData: true,
        keepPreviousData: true,
      });
    });
  });

  describe('cacheConfig', () => {
    it('should have correct TTL and tags for session data', () => {
      expect(cacheConfig.session).toEqual({
        ttl: 300,
        tags: ['session'],
      });
    });

    it('should have correct TTL and tags for profile data', () => {
      expect(cacheConfig.profile).toEqual({
        ttl: 3600,
        tags: ['profile'],
      });
    });

    it('should have correct TTL and tags for messages data', () => {
      expect(cacheConfig.messages).toEqual({
        ttl: 60,
        tags: ['messages'],
      });
    });

    it('should have correct TTL and tags for analytics data', () => {
      expect(cacheConfig.analytics).toEqual({
        ttl: 1800,
        tags: ['analytics'],
      });
    });
  });

  describe('createCachedFetcher', () => {
    it('should create a fetcher with correct cache configuration', async () => {
      const mockData = { test: 'data' };
      (edgeCache as jest.Mock).mockResolvedValueOnce(mockData);

      const fetcher = createCachedFetcher('session');
      const result = await fetcher('test-url');

      expect(edgeCache).toHaveBeenCalledWith(
        'test-url',
        defaultFetcher,
        cacheConfig.session
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('createOptimisticMutation', () => {
    it('should create mutation options with correct configuration', async () => {
      const mockOptions = {
        optimisticData: (current: any, mutation: any) => ({ ...current, ...mutation }),
        rollbackData: (current: any) => current,
        revalidateTags: ['test-tag'],
      };

      const result = createOptimisticMutation(mockOptions);

      expect(result).toMatchObject({
        optimisticData: mockOptions.optimisticData,
        rollbackOnError: true,
        populateCache: true,
        revalidate: false,
      });
    });

    it('should handle revalidation on success', async () => {
      const mockOptions = {
        optimisticData: (current: any, mutation: any) => ({ ...current, ...mutation }),
        rollbackData: (current: any) => current,
        revalidateTags: ['test-tag'],
      };

      const mutation = createOptimisticMutation(mockOptions);
      await mutation.onSuccess?.();

      expect(edgeCache.invalidateByTag).toHaveBeenCalledWith('test-tag');
    });
  });
}); 