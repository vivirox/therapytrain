import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Cache data with TTL
 */
export async function cache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = 300, // 5 minutes default
): Promise<T> {
  // Try to get from cache first
  const cached = await redis.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // If not in cache, execute function and cache result
  const result = await fn();
  await redis.set(key, result, { ex: ttl });
  return result;
}

/**
 * Invalidate cache by pattern
 */
export async function invalidateByPattern(
  pattern: string,
  exact: boolean = false
): Promise<void> {
  const keys = await redis.keys(exact ? pattern : `${pattern}*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

/**
 * Set cache value
 */
export async function set(
  key: string,
  value: any,
  ttl?: number
): Promise<void> {
  if (ttl) {
    await redis.set(key, value, { ex: ttl });
  } else {
    await redis.set(key, value);
  }
}

/**
 * Get cache value
 */
export async function get<T>(key: string): Promise<T | null> {
  return redis.get<T>(key);
}

/**
 * Delete cache value
 */
export async function del(key: string): Promise<void> {
  await redis.del(key);
}

/**
 * Clear all cache
 */
export async function clear(): Promise<void> {
  await redis.flushall();
} 