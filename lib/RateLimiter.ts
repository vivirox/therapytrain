/**
 * Simple in-memory rate limiter
 */
interface RateLimitInfo {
  remaining: number;
  reset: number;
  total: number;
}

interface UserLimits {
  [key: string]: {
    count: number;
    lastReset: number;
  };
}

export class RateLimiter {
  private limits: Map<string, UserLimits> = new Map();
  
  // Default limits for different operations
  private defaultLimits = {
    'messages': 100,    // 100 messages per hour
    'history': 500,     // 500 history requests per hour
    'connections': 20   // 20 new connections per hour
  };
  
  private readonly RESET_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
  
  /**
   * Check if a user has exceeded their rate limit for a specific action type
   */
  async checkLimit(userId: string, actionType: string): Promise<RateLimitInfo> {
    const now = Date.now();
    
    // Get or initialize user limits
    if (!this.limits.has(userId)) {
      this.limits.set(userId, {});
    }
    
    const userLimits = this.limits.get(userId)!;
    
    // Initialize action type if needed
    if (!userLimits[actionType]) {
      userLimits[actionType] = {
        count: 0,
        lastReset: now
      };
    }
    
    const limitInfo = userLimits[actionType];
    const totalLimit = this.defaultLimits[actionType] || 100;
    
    // Check if we need to reset based on time elapsed
    if (now - limitInfo.lastReset >= this.RESET_INTERVAL) {
      limitInfo.count = 0;
      limitInfo.lastReset = now;
    }
    
    // Calculate time until reset
    const resetTime = limitInfo.lastReset + this.RESET_INTERVAL;
    
    return {
      remaining: Math.max(0, totalLimit - limitInfo.count),
      reset: Math.ceil((resetTime - now) / 1000), // Seconds until reset
      total: totalLimit
    };
  }
  
  /**
   * Increment the counter for a specific action
   */
  async incrementCounter(userId: string, actionType: string): Promise<void> {
    if (!this.limits.has(userId)) {
      this.limits.set(userId, {});
    }
    
    const userLimits = this.limits.get(userId)!;
    
    if (!userLimits[actionType]) {
      userLimits[actionType] = {
        count: 0,
        lastReset: Date.now()
      };
    }
    
    userLimits[actionType].count++;
  }
}