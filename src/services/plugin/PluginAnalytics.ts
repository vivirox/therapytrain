import { singleton } from '@/lib/decorators';
import { EventEmitter } from 'events';
import { Logger } from '@/lib/logger';
import { MetricsService } from '@/services/MetricsService';
import { RedisService } from '@/services/RedisService';

interface PluginMetrics {
  invocations: number;
  errors: number;
  avgExecutionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  networkRequests: number;
  lastUsed: Date;
  errorRate: number;
  popularity: number;
}

interface PluginUsageStats {
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  totalInstalls: number;
  avgRating: number;
  totalRatings: number;
  errorRate: number;
  avgResponseTime: number;
  resourceUsage: {
    memory: number;
    cpu: number;
    network: number;
  };
}

interface PluginAlert {
  type: 'error' | 'performance' | 'usage';
  severity: 'info' | 'warning' | 'error';
  message: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

@singleton()
export class PluginAnalytics extends EventEmitter {
  private static instance: PluginAnalytics;
  private readonly logger: Logger;
  private readonly metrics: MetricsService;
  private readonly redis: RedisService;
  private readonly pluginMetrics: Map<string, PluginMetrics>;
  private readonly METRICS_TTL = 30 * 24 * 60 * 60; // 30 days

  constructor() {
    super();
    this.logger = new Logger();
    this.metrics = MetricsService.getInstance();
    this.redis = RedisService.getInstance();
    this.pluginMetrics = new Map();

    this.startMetricsAggregation();
  }

  public static getInstance(): PluginAnalytics {
    if (!PluginAnalytics.instance) {
      PluginAnalytics.instance = new PluginAnalytics();
    }
    return PluginAnalytics.instance;
  }

  public async recordExecution(
    pluginId: string,
    duration: number,
    resourceUsage: {
      memory: number;
      cpu: number;
      networkRequests: number;
    }
  ): Promise<void> {
    try {
      const now = new Date();
      const key = `plugin:metrics:${pluginId}:${now.toISOString().split('T')[0]}`;

      // Update real-time metrics
      let metrics = this.pluginMetrics.get(pluginId);
      if (!metrics) {
        metrics = {
          invocations: 0,
          errors: 0,
          avgExecutionTime: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          networkRequests: 0,
          lastUsed: now,
          errorRate: 0,
          popularity: 0
        };
        this.pluginMetrics.set(pluginId, metrics);
      }

      // Update metrics
      metrics.invocations++;
      metrics.avgExecutionTime = (metrics.avgExecutionTime * (metrics.invocations - 1) + duration) / metrics.invocations;
      metrics.memoryUsage = resourceUsage.memory;
      metrics.cpuUsage = resourceUsage.cpu;
      metrics.networkRequests += resourceUsage.networkRequests;
      metrics.lastUsed = now;

      // Store in Redis
      await this.redis.hincrby(key, 'invocations', 1);
      await this.redis.hincrby(key, 'totalDuration', duration);
      await this.redis.hset(key, {
        memoryUsage: resourceUsage.memory,
        cpuUsage: resourceUsage.cpu,
        networkRequests: resourceUsage.networkRequests
      });
      await this.redis.expire(key, this.METRICS_TTL);

      // Record to metrics service
      await this.metrics.recordMetric('plugin_execution', {
        pluginId,
        duration,
        ...resourceUsage
      });

      // Check for alerts
      await this.checkAlerts(pluginId, metrics);
    } catch (error) {
      this.logger.error('Error recording plugin execution:', error);
    }
  }

  public async recordError(
    pluginId: string,
    error: Error,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      const now = new Date();
      const key = `plugin:errors:${pluginId}:${now.toISOString().split('T')[0]}`;

      // Update metrics
      const metrics = this.pluginMetrics.get(pluginId);
      if (metrics) {
        metrics.errors++;
        metrics.errorRate = metrics.errors / metrics.invocations;
      }

      // Store error in Redis
      await this.redis.rpush(key, JSON.stringify({
        message: error.message,
        stack: error.stack,
        timestamp: now.toISOString(),
        metadata
      }));
      await this.redis.expire(key, this.METRICS_TTL);

      // Record to metrics service
      await this.metrics.recordMetric('plugin_error', {
        pluginId,
        error: error.message,
        ...metadata
      });

      // Emit alert
      this.emit('alert', {
        type: 'error',
        severity: 'error',
        message: `Plugin ${pluginId} error: ${error.message}`,
        timestamp: now,
        metadata: {
          pluginId,
          error: error.message,
          stack: error.stack,
          ...metadata
        }
      } as PluginAlert);
    } catch (error) {
      this.logger.error('Error recording plugin error:', error);
    }
  }

