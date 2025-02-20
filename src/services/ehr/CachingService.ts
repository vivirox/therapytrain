import { EventEmitter } from 'events';
import { HIPAACompliantAuditService } from '../HIPAACompliantAuditService';
import { SecurityAuditService } from '../SecurityAuditService';
import { QualityMetricsService } from '../QualityMetricsService';

interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt?: number;
  lastAccessed: number;
}

interface CacheConfig {
  strategy: 'lru' | 'ttl' | 'both';
  maxSize?: number;
  ttl?: number; // Time-to-live in milliseconds
  namespace?: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

export class CachingService extends EventEmitter {
  private caches: Map<string, Map<string, CacheEntry<any>>>;
  private readonly DEFAULT_MAX_SIZE = 1000;
  private readonly DEFAULT_TTL = 3600000; // 1 hour in milliseconds
  private stats: Map<string, CacheStats>;

  constructor(
    private readonly hipaaAuditService: HIPAACompliantAuditService,
    private readonly securityAuditService: SecurityAuditService,
    private readonly qualityMetricsService: QualityMetricsService
  ) {
    super();
    this.caches = new Map();
    this.stats = new Map();
    this.startMaintenanceLoop();
  }

  async configure(namespace: string, config: CacheConfig): Promise<void> {
    const cache = new Map<string, CacheEntry<any>>();
    this.caches.set(namespace, cache);

    this.stats.set(namespace, {
      hits: 0,
      misses: 0,
      size: 0,
      maxSize: config.maxSize || this.DEFAULT_MAX_SIZE,
      hitRate: 0,
    });

    await this.hipaaAuditService.logEvent({
      eventType: 'SYSTEM_OPERATION',
      action: {
        type: 'CREATE',
        status: 'SUCCESS',
        details: {
          operation: 'CONFIGURE_CACHE',
          namespace,
          config,
        },
      },
    });

    await this.qualityMetricsService.recordMetric('cache_configured', {
      namespace,
      strategy: config.strategy,
      maxSize: config.maxSize || this.DEFAULT_MAX_SIZE,
      ttl: config.ttl || this.DEFAULT_TTL,
    });

    this.emit('configured', { namespace, config });
  }

  async set<T>(
    namespace: string,
    key: string,
    value: T,
    config?: Partial<CacheConfig>
  ): Promise<void> {
    const cache = this.getOrCreateCache(namespace);
    const stats = this.getOrCreateStats(namespace);
    const entry: CacheEntry<T> = {
      key,
      value,
      lastAccessed: Date.now(),
    };

    if (config?.ttl || this.shouldUseTTL(namespace)) {
      entry.expiresAt = Date.now() + (config?.ttl || this.DEFAULT_TTL);
    }

    cache.set(key, entry);
    stats.size = cache.size;

    if (this.shouldUseLRU(namespace) && cache.size > stats.maxSize) {
      this.evictLRU(namespace);
    }

    await this.qualityMetricsService.recordMetric('cache_set', {
      namespace,
      key,
      ttl: entry.expiresAt ? entry.expiresAt - Date.now() : undefined,
    });

    this.emit('set', { namespace, key });
  }

  async get<T>(namespace: string, key: string): Promise<T | null> {
    const cache = this.getOrCreateCache(namespace);
    const stats = this.getOrCreateStats(namespace);
    const entry = cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      stats.misses++;
      this.updateHitRate(namespace);
      
      await this.qualityMetricsService.recordMetric('cache_miss', {
        namespace,
        key,
      });

      this.emit('miss', { namespace, key });
      return null;
    }

    if (this.isExpired(entry)) {
      cache.delete(key);
      stats.size = cache.size;
      stats.misses++;
      this.updateHitRate(namespace);

      await this.qualityMetricsService.recordMetric('cache_expired', {
        namespace,
        key,
      });

      this.emit('expired', { namespace, key });
      return null;
    }

    entry.lastAccessed = Date.now();
    stats.hits++;
    this.updateHitRate(namespace);

    await this.qualityMetricsService.recordMetric('cache_hit', {
      namespace,
      key,
    });

    this.emit('hit', { namespace, key });
    return entry.value;
  }

  async invalidate(namespace: string, key: string): Promise<void> {
    const cache = this.getOrCreateCache(namespace);
    const stats = this.getOrCreateStats(namespace);

    if (cache.delete(key)) {
      stats.size = cache.size;

      await this.hipaaAuditService.logEvent({
        eventType: 'SYSTEM_OPERATION',
        action: {
          type: 'DELETE',
          status: 'SUCCESS',
          details: {
            operation: 'INVALIDATE_CACHE',
            namespace,
            key,
          },
        },
      });

      await this.qualityMetricsService.recordMetric('cache_invalidated', {
        namespace,
        key,
      });

      this.emit('invalidated', { namespace, key });
    }
  }

  async clear(namespace: string): Promise<void> {
    const cache = this.getOrCreateCache(namespace);
    const stats = this.getOrCreateStats(namespace);

    cache.clear();
    stats.size = 0;

    await this.hipaaAuditService.logEvent({
      eventType: 'SYSTEM_OPERATION',
      action: {
        type: 'DELETE',
        status: 'SUCCESS',
        details: {
          operation: 'CLEAR_CACHE',
          namespace,
        },
      },
    });

    await this.qualityMetricsService.recordMetric('cache_cleared', {
      namespace,
    });

    this.emit('cleared', { namespace });
  }

  getStats(namespace: string): CacheStats | null {
    return this.stats.get(namespace) || null;
  }

  private getOrCreateCache(namespace: string): Map<string, CacheEntry<any>> {
    let cache = this.caches.get(namespace);
    if (!cache) {
      cache = new Map();
      this.caches.set(namespace, cache);
    }
    return cache;
  }

  private getOrCreateStats(namespace: string): CacheStats {
    let stats = this.stats.get(namespace);
    if (!stats) {
      stats = {
        hits: 0,
        misses: 0,
        size: 0,
        maxSize: this.DEFAULT_MAX_SIZE,
        hitRate: 0,
      };
      this.stats.set(namespace, stats);
    }
    return stats;
  }

  private shouldUseLRU(namespace: string): boolean {
    const cache = this.caches.get(namespace);
    return cache !== undefined && ['lru', 'both'].includes(cache.get('config')?.value?.strategy);
  }

  private shouldUseTTL(namespace: string): boolean {
    const cache = this.caches.get(namespace);
    return cache !== undefined && ['ttl', 'both'].includes(cache.get('config')?.value?.strategy);
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return entry.expiresAt !== undefined && Date.now() >= entry.expiresAt;
  }

  private evictLRU(namespace: string): void {
    const cache = this.getOrCreateCache(namespace);
    let oldest: CacheEntry<any> | null = null;
    let oldestKey: string | null = null;

    for (const [key, entry] of cache.entries()) {
      if (!oldest || entry.lastAccessed < oldest.lastAccessed) {
        oldest = entry;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      cache.delete(oldestKey);
      const stats = this.getOrCreateStats(namespace);
      stats.size = cache.size;

      this.emit('evicted', { namespace, key: oldestKey });
    }
  }

  private updateHitRate(namespace: string): void {
    const stats = this.getOrCreateStats(namespace);
    const total = stats.hits + stats.misses;
    stats.hitRate = total > 0 ? stats.hits / total : 0;
  }

  private startMaintenanceLoop(): void {
    setInterval(() => {
      for (const [namespace, cache] of this.caches.entries()) {
        for (const [key, entry] of cache.entries()) {
          if (this.isExpired(entry)) {
            this.invalidate(namespace, key).catch(error => {
              this.securityAuditService.recordAlert(
                'CACHE_MAINTENANCE_ERROR',
                'LOW',
                {
                  namespace,
                  key,
                  error: error.message,
                }
              );
            });
          }
        }
      }
    }, 60000); // Run maintenance every minute
  }
} 