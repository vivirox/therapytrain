import { kv } from '@vercel/kv';
import { cache } from 'react';
import { nanoid } from 'nanoid';

// Cache configuration
const CACHE_CONFIG = {
  ttl: {
    short: 60, // 1 minute
    medium: 300, // 5 minutes
    long: 3600, // 1 hour
    day: 86400, // 24 hours
  },
  prefix: {
    edge: 'edge:cache:',
    coalesce: 'edge:coalesce:',
  },
  maxBatchSize: 100,
};

// Types
interface CacheOptions {
  ttl?: number;
  tags?: string[];
  coalesce?: boolean;
}

interface CoalesceRequest {
  id: string;
  promise: Promise<any>;
  timestamp: number;
  resolvers: ((value: any) => void)[];
}

// In-memory coalescing map for edge functions
const coalesceMap = new Map<string, CoalesceRequest>();

// Cache wrapper with request coalescing
export const edgeCache = cache(async function<T>(
  key: string,
  fn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const {
    ttl = CACHE_CONFIG.ttl.medium,
    tags = [],
    coalesce = false
  } = options;

  const cacheKey = `${CACHE_CONFIG.prefix.edge}${key}`;

  // Try to get from cache first
  const cached = await kv.get<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // If coalescing is enabled, handle duplicate requests
  if (coalesce) {
    const coalesceKey = `${CACHE_CONFIG.prefix.coalesce}${key}`;
    const existingRequest = coalesceMap.get(coalesceKey);

    if (existingRequest) {
      // If there's an in-flight request, wait for it
      return new Promise((resolve) => {
        existingRequest.resolvers.push(resolve);
      });
    }

    // Create new coalesce request
    const coalesceRequest: CoalesceRequest = {
      id: nanoid(),
      promise: fn(),
      timestamp: Date.now(),
      resolvers: [],
    };

    coalesceMap.set(coalesceKey, coalesceRequest);

    try {
      const result = await coalesceRequest.promise;
      
      // Store in cache
      await kv.set(cacheKey, result, { ex: ttl });
      
      // Resolve all waiting requests
      coalesceRequest.resolvers.forEach(resolve => resolve(result));
      
      // Cleanup
      coalesceMap.delete(coalesceKey);
      
      return result;
    } catch (error) {
      // Cleanup on error
      coalesceMap.delete(coalesceKey);
      throw error;
    }
  }

  // If not coalescing, just execute and cache
  const result = await fn();
  await kv.set(cacheKey, result, { ex: ttl });
  
  // Store tags for cache invalidation
  if (tags.length > 0) {
    await kv.sadd(`${cacheKey}:tags`, ...tags);
  }

  return result;
});

// Invalidate cache by key
export const invalidateCache = cache(async (key: string): Promise<void> => {
  const cacheKey = `${CACHE_CONFIG.prefix.edge}${key}`;
  await kv.del(cacheKey);
});

// Invalidate cache by tag
export const invalidateCacheByTag = cache(async (tag: string): Promise<void> => {
  const pattern = `${CACHE_CONFIG.prefix.edge}*:tags`;
  const keys = await kv.keys(pattern);
  
  for (const key of keys) {
    const tags = await kv.smembers(key);
    if (tags.includes(tag)) {
      const cacheKey = key.replace(':tags', '');
      await kv.del(cacheKey);
    }
  }
});

// Batch cache operations
export const batchCache = cache(async <T>(
  keys: string[],
  fn: (keys: string[]) => Promise<T[]>,
  options: CacheOptions = {}
): Promise<T[]> => {
  const {
    ttl = CACHE_CONFIG.ttl.medium,
    tags = []
  } = options;

  // Limit batch size
  const batchKeys = keys.slice(0, CACHE_CONFIG.maxBatchSize);
  const cacheKeys = batchKeys.map(key => `${CACHE_CONFIG.prefix.edge}${key}`);

  // Get cached values
  const cachedValues = await kv.mget<T[]>(...cacheKeys);
  const missingIndexes = cachedValues.map((v, i) => v === null ? i : -1).filter(i => i !== -1);

  if (missingIndexes.length === 0) {
    return cachedValues as T[];
  }

  // Get missing values
  const missingKeys = missingIndexes.map(i => batchKeys[i]);
  const missingValues = await fn(missingKeys);

  // Cache missing values
  const cachePromises = missingValues.map((value, i) => {
    const cacheKey = cacheKeys[missingIndexes[i]];
    return kv.set(cacheKey, value, { ex: ttl });
  });

  // Store tags if any
  if (tags.length > 0) {
    cachePromises.push(...missingIndexes.map(i => {
      const cacheKey = cacheKeys[i];
      return kv.sadd(`${cacheKey}:tags`, ...tags);
    }));
  }

  await Promise.all(cachePromises);

  // Combine cached and new values
  const result = [...cachedValues];
  missingIndexes.forEach((index, i) => {
    result[index] = missingValues[i];
  });

  return result;
});

// Cache warming utility
export const warmCache = cache(async <T>(
  keys: string[],
  fn: (key: string) => Promise<T>,
  options: CacheOptions = {}
): Promise<void> => {
  const {
    ttl = CACHE_CONFIG.ttl.medium,
    tags = []
  } = options;

  const batchSize = 10;
  const batches = Math.ceil(keys.length / batchSize);

  for (let i = 0; i < batches; i++) {
    const batchKeys = keys.slice(i * batchSize, (i + 1) * batchSize);
    const promises = batchKeys.map(async (key) => {
      const cacheKey = `${CACHE_CONFIG.prefix.edge}${key}`;
      const value = await fn(key);
      await kv.set(cacheKey, value, { ex: ttl });
      if (tags.length > 0) {
        await kv.sadd(`${cacheKey}:tags`, ...tags);
      }
    });
    await Promise.all(promises);
  }
}); 