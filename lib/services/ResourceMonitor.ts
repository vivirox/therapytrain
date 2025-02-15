import { Redis } from '@upstash/redis';
import { Logger } from '../logger';
import os from 'os';

interface SystemMetrics {
  cpu: {
    usage: number;
    loadAvg: number[];
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  network: {
    connections: number;
    bytesReceived: number;
    bytesSent: number;
  };
  process: {
    uptime: number;
    requests: number;
    errors: number;
    responseTime: number;
  };
}

interface ResourceThresholds {
  cpu: {
    warning: number;
    critical: number;
  };
  memory: {
    warning: number;
    critical: number;
  };
  responseTime: {
    warning: number;
    critical: number;
  };
}

export class ResourceMonitor {
  private static instance: ResourceMonitor;
  private redis: Redis;
  private logger: Logger;
  private readonly METRICS_KEY = 'metrics:system';
  private readonly COLLECTION_INTERVAL = 60000; // 1 minute
  private readonly RETENTION_PERIOD = 86400; // 24 hours
  private collectionInterval?: NodeJS.Timeout;

  private readonly thresholds: ResourceThresholds = {
    cpu: {
      warning: 70, // 70% CPU usage
      critical: 85, // 85% CPU usage
    },
    memory: {
      warning: 75, // 75% memory usage
      critical: 90, // 90% memory usage
    },
    responseTime: {
      warning: 1000, // 1 second
      critical: 3000, // 3 seconds
    },
  };

  private constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ResourceMonitor {
    if (!ResourceMonitor.instance) {
      ResourceMonitor.instance = new ResourceMonitor();
    }
    return ResourceMonitor.instance;
  }

  /**
   * Start collecting metrics
   */
  public startMonitoring(): void {
    this.collectMetrics();
    this.collectionInterval = setInterval(
      () => this.collectMetrics(),
      this.COLLECTION_INTERVAL
    );
  }

  /**
   * Stop collecting metrics
   */
  public stopMonitoring(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }
  }

  /**
   * Collect current system metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const metrics = await this.gatherMetrics();
      const timestamp = Date.now();

      // Store metrics in Redis with timestamp
      await this.redis.zadd(this.METRICS_KEY, {
        score: timestamp,
        member: JSON.stringify(metrics),
      });

      // Remove old metrics
      const cutoff = timestamp - (this.RETENTION_PERIOD * 1000);
      await this.redis.zremrangebyscore(this.METRICS_KEY, 0, cutoff);

      // Check thresholds and log warnings
      await this.checkThresholds(metrics);
    } catch (error) {
      await this.logger.error('Error collecting metrics', error as Error);
    }
  }

  /**
   * Gather current system metrics
   */
  private async gatherMetrics(): Promise<SystemMetrics> {
    const cpuUsage = await this.getCPUUsage();
    const memUsage = process.memoryUsage();
    const networkStats = await this.getNetworkStats();
    const processStats = await this.getProcessStats();

    return {
      cpu: {
        usage: cpuUsage,
        loadAvg: os.loadavg(),
        cores: os.cpus().length,
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
      },
      network: networkStats,
      process: processStats,
    };
  }

  /**
   * Get CPU usage percentage
   */
  private async getCPUUsage(): Promise<number> {
    const startUsage = process.cpuUsage();
    await new Promise(resolve => setTimeout(resolve, 100));
    const endUsage = process.cpuUsage(startUsage);
    const totalUsage = (endUsage.user + endUsage.system) / 1000000; // Convert to seconds
    return (totalUsage * 100) / os.cpus().length;
  }

  /**
   * Get network statistics
   */
  private async getNetworkStats(): Promise<SystemMetrics['network']> {
    const connections = await this.redis.get<number>('metrics:activeConnections') || 0;
    const bytesReceived = await this.redis.get<number>('metrics:bytesReceived') || 0;
    const bytesSent = await this.redis.get<number>('metrics:bytesSent') || 0;

    return {
      connections,
      bytesReceived,
      bytesSent,
    };
  }

