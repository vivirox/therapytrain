interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  messages: { maxRequests: 100, windowMs: 60000 }, // 100 messages per minute
  connections: { maxRequests: 10, windowMs: 60000 }, // 10 connections per minute
  history: { maxRequests: 30, windowMs: 60000 }, // 30 history requests per minute
};

export class RateLimiter {
  private counters: Map<string, { count: number; resetTime: number }> = new Map();

  async checkLimit(userId: string, type: string): Promise<{ remaining: number; reset: number; total: number }> {
    const key = `${userId}:${type}`;
    const config = DEFAULT_LIMITS[type];
    
    if (!config) {
      throw new Error(`Unknown rate limit type: ${type}`);
    }

    const now = Date.now();
    const counter = this.counters.get(key);

    // Reset counter if window has passed
    if (!counter || now > counter.resetTime) {
      this.counters.set(key, {
        count: 0,
        resetTime: now + config.windowMs,
      });
      return { remaining: config.maxRequests, reset: now + config.windowMs, total: config.maxRequests };
    }

    const remaining = Math.max(0, config.maxRequests - counter.count);
    return { remaining, reset: counter.resetTime, total: config.maxRequests };
  }

  async incrementCounter(userId: string, type: string): Promise<void> {
    const key = `${userId}:${type}`;
    const counter = this.counters.get(key);
    
    if (counter) {
      counter.count++;
    }
  }
} 