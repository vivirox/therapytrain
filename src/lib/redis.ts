import { Redis } from '@upstash/redis'
import IORedis from 'ioredis'
import { cacheConfig } from '../config/cache.config'
import { CacheMonitoringService } from '../services/CacheMonitoringService'

// Create Upstash Redis client for edge runtime
export const upstashRedis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
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
  return isEdge ? upstashRedis : ioRedis
}

// Cache wrapper with automatic serialization/deserialization and monitoring
export async function cache<T>(
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
export async function invalidateByPattern(pattern: string, isEdge: boolean = false) {
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