  /**
   * Get process statistics
   */
  private async getProcessStats(): Promise<SystemMetrics['process']> {
    const requests = await this.redis.get<number>('metrics:totalRequests') || 0;
    const errors = await this.redis.get<number>('metrics:totalErrors') || 0;
    const responseTime = await this.redis.get<number>('metrics:averageResponseTime') || 0;

    return {
      uptime: process.uptime(),
      requests,
      errors,
      responseTime,
    };
  }

  /**
   * Check metrics against thresholds
   */
  private async checkThresholds(metrics: SystemMetrics): Promise<void> {
    // Check CPU usage
    if (metrics.cpu.usage >= this.thresholds.cpu.critical) {
      await this.logger.error('Critical CPU usage', new Error('CPU usage exceeded critical threshold'), {
        usage: metrics.cpu.usage,
        threshold: this.thresholds.cpu.critical,
      });
    } else if (metrics.cpu.usage >= this.thresholds.cpu.warning) {
      await this.logger.warn('High CPU usage', {
        usage: metrics.cpu.usage,
        threshold: this.thresholds.cpu.warning,
      });
    }

    // Check memory usage
    const memoryUsagePercent = (metrics.memory.used / metrics.memory.total) * 100;
    if (memoryUsagePercent >= this.thresholds.memory.critical) {
      await this.logger.error('Critical memory usage', new Error('Memory usage exceeded critical threshold'), {
        usage: memoryUsagePercent,
        threshold: this.thresholds.memory.critical,
      });
    } else if (memoryUsagePercent >= this.thresholds.memory.warning) {
      await this.logger.warn('High memory usage', {
        usage: memoryUsagePercent,
        threshold: this.thresholds.memory.warning,
      });
    }

    // Check response time
    if (metrics.process.responseTime >= this.thresholds.responseTime.critical) {
      await this.logger.error('Critical response time', new Error('Response time exceeded critical threshold'), {
        time: metrics.process.responseTime,
        threshold: this.thresholds.responseTime.critical,
      });
    } else if (metrics.process.responseTime >= this.thresholds.responseTime.warning) {
      await this.logger.warn('High response time', {
        time: metrics.process.responseTime,
        threshold: this.thresholds.responseTime.warning,
      });
    }
  }

  /**
   * Get metrics for a specific time range
   */
  public async getMetrics(
    start: number = Date.now() - (3600 * 1000), // Last hour by default
    end: number = Date.now()
  ): Promise<SystemMetrics[]> {
    try {
      const data = await this.redis.zrange(
        this.METRICS_KEY,
        start,
        end
      ) as string[];

      return data.map(item => JSON.parse(item) as SystemMetrics);
    } catch (error) {
      await this.logger.error('Error fetching metrics', error as Error);
      return [];
    }
  }

  /**
   * Get the latest metrics
   */
  public async getLatestMetrics(): Promise<SystemMetrics | null> {
    try {
      const data = await this.redis.zrange(
        this.METRICS_KEY,
        -1,
        -1
      ) as string[];

      return data.length > 0 ? JSON.parse(data[0]) as SystemMetrics : null;
    } catch (error) {
      await this.logger.error('Error fetching latest metrics', error as Error);
      return null;
    }
  }

  /**
   * Track request metrics
   */
  public async trackRequest(duration: number): Promise<void> {
    try {
      await Promise.all([
        this.redis.incr('metrics:totalRequests'),
        this.updateAverageResponseTime(duration),
      ]);
    } catch (error) {
      await this.logger.error('Error tracking request metrics', error as Error);
    }
  }

  /**
   * Track error metrics
   */
  public async trackError(): Promise<void> {
    try {
      await this.redis.incr('metrics:totalErrors');
    } catch (error) {
      await this.logger.error('Error tracking error metrics', error as Error);
    }
  }

  /**
   * Update average response time
   */
  private async updateAverageResponseTime(duration: number): Promise<void> {
    try {
      const currentAvg = await this.redis.get<number>('metrics:averageResponseTime') || 0;
      const totalRequests = await this.redis.get<number>('metrics:totalRequests') || 1;
      const newAvg = ((currentAvg * (totalRequests - 1)) + duration) / totalRequests;
      await this.redis.set('metrics:averageResponseTime', newAvg);
    } catch (error) {
      await this.logger.error('Error updating average response time', error as Error);
    }
  }
} 