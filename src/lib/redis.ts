import { Redis } from '@upstash/redis'
import IORedis from 'ioredis'
import { cacheConfig } from '../config/cache.config'
import { CacheMonitoringService } from '../services/CacheMonitoringService'
import { env } from '@/utils/env'

// Initialize Redis client
const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
})

// Create ioredis client for server runtime
export const ioRedis = new IORedis(process.env.REDIS_URL!, {
  ...cacheConfig.redis.connection,
  tls: {
    rejectUnauthorized: false
  }
})

// Helper function to determine which client to use
export function getRedisClient(isEdge: boolean = false) {
  return isEdge ? redis : ioRedis
}

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
  await redis.setex(key, ttl, result);
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
  value: unknown,
  ttl?: number
): Promise<void> {
  if (ttl) {
    await redis.setex(key, ttl, value);
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

export { redis };

// Cache wrapper with automatic serialization/deserialization and monitoring
export async function cacheWrapper<T>(
  key: string,
  getData: () => Promise<T>,
  ttl: number = cacheConfig.redis.ttl.default,
  isEdge: boolean = false
): Promise<T> {
  const redis = getRedisClient(isEdge)
  const monitor = CacheMonitoringService.getInstance()
  const startTime = Date.now()
  
  try {
    // Try to get from cache first
    const cached = await redis.get(key)
    const latency = Date.now() - startTime
    monitor.on('latency', latency)

    if (cached) {
      monitor.on('hit', key)
      return JSON.parse(cached as string) as T
    }

    monitor.on('miss', key)

    // If not in cache, get fresh data
    const data = await getData()
    
    // Store in cache
    await redis.set(key, JSON.stringify(data), {
      ex: ttl
    })
    
    return data
  } catch (error) {
    console.error('Redis cache error:', error)
    monitor.on('error', error)
    // On cache error, fallback to direct data fetch
    return getData()
  }
}

// Pattern-based cache invalidation with monitoring
export async function invalidateByPatternWrapper(pattern: string, isEdge: boolean = false) {
  const redis = getRedisClient(isEdge)
  const monitor = CacheMonitoringService.getInstance()
  
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
      monitor.on('invalidation', { pattern, count: keys.length })
    }
  } catch (error) {
    console.error('Redis invalidation error:', error)
    monitor.on('error', error)
  }
}

// Cache middleware for API routes with monitoring
export function withCache(
  handler: Function,
  keyGenerator: (req: Request) => string,
  ttl: number = cacheConfig.redis.ttl.default,
  isEdge: boolean = false
) {
  return async (req: Request) => {
    const cacheKey = keyGenerator(req)
    
    return cache(
      cacheKey,
      () => handler(req),
      ttl,
      isEdge
    )
  }
}

// Get cache metrics and recommendations
export async function getCacheAnalytics() {
  const monitor = CacheMonitoringService.getInstance()
  return {
    metrics: monitor.getMetrics(),
    alerts: monitor.getAlerts(),
    history: monitor.getMetricsHistory(),
    recommendations: await monitor.getRecommendations()
  }
} 