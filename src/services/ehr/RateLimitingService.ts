import { EventEmitter } from 'events';
import { HIPAACompliantAuditService } from '../HIPAACompliantAuditService';
import { SecurityAuditService } from '../SecurityAuditService';
import { QualityMetricsService } from '../QualityMetricsService';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number; // tokens per second
}

interface RateLimitConfig {
  capacity: number;
  refillRate: number;
  provider?: string;
  endpoint?: string;
}

interface RateLimitStatus {
  remaining: number;
  reset: number;
  total: number;
}

export class RateLimitingService extends EventEmitter {
  private buckets: Map<string, TokenBucket>;
  private readonly DEFAULT_CAPACITY = 100;
  private readonly DEFAULT_REFILL_RATE = 10; // tokens per second
  private readonly PROVIDER_LIMITS: Record<string, RateLimitConfig> = {
    epic: { capacity: 300, refillRate: 30 },
    cerner: { capacity: 200, refillRate: 20 },
    allscripts: { capacity: 150, refillRate: 15 },
    athenahealth: { capacity: 250, refillRate: 25 },
  };

  constructor(
    private readonly hipaaAuditService: HIPAACompliantAuditService,
    private readonly securityAuditService: SecurityAuditService,
    private readonly qualityMetricsService: QualityMetricsService
  ) {
    super();
    this.buckets = new Map();
  }

  async configure(key: string, config: RateLimitConfig): Promise<void> {
    const bucket: TokenBucket = {
      tokens: config.capacity,
      lastRefill: Date.now(),
      capacity: config.capacity,
      refillRate: config.refillRate,
    };

    this.buckets.set(key, bucket);

    await this.hipaaAuditService.logEvent({
      eventType: 'SYSTEM_OPERATION',
      action: {
        type: 'CREATE',
        status: 'SUCCESS',
        details: {
          operation: 'CONFIGURE_RATE_LIMIT',
          key,
          config: {
            capacity: config.capacity,
            refillRate: config.refillRate,
            provider: config.provider,
            endpoint: config.endpoint,
          },
        },
      },
    });

    await this.qualityMetricsService.recordMetric('rate_limit_configured', {
      key,
      capacity: config.capacity,
      refillRate: config.refillRate,
      provider: config.provider,
      endpoint: config.endpoint,
    });

    this.emit('configured', { key, config });
  }

  async checkLimit(key: string, tokens: number = 1): Promise<boolean> {
    let bucket = this.buckets.get(key);

    if (!bucket) {
      // Auto-configure with default limits if not configured
      const config = this.getDefaultConfig(key);
      await this.configure(key, config);
      bucket = this.buckets.get(key)!;
    }

    this.refillBucket(bucket);

    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;

      await this.qualityMetricsService.recordMetric('rate_limit_checked', {
        key,
        tokens,
        allowed: true,
        remaining: bucket.tokens,
      });

      return true;
    }

    await this.handleRateLimitExceeded(key, tokens, bucket);
    return false;
  }

  getStatus(key: string): RateLimitStatus | null {
    const bucket = this.buckets.get(key);
    if (!bucket) {
      return null;
    }

    this.refillBucket(bucket);

    return {
      remaining: Math.floor(bucket.tokens),
      reset: Math.ceil((bucket.capacity - bucket.tokens) / bucket.refillRate),
      total: bucket.capacity,
    };
  }

  private getDefaultConfig(key: string): RateLimitConfig {
    // Check if key contains a provider name
    const providerMatch = key.match(/^(epic|cerner|allscripts|athenahealth)/i);
    if (providerMatch) {
      const provider = providerMatch[1].toLowerCase();
      return this.PROVIDER_LIMITS[provider] || {
        capacity: this.DEFAULT_CAPACITY,
        refillRate: this.DEFAULT_REFILL_RATE,
      };
    }

    return {
      capacity: this.DEFAULT_CAPACITY,
      refillRate: this.DEFAULT_REFILL_RATE,
    };
  }

  private refillBucket(bucket: TokenBucket): void {
    const now = Date.now();
    const timePassed = (now - bucket.lastRefill) / 1000; // Convert to seconds
    const tokensToAdd = timePassed * bucket.refillRate;

    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  private async handleRateLimitExceeded(
    key: string,
    tokens: number,
    bucket: TokenBucket
  ): Promise<void> {
    await this.hipaaAuditService.logEvent({
      eventType: 'SYSTEM_OPERATION',
      action: {
        type: 'SECURITY',
        status: 'WARNING',
        details: {
          operation: 'RATE_LIMIT_EXCEEDED',
          key,
          requested: tokens,
          available: bucket.tokens,
        },
      },
    });

    await this.securityAuditService.recordAlert(
      'RATE_LIMIT_EXCEEDED',
      'MEDIUM',
      {
        key,
        requested: tokens,
        available: bucket.tokens,
        capacity: bucket.capacity,
        refillRate: bucket.refillRate,
      }
    );

    await this.qualityMetricsService.recordMetric('rate_limit_exceeded', {
      key,
      tokens,
      available: bucket.tokens,
      capacity: bucket.capacity,
    });

    this.emit('limitExceeded', {
      key,
      requested: tokens,
      available: bucket.tokens,
      reset: Math.ceil((bucket.capacity - bucket.tokens) / bucket.refillRate),
    });
  }

  async removeLimit(key: string): Promise<void> {
    if (!this.buckets.has(key)) {
      throw new Error(`Rate limit for ${key} not found`);
    }

    this.buckets.delete(key);

    await this.hipaaAuditService.logEvent({
      eventType: 'SYSTEM_OPERATION',
      action: {
        type: 'DELETE',
        status: 'SUCCESS',
        details: {
          operation: 'REMOVE_RATE_LIMIT',
          key,
        },
      },
    });

    await this.qualityMetricsService.recordMetric('rate_limit_removed', {
      key,
    });

    this.emit('removed', { key });
  }
} 