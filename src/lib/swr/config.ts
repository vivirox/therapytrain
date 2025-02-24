import { SWRConfiguration } from 'swr';
import { edgeCache } from '../edge/cache';

// Default fetcher that works with our edge caching
export const defaultFetcher = async (key: string) => {
  const response = await fetch(key);
  if (!response.ok) {
    throw new Error('Failed to fetch data');
  }
  return response.json();
};

// Global SWR configuration
export const swrConfig: SWRConfiguration = {
  // Use our edge-cached fetcher by default
  fetcher: defaultFetcher,
  
  // Revalidate on focus after 5 minutes of inactivity
  focusThrottleInterval: 300000,
  
  // Keep data fresh for 1 minute
  dedupingInterval: 60000,
  
  // Retry up to 3 times with exponential backoff
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  
  // Enable suspense mode for streaming
  suspense: true,
  
  // Revalidate on reconnect
  revalidateOnReconnect: true,
  
  // Don't revalidate on focus by default (controlled per-hook)
  revalidateOnFocus: false,
  
  // Don't revalidate on mount by default (controlled per-hook)
  revalidateOnMount: false,
  
  // Use optimistic updates
  optimisticData: true,
  
  // Keep previous data while revalidating
  keepPreviousData: true,
  
  // Enable React 18 concurrent features
  use: [],
};

// Cache configuration for different data types
export const cacheConfig = {
  session: {
    ttl: 300, // 5 minutes
    tags: ['session'],
  },
  profile: {
    ttl: 3600, // 1 hour
    tags: ['profile'],
  },
  messages: {
    ttl: 60, // 1 minute
    tags: ['messages'],
  },
  analytics: {
    ttl: 1800, // 30 minutes
    tags: ['analytics'],
  },
};

// Helper to create a cached fetcher for a specific data type
export const createCachedFetcher = (type: keyof typeof cacheConfig) => {
  return async (key: string) => {
    return edgeCache(
      key,
      defaultFetcher,
      cacheConfig[type]
    );
  };
};

// Helper to create optimistic mutation options
export interface OptimisticMutationOptions<Data, MutationData> {
  // Function to update the data optimistically
  optimisticData: (currentData: Data | undefined, mutationData: MutationData) => Data;
  // Function to roll back if mutation fails
  rollbackData: (currentData: Data | undefined, mutationData: MutationData) => Data;
  // Additional revalidation tags
  revalidateTags?: string[];
}

export const createOptimisticMutation = <Data, MutationData>(
  options: OptimisticMutationOptions<Data, MutationData>
) => {
  return {
    optimisticData: options.optimisticData,
    rollbackOnError: true,
    populateCache: true,
    revalidate: false,
    onSuccess: async () => {
      // Revalidate related data
      if (options.revalidateTags) {
        await Promise.all(
          options.revalidateTags.map(tag => 
            edgeCache.invalidateByTag(tag)
          )
        );
      }
    },
  };
}; 