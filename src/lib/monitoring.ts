import { collectDefaultMetrics, register } from 'prom-client';
import * as metrics from './metrics';
import { logger } from './logger';
import { MetricsService } from './metrics';

class Monitoring {
  private static instance: Monitoring;
  private metricsInterval: NodeJS.Timer | null = null;

  private constructor() {
    // Enable default metrics collection
    collectDefaultMetrics({ register });
  }

  public static getInstance(): Monitoring {
    if (!Monitoring.instance) {
      Monitoring.instance = new Monitoring();
    }
    return Monitoring.instance;
  }

  public startMetricsCollection(interval = 10000): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    this.metricsInterval = setInterval(() => {
      try {
        // Collect system metrics
        const memUsage = process.memoryUsage();
        metrics.systemMemoryUsage.set(memUsage.heapUsed);

        const cpuUsage = process.cpuUsage();
        const totalCpuTime = cpuUsage.user + cpuUsage.system;
        metrics.systemCpuUsage.set(totalCpuTime / 1000000); // Convert to seconds

        // Log metrics for debugging
        logger.debug('System metrics collected', {
          memoryUsage: memUsage.heapUsed,
          cpuUsage: totalCpuTime,
        });
      } catch (error) {
        logger.error('Error collecting metrics', { error });
      }
    }, interval);
  }

  public stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  public async getMetrics(): Promise<string> {
    try {
      return await register.metrics();
    } catch (error) {
      logger.error('Error getting metrics', { error });
      throw error;
    }
  }

  public recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    metrics.httpRequestsTotal.inc({ method, route, code: statusCode.toString() });
    metrics.httpRequestDurationMicroseconds.observe(
      { method, route, code: statusCode.toString() },
      duration
    );
  }

  public recordDatabaseQuery(operation: string, table: string, duration: number): void {
    metrics.databaseQueryDuration.observe({ operation, table }, duration);
  }

  public recordError(type: string, code: string): void {
    metrics.errorCount.inc({ type, code });
    logger.error('Application error recorded', { type, code });
  }

  public updateActiveConnections(count: number): void {
    metrics.activeConnections.set(count);
  }

  public recordCacheOperation(cache: string, hit: boolean): void {
    if (hit) {
      metrics.cacheHits.inc({ cache });
    } else {
      metrics.cacheMisses.inc({ cache });
    }
  }

  public recordTransaction(type: string, status: string): void {
    metrics.transactionCount.inc({ type, status });
  }
}

export const monitoring = Monitoring.getInstance();

export class ResourceMonitor {
  private metrics: MetricsService;
  private activeRequests: Map<string, number> = new Map();
  private maxConcurrentRequests: number = 50;

  constructor() {
    this.metrics = new MetricsService();
  }

  async startRequest(requestId: string): Promise<void> {
    this.activeRequests.set(requestId, Date.now());
    this.metrics.setGauge('active_connections', this.activeRequests.size);
  }

  async endRequest(requestId: string): Promise<void> {
    const startTime = this.activeRequests.get(requestId);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.metrics.timing('http_request_duration', duration);
      this.activeRequests.delete(requestId);
      this.metrics.setGauge('active_connections', this.activeRequests.size);
    }
  }

  async canAcceptRequest(): Promise<boolean> {
    return this.activeRequests.size < this.maxConcurrentRequests;
  }

  async trackRequest(duration: number): Promise<void> {
    this.metrics.timing('http_request_duration', duration);
  }

  async trackError(error: Error): Promise<void> {
    this.metrics.incrementCounter('errors', { type: error.name || 'unknown' });
  }
}