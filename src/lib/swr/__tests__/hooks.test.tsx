/// <reference types="vitest" />
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import type { Mock } from 'vitest';
import {
  useData,
  useInfiniteData,
  useLiveData,
  useOptimisticMutation,
  usePrefetch,
  useBackgroundRevalidation,
  useFreshData,
  useConditionalData,
} from '../hooks';
import { swrConfig, createCachedFetcher } from '../config';

// Mock dependencies
vi.mock('../config', () => ({
  swrConfig: {
    fetcher: vi.fn(),
    dedupingInterval: 0,
  },
  createCachedFetcher: vi.fn(),
}));

// Wrapper component for SWR tests
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={swrConfig}>{children}</SWRConfig>
);

describe('SWR Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useData', () => {
    it('should fetch data with correct configuration', async () => {
      const mockData = { test: 'data' };
      const mockFetcher = vi.fn().mockResolvedValue(mockData);
      (createCachedFetcher as Mock).mockReturnValue(mockFetcher);

      const { result } = renderHook(
        () => useData('test-key', 'session'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      expect(createCachedFetcher).toHaveBeenCalledWith('session');
      expect(mockFetcher).toHaveBeenCalledWith('test-key');
    });

    it('should handle null key', () => {
      const mockFetcher = vi.fn();
      (createCachedFetcher as Mock).mockReturnValue(mockFetcher);

      const { result } = renderHook(
        () => useData(null, 'session'),
        { wrapper }
      );

      expect(result.current.data).toBeUndefined();
      expect(mockFetcher).not.toHaveBeenCalled();
    });
  });

  describe('useInfiniteData', () => {
    it('should handle infinite loading', async () => {
      const mockData = [{ id: 1 }, { id: 2 }];
      const mockFetcher = vi.fn().mockResolvedValue(mockData);
      (createCachedFetcher as Mock).mockReturnValue(mockFetcher);

      const getKey = (pageIndex: number) => `test-key-${pageIndex}`;

      const { result } = renderHook(
        () => useInfiniteData(getKey, 'session'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(createCachedFetcher).toHaveBeenCalledWith('session');
      expect(mockFetcher).toHaveBeenCalledWith('test-key-0');
    });
  });

  describe('useLiveData', () => {
    it('should configure live updates correctly', async () => {
      const mockData = { test: 'live' };
      const mockFetcher = vi.fn().mockResolvedValue(mockData);
      (createCachedFetcher as Mock).mockReturnValue(mockFetcher);

      const { result } = renderHook(
        () => useLiveData('test-key', 'messages'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      expect(result.current.config).toMatchObject({
        refreshInterval: 1000,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
      });
    });
  });

  describe('useOptimisticMutation', () => {
    it('should handle optimistic updates', async () => {
      const mockData = { id: 1, value: 'test' };
      const mockMutation = { value: 'updated' };
      const mockMutationFn = vi.fn().mockResolvedValue({ ...mockData, ...mockMutation });

      const { result } = renderHook(
        () => useOptimisticMutation(
          'test-key',
          mockMutationFn,
          {
            optimisticData: (current: typeof mockData | undefined, mutation: typeof mockMutation) => 
              current ? { ...current, ...mutation } : mockData,
            rollbackData: (current: typeof mockData | undefined) => current || mockData,
            revalidateTags: ['test']
          }
        ),
        { wrapper }
      );

      expect(result.current.trigger).toBeDefined();
    });
  });

  describe('usePrefetch', () => {
    it('should prefetch data', async () => {
      const mockData = { test: 'prefetch' };
      const mockFetcher = vi.fn().mockResolvedValue(mockData);
      (createCachedFetcher as Mock).mockReturnValue(mockFetcher);

      const { result } = renderHook(
        () => usePrefetch('test-key', 'session'),
        { wrapper }
      );

      const prefetchedData = await result.current();

      expect(prefetchedData).toEqual(mockData);
      expect(mockFetcher).toHaveBeenCalledWith('test-key');
    });

    it('should handle prefetch errors silently', async () => {
      const mockError = new Error('Prefetch error');
      const mockFetcher = vi.fn().mockRejectedValue(mockError);
      (createCachedFetcher as Mock).mockReturnValue(mockFetcher);

      const { result } = renderHook(
        () => usePrefetch('test-key', 'session'),
        { wrapper }
      );

      const prefetchedData = await result.current();

      expect(prefetchedData).toBeNull();
      expect(mockFetcher).toHaveBeenCalledWith('test-key');
    });
  });

  describe('useBackgroundRevalidation', () => {
    it('should configure background revalidation correctly', async () => {
      const mockData = { test: 'background' };
      const mockFetcher = vi.fn().mockResolvedValue(mockData);
      (createCachedFetcher as Mock).mockReturnValue(mockFetcher);

      const { result } = renderHook(
        () => useBackgroundRevalidation('test-key', 'session'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      expect(result.current.config).toMatchObject({
        revalidateOnMount: true,
        revalidateOnFocus: true,
        revalidateIfStale: true,
        dedupingInterval: 0,
      });
    });
  });

  describe('useFreshData', () => {
    it('should configure fresh data correctly', async () => {
      const mockData = { test: 'fresh' };
      const mockFetcher = vi.fn().mockResolvedValue(mockData);
      (createCachedFetcher as Mock).mockReturnValue(mockFetcher);

      const maxAge = 1000;
      const { result } = renderHook(
        () => useFreshData('test-key', 'session', maxAge),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      expect(result.current.config).toMatchObject({
        revalidateOnMount: true,
        revalidateOnFocus: true,
        dedupingInterval: maxAge,
      });
    });
  });

  describe('useConditionalData', () => {
    it('should fetch data when condition is true', async () => {
      const mockData = { test: 'conditional' };
      const mockFetcher = vi.fn().mockResolvedValue(mockData);
      (createCachedFetcher as Mock).mockReturnValue(mockFetcher);

      const { result } = renderHook(
        () => useConditionalData('test-key', true, 'session'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      expect(mockFetcher).toHaveBeenCalledWith('test-key');
    });

    it('should not fetch data when condition is false', () => {
      const mockFetcher = vi.fn();
      (createCachedFetcher as Mock).mockReturnValue(mockFetcher);

      const { result } = renderHook(
        () => useConditionalData('test-key', false, 'session'),
        { wrapper }
      );

      expect(result.current.data).toBeUndefined();
      expect(mockFetcher).not.toHaveBeenCalled();
    });
  });
}); 