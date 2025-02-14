import { Redis } from '@upstash/redis';
import { Logger } from '../logger';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitInfo {
  remaining: number;
  reset: number;
  total: number;
}

export class RateLimiter {
  private static instance: RateLimiter;
  private redis: Redis;
  private logger: Logger;
  private readonly KEY_PREFIX = 'ratelimit';

  // Default limits for different actions
  private readonly DEFAULT_LIMITS = {
    messages: { windowMs: 60000, maxRequests: 30 }, // 30 requests per minute
    connections: { windowMs: 300000, maxRequests: 5 }, // 5 connections per 5 minutes
    history: { windowMs: 60000, maxRequests: 20 }, // 20 history requests per minute
  };

  private constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    this.logger = Logger.getInstance();
  }

  public static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  /**
   * Check if a request should be rate limited
   */
  public async checkLimit(
    identifier: string,
    action: keyof typeof this.DEFAULT_LIMITS
  ): Promise<RateLimitInfo> {
    const config = this.DEFAULT_LIMITS[action];
    const key = this.getKey(identifier, action);
    const now = Date.now();

    try {
      // Get current window data
      const windowData = await this.getWindowData(key, now, config);
      const { requestCount, windowStart } = windowData;

      // Calculate remaining requests and reset time
      const remaining = Math.max(0, config.maxRequests - requestCount);
      const reset = windowStart + config.windowMs;

      // Log if limit is exceeded
      if (remaining === 0) {
        await this.logger.warn('Rate limit exceeded', {
          identifier,
          action,
          requestCount,
          limit: config.maxRequests,
        });
      }

      return {
        remaining,
        reset,
        total: config.maxRequests,
      };
    } catch (error) {
      await this.logger.error('Error checking rate limit', error as Error, {
        identifier,
        action,
      });
      // In case of error, allow the request but log it
      return {
        remaining: 1,
        reset: now + config.windowMs,
        total: config.maxRequests,
      };
    }
  }

  /**
   * Increment the request count for a given identifier and action
   */
  public async incrementCounter(
    identifier: string,
    action: keyof typeof this.DEFAULT_LIMITS
  ): Promise<void> {
    const key = this.getKey(identifier, action);
    const now = Date.now();

    try {
      await this.redis.zadd(key, { score: now, member: now.toString() });
    } catch (error) {
      await this.logger.error('Error incrementing rate limit counter', error as Error, {
        identifier,
        action,
      });
    }
  }

  /**
   * Get the current window data for rate limiting
   */
  private async getWindowData(
    key: string,
    now: number,
    config: RateLimitConfig
  ): Promise<{ requestCount: number; windowStart: number }> {
    const windowStart = now - config.windowMs;

    // Remove old entries
    await this.redis.zremrangebyscore(key, 0, windowStart);

    // Get current count
    const requestCount = await this.redis.zcount(key, windowStart, now);

    // Set expiry on the key
    await this.redis.expire(key, Math.ceil(config.windowMs / 1000) * 2);

    return { requestCount, windowStart };
  }

  /**
   * Generate Redis key for rate limiting
   */
  private getKey(identifier: string, action: string): string {
    return `${this.KEY_PREFIX}:${action}:${identifier}`;
  }

  /**
   * Reset rate limit for a given identifier and action
   */
  public async resetLimit(
    identifier: string,
    action: keyof typeof this.DEFAULT_LIMITS
  ): Promise<void> {
    const key = this.getKey(identifier, action);
    try {
      await this.redis.del(key);
      await this.logger.info('Rate limit reset', { identifier, action });
    } catch (error) {
      await this.logger.error('Error resetting rate limit', error as Error, {
        identifier,
        action,
      });
    }
  }
} 