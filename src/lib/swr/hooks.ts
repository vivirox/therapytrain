import useSWR, { SWRConfiguration, SWRResponse } from 'swr';
import useSWRInfinite from 'swr/infinite';
import useSWRMutation from 'swr/mutation';
import { swrConfig, createCachedFetcher, createOptimisticMutation, OptimisticMutationOptions } from './config';

// Generic data fetching hook with edge caching
export function useData<T>(
  key: string | null,
  type: 'session' | 'profile' | 'messages' | 'analytics',
  config?: SWRConfiguration
): SWRResponse<T, Error> {
  return useSWR<T>(
    key,
    createCachedFetcher(type),
    {
      ...swrConfig,
      ...config,
    }
  );
}

// Hook for paginated data with infinite loading
export function useInfiniteData<T>(
  getKey: (pageIndex: number, previousPageData: T[] | null) => string | null,
  type: 'session' | 'profile' | 'messages' | 'analytics',
  config?: SWRConfiguration
) {
  return useSWRInfinite<T[]>(
    getKey,
    createCachedFetcher(type),
    {
      ...swrConfig,
      ...config,
      revalidateFirstPage: false,
      persistSize: true,
    }
  );
}

// Hook for data that requires frequent updates
export function useLiveData<T>(
  key: string | null,
  type: 'session' | 'profile' | 'messages' | 'analytics',
  config?: SWRConfiguration
) {
  return useData<T>(key, type, {
    ...config,
    refreshInterval: 1000, // Poll every second
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });
}

// Hook for optimistic mutations
export function useOptimisticMutation<T, M>(
  key: string,
  mutationFn: (key: string, { arg }: { arg: M }) => Promise<T>,
  options: OptimisticMutationOptions<T, M>
) {
  return useSWRMutation(
    key,
    mutationFn,
    createOptimisticMutation(options)
  );
}

// Hook for prefetching data
export function usePrefetch<T>(
  key: string,
  type: 'session' | 'profile' | 'messages' | 'analytics'
) {
  const fetcher = createCachedFetcher(type);
  
  return async () => {
    // Start prefetching
    const promise = fetcher(key);
    
    // Preload data into cache
    try {
      const data = await promise;
      return data as T;
    } catch (error) {
      // Silently fail for prefetch
      console.warn('Prefetch failed:', error);
      return null;
    }
  };
}

// Hook for data that requires background revalidation
export function useBackgroundRevalidation<T>(
  key: string | null,
  type: 'session' | 'profile' | 'messages' | 'analytics',
  config?: SWRConfiguration
) {
  return useData<T>(key, type, {
    ...config,
    revalidateOnMount: true,
    revalidateOnFocus: true,
    revalidateIfStale: true,
    dedupingInterval: 0,
  });
}

// Hook for data that should be kept fresh
export function useFreshData<T>(
  key: string | null,
  type: 'session' | 'profile' | 'messages' | 'analytics',
  maxAge: number = 5000, // 5 seconds
  config?: SWRConfiguration
) {
  return useData<T>(key, type, {
    ...config,
    revalidateOnMount: true,
    revalidateOnFocus: true,
    dedupingInterval: maxAge,
  });
}

// Hook for conditional fetching
export function useConditionalData<T>(
  key: string | null,
  condition: boolean,
  type: 'session' | 'profile' | 'messages' | 'analytics',
  config?: SWRConfiguration
) {
  return useData<T>(
    condition ? key : null,
    type,
    config
  );
} 