  public async getUsageStats(
    pluginId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<PluginUsageStats> {
    const stats: PluginUsageStats = {
      dailyActiveUsers: 0,
      monthlyActiveUsers: 0,
      totalInstalls: 0,
      avgRating: 0,
      totalRatings: 0,
      errorRate: 0,
      avgResponseTime: 0,
      resourceUsage: {
        memory: 0,
        cpu: 0,
        network: 0
      }
    };

    try {
      // Get metrics for date range
      const start = timeRange.start.toISOString().split('T')[0];
      const end = timeRange.end.toISOString().split('T')[0];
      const keys = await this.redis.keys(`plugin:metrics:${pluginId}:*`);

      let totalInvocations = 0;
      let totalDuration = 0;
      let totalErrors = 0;

      for (const key of keys) {
        const date = key.split(':')[3];
        if (date >= start && date <= end) {
          const metrics = await this.redis.hgetall(key);
          if (metrics) {
            totalInvocations += parseInt(metrics.invocations || '0');
            totalDuration += parseInt(metrics.totalDuration || '0');
            totalErrors += parseInt(metrics.errors || '0');
            stats.resourceUsage.memory += parseInt(metrics.memoryUsage || '0');
            stats.resourceUsage.cpu += parseInt(metrics.cpuUsage || '0');
            stats.resourceUsage.network += parseInt(metrics.networkRequests || '0');
          }
        }
      }

      // Calculate averages
      const days = Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24));
      stats.avgResponseTime = totalDuration / totalInvocations || 0;
      stats.errorRate = totalErrors / totalInvocations || 0;
      stats.resourceUsage.memory /= days || 1;
      stats.resourceUsage.cpu /= days || 1;
      stats.resourceUsage.network /= days || 1;

      // Get user stats
      const userKeys = await this.redis.keys(`plugin:users:${pluginId}:*`);
      const monthStart = new Date(timeRange.end);
      monthStart.setMonth(monthStart.getMonth() - 1);

      for (const key of userKeys) {
        const lastUsed = new Date(await this.redis.get(key) || '');
        if (lastUsed >= timeRange.start && lastUsed <= timeRange.end) {
          stats.dailyActiveUsers++;
        }
        if (lastUsed >= monthStart && lastUsed <= timeRange.end) {
          stats.monthlyActiveUsers++;
        }
      }

      // Get install count
      stats.totalInstalls = parseInt(await this.redis.get(`plugin:installs:${pluginId}`) || '0');

      // Get ratings
      const ratings = await this.redis.hgetall(`plugin:ratings:${pluginId}`);
      if (ratings) {
        stats.totalRatings = parseInt(ratings.count || '0');
        stats.avgRating = parseFloat(ratings.average || '0');
      }

      return stats;
    } catch (error) {
      this.logger.error('Error getting plugin usage stats:', error);
      return stats;
    }
  }

  private async checkAlerts(pluginId: string, metrics: PluginMetrics): Promise<void> {
    // Check error rate
    if (metrics.errorRate > 0.1) { // 10% error rate
      this.emit('alert', {
        type: 'error',
        severity: 'warning',
        message: `High error rate (${(metrics.errorRate * 100).toFixed(1)}%) for plugin ${pluginId}`,
        timestamp: new Date(),
        metadata: { pluginId, errorRate: metrics.errorRate }
      } as PluginAlert);
    }

    // Check performance
    if (metrics.avgExecutionTime > 1000) { // 1 second
      this.emit('alert', {
        type: 'performance',
        severity: 'warning',
        message: `High average execution time (${metrics.avgExecutionTime.toFixed(1)}ms) for plugin ${pluginId}`,
        timestamp: new Date(),
        metadata: { pluginId, avgExecutionTime: metrics.avgExecutionTime }
      } as PluginAlert);
    }

    // Check resource usage
    if (metrics.memoryUsage > 256 * 1024 * 1024) { // 256MB
      this.emit('alert', {
        type: 'performance',
        severity: 'warning',
        message: `High memory usage (${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB) for plugin ${pluginId}`,
        timestamp: new Date(),
        metadata: { pluginId, memoryUsage: metrics.memoryUsage }
      } as PluginAlert);
    }

    if (metrics.cpuUsage > 80) { // 80% CPU
      this.emit('alert', {
        type: 'performance',
        severity: 'warning',
        message: `High CPU usage (${metrics.cpuUsage.toFixed(1)}%) for plugin ${pluginId}`,
        timestamp: new Date(),
        metadata: { pluginId, cpuUsage: metrics.cpuUsage }
      } as PluginAlert);
    }
  }

  private startMetricsAggregation(): void {
    // Aggregate metrics every hour
    setInterval(async () => {
      try {
        const now = new Date();
        const hourKey = now.toISOString().split(':')[0];

        for (const [pluginId, metrics] of this.pluginMetrics.entries()) {
          const key = `plugin:metrics:hourly:${pluginId}:${hourKey}`;
          await this.redis.hset(key, {
            invocations: metrics.invocations,
            errors: metrics.errors,
            avgExecutionTime: metrics.avgExecutionTime,
            memoryUsage: metrics.memoryUsage,
            cpuUsage: metrics.cpuUsage,
            networkRequests: metrics.networkRequests,
            errorRate: metrics.errorRate
          });
          await this.redis.expire(key, this.METRICS_TTL);
        }

        // Clear real-time metrics
        this.pluginMetrics.clear();
      } catch (error) {
        this.logger.error('Error aggregating plugin metrics:', error);
      }
    }, 60 * 60 * 1000); // Every hour
  }
} 