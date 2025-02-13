import * as Sentry from '@sentry/nextjs';
import { getRedisClient } from '@/lib/redis';
import { cacheConfig, getMonitoringConfig, getPerformanceThreshold } from '@/config/cache.config';
import { EventEmitter } from 'events';
import { NotificationService } from './NotificationService';

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  latency: number[];
  avgLatency: number;
  invalidations: number;
  memoryUsage: number;
  keyCount: number;
  errorCount: number;
  timestamp: string;
}

export interface CacheAlert {
  type: 'hitRate' | 'latency' | 'errorRate' | 'memory' | 'memoryUsage';
  value: number;
  threshold: number;
  timestamp: string;
}

export class CacheMonitoringService extends EventEmitter {
  private static instance: CacheMonitoringService;
  private metrics: CacheMetrics;
  private alerts: CacheAlert[];
  private metricsHistory: CacheMetrics[];
  private monitoringInterval: NodeJS.Timer | null;
  private notificationService: NotificationService;

  private constructor() {
    super();
    this.metrics = this.getInitialMetrics();
    this.alerts = [];
    this.metricsHistory = [];
    this.monitoringInterval = null;
    this.notificationService = NotificationService.getInstance();

    this.setupMonitoring();
    this.setupEventHandlers();
  }

  public static getInstance(): CacheMonitoringService {
    if (!CacheMonitoringService.instance) {
      CacheMonitoringService.instance = new CacheMonitoringService();
    }
    return CacheMonitoringService.instance;
  }

  private async setupMonitoring(): Promise<void> {
    const config = getMonitoringConfig();
    if (!config.enabled) return;

    // Set up metrics collection interval
    this.monitoringInterval = setInterval(
      () => this.collectMetrics(),
      config.metrics.collection.interval
    );

    // Listen for cache events
    this.on('hit', this.handleHit.bind(this));
    this.on('miss', this.handleMiss.bind(this));
    this.on('error', this.handleError.bind(this));
    this.on('latency', this.handleLatency.bind(this));
    this.on('invalidation', this.handleInvalidation.bind(this));
  }

  private async collectMetrics(): Promise<void> {
    try {
      const redis = getRedisClient();
      
      // Get Redis info
      const info = await redis.info();
      const memory = this.parseRedisInfo(info);
      
      // Get current key count
      const keyCount = await redis.dbsize();

      // Update metrics
      this.metrics.memoryUsage = memory.used_memory;
      this.metrics.keyCount = keyCount;
      
      // Calculate averages
      this.metrics.hitRate = this.metrics.hits / (this.metrics.hits + this.metrics.misses) || 1;
      this.metrics.avgLatency = this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length || 0;

      // Store metrics history
      this.metricsHistory.push({ ...this.metrics });
      if (this.metricsHistory.length > cacheConfig.redis.performance.metricsHistoryLength) {
        this.metricsHistory.shift();
      }

      // Check thresholds and generate alerts
      this.checkThresholds();

      // Report to Sentry if enabled
      if (process.env.SENTRY_DSN) {
        Sentry.setContext('cache_metrics', {
          ...this.metrics,
          alerts: this.alerts.length,
        });
      }
    } catch (error) {
      console.error('Error collecting cache metrics:', error);
      this.handleError(error);
    }
  }

  private async checkThresholds(): Promise<void> {
    const newAlerts: CacheAlert[] = [];

    // Check hit rate
    if (this.metrics.hitRate < 0.8) {
      const alert: CacheAlert = {
        type: 'hitRate',
        value: this.metrics.hitRate,
        threshold: 0.8,
        timestamp: new Date().toISOString(),
      };
      newAlerts.push(alert);
      await this.notificationService.notify(alert);
    }

    // Check error rate
    const errorRate = this.metrics.errorCount / (this.metrics.hits + this.metrics.misses);
    if (errorRate > 0.05) {
      const alert: CacheAlert = {
        type: 'errorRate',
        value: errorRate,
        threshold: 0.05,
        timestamp: new Date().toISOString(),
      };
      newAlerts.push(alert);
      await this.notificationService.notify(alert);
    }

    // Check latency
    if (this.metrics.avgLatency > 100) {
      const alert: CacheAlert = {
        type: 'latency',
        value: this.metrics.avgLatency,
        threshold: 100,
        timestamp: new Date().toISOString(),
      };
      newAlerts.push(alert);
      await this.notificationService.notify(alert);
    }

    // Check memory usage (in MB)
    const memoryUsageMB = this.metrics.memoryUsage / 1024 / 1024;
    if (memoryUsageMB > 500) {
      const alert: CacheAlert = {
        type: 'memory',
        value: memoryUsageMB,
        threshold: 500,
        timestamp: new Date().toISOString(),
      };
      newAlerts.push(alert);
      await this.notificationService.notify(alert);
    }

    // Update alerts list with new alerts
    this.alerts = [...this.alerts, ...newAlerts];
  }

  private parseRedisInfo(info: string): { used_memory: number } {
    const used_memory = parseInt(info.match(/used_memory:(\d+)/)?.[1] || '0');
    return { used_memory };
  }

  // Event handlers
  private handleHit(): void {
    this.metrics.hits++;
  }

  private handleMiss(): void {
    this.metrics.misses++;
  }

  private handleError(error: Error): void {
    this.metrics.errorCount++;
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error);
    }
  }

  private handleLatency(latency: number): void {
    this.metrics.latency.push(latency);
    if (this.metrics.latency.length > cacheConfig.redis.performance.metricsHistoryLength) {
      this.metrics.latency.shift();
    }
  }

  private handleInvalidation(): void {
    this.metrics.invalidations++;
  }

  // Public methods for accessing metrics
  public getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  public getAlerts(): CacheAlert[] {
    return [...this.alerts];
  }

  public getMetricsHistory(): CacheMetrics[] {
    return [...this.metricsHistory];
  }

  public clearAlerts(): void {
    this.alerts = [];
    this.notificationService.clearNotificationHistory();
  }

  public on(event: string, handler: (...args: any[]) => void): void {
    super.on(event, handler);
  }

  public off(event: string, handler: (...args: any[]) => void): void {
    super.off(event, handler);
  }

  public async getRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    const metrics = this.getMetrics();

    // Hit rate recommendations
    if (metrics.hitRate < getPerformanceThreshold('minHitRate')) {
      recommendations.push('Consider increasing cache TTLs or reviewing cache invalidation strategy');
    }

    // Latency recommendations
    if (metrics.avgLatency > getPerformanceThreshold('maxLatency')) {
      recommendations.push('High cache latency detected. Consider reviewing network configuration or Redis instance size');
    }

    // Memory usage recommendations
    const memoryUsageRatio = metrics.memoryUsage / cacheConfig.redis.memory.maxMemoryBytes;
    if (memoryUsageRatio > cacheConfig.redis.memory.warningThreshold) {
      recommendations.push('High memory usage. Consider increasing cache size or implementing more aggressive eviction');
    }

    // Invalidation recommendations
    const invalidationRate = metrics.invalidations / (metrics.hits + metrics.misses);
    if (invalidationRate > getPerformanceThreshold('maxInvalidationRate')) {
      recommendations.push('High cache invalidation rate. Review cache invalidation patterns');
    }

    return recommendations;
  }

  public destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.removeAllListeners();
  }
} 