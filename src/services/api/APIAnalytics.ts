import { singleton } from '@/lib/decorators';
import { EventEmitter } from 'events';
import { Logger } from '@/lib/logger';
import { RedisService } from '@/services/RedisService';
import { MetricsService } from '@/services/MetricsService';

interface RequestMetrics {
  timestamp: number;
  duration: number;
  status: number;
  endpoint: string;
  method: string;
  service: string;
  clientIp: string;
  userAgent: string;
  errorType?: string;
}

interface ServiceMetrics {
  requests: number;
  errors: number;
  totalDuration: number;
  avgDuration: number;
  statusCodes: Record<number, number>;
  endpoints: Record<string, {
    requests: number;
    errors: number;
    avgDuration: number;
  }>;
}

interface AnalyticsConfig {
  retentionPeriod: number; // in days
  aggregationInterval: number; // in minutes
  alertThresholds: {
    errorRate: number;
    avgDuration: number;
    requestRate: number;
  };
}

@singleton()
export class APIAnalytics extends EventEmitter {
  private static instance: APIAnalytics;
  private readonly logger: Logger;
  private readonly redis: RedisService;
  private readonly metrics: MetricsService;
  private readonly config: AnalyticsConfig;

  constructor() {
    super();
    this.logger = new Logger();
    this.redis = RedisService.getInstance();
    this.metrics = MetricsService.getInstance();
    this.config = {
      retentionPeriod: 30, // 30 days
      aggregationInterval: 5, // 5 minutes
      alertThresholds: {
        errorRate: 0.05, // 5% error rate
        avgDuration: 1000, // 1 second
        requestRate: 1000 // requests per minute
      }
    };

    // Start aggregation job
    this.startAggregation();
  }

  public static getInstance(): APIAnalytics {
    if (!APIAnalytics.instance) {
      APIAnalytics.instance = new APIAnalytics();
    }
    return APIAnalytics.instance;
  }

  public async recordRequest(metrics: RequestMetrics): Promise<void> {
    try {
      // Store raw metrics
      const key = `api:metrics:raw:${Math.floor(Date.now() / 1000)}`;
      await this.redis.rpush(key, JSON.stringify(metrics));
      await this.redis.expire(
        key,
        this.config.retentionPeriod * 24 * 60 * 60 // Convert days to seconds
      );

      // Update real-time metrics
      await this.updateRealtimeMetrics(metrics);

      // Record to metrics service
      await this.metrics.recordMetric({
        name: 'api_request',
        value: metrics.duration,
        labels: {
          endpoint: metrics.endpoint,
          method: metrics.method,
          service: metrics.service,
          status: metrics.status.toString()
        }
      });

      // Check for alerts
      await this.checkAlerts(metrics);
    } catch (error) {
      this.logger.error('Error recording API metrics', error as Error);
    }
  }

  public async getServiceMetrics(
    service: string,
    timeRange: { start: number; end: number }
  ): Promise<ServiceMetrics> {
    const metrics: ServiceMetrics = {
      requests: 0,
      errors: 0,
      totalDuration: 0,
      avgDuration: 0,
      statusCodes: {},
      endpoints: {}
    };

    // Get aggregated metrics from Redis
    const keys = await this.redis.keys(`api:metrics:agg:${service}:*`);
    for (const key of keys) {
      const timestamp = parseInt(key.split(':').pop() || '0');
      if (timestamp >= timeRange.start && timestamp <= timeRange.end) {
        const data = await this.redis.get(key);
        if (data) {
          const aggMetrics = JSON.parse(data);
          this.mergeMetrics(metrics, aggMetrics);
        }
      }
    }

    // Calculate averages
    if (metrics.requests > 0) {
      metrics.avgDuration = metrics.totalDuration / metrics.requests;
    }

    return metrics;
  }

  public async getEndpointMetrics(
    service: string,
    endpoint: string,
    timeRange: { start: number; end: number }
  ): Promise<ServiceMetrics> {
    const metrics = await this.getServiceMetrics(service, timeRange);
    return {
      ...metrics,
      endpoints: {
        [endpoint]: metrics.endpoints[endpoint] || {
          requests: 0,
          errors: 0,
          avgDuration: 0
        }
      }
    };
  }

  private async updateRealtimeMetrics(metrics: RequestMetrics): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const windowKey = `api:metrics:realtime:${metrics.service}:${now}`;

    // Update request count
    await this.redis.hincrby(windowKey, 'requests', 1);

    // Update error count if status >= 400
    if (metrics.status >= 400) {
      await this.redis.hincrby(windowKey, 'errors', 1);
    }

    // Update duration stats
    await this.redis.hincrby(windowKey, 'totalDuration', metrics.duration);

    // Update endpoint stats
    const endpointKey = `${metrics.method}:${metrics.endpoint}`;
    await this.redis.hincrby(windowKey, `endpoint:${endpointKey}:requests`, 1);
    if (metrics.status >= 400) {
      await this.redis.hincrby(windowKey, `endpoint:${endpointKey}:errors`, 1);
    }
    await this.redis.hincrby(
      windowKey,
      `endpoint:${endpointKey}:duration`,
      metrics.duration
    );

    // Set expiry
    await this.redis.expire(windowKey, 3600); // 1 hour
  }

  private async checkAlerts(metrics: RequestMetrics): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const windowKey = `api:metrics:realtime:${metrics.service}:${now}`;

    // Get current window metrics
    const windowMetrics = await this.redis.hgetall(windowKey);
    if (!windowMetrics) return;

    const requests = parseInt(windowMetrics.requests || '0');
    const errors = parseInt(windowMetrics.errors || '0');
    const totalDuration = parseInt(windowMetrics.totalDuration || '0');

    // Check error rate
    const errorRate = errors / requests;
    if (errorRate > this.config.alertThresholds.errorRate) {
      this.emit('alert', {
        type: 'error_rate',
        service: metrics.service,
        value: errorRate,
        threshold: this.config.alertThresholds.errorRate
      });
    }

    // Check average duration
    const avgDuration = totalDuration / requests;
    if (avgDuration > this.config.alertThresholds.avgDuration) {
      this.emit('alert', {
        type: 'latency',
        service: metrics.service,
        value: avgDuration,
        threshold: this.config.alertThresholds.avgDuration
      });
    }

    // Check request rate
    const requestRate = requests / (this.config.aggregationInterval * 60);
    if (requestRate > this.config.alertThresholds.requestRate) {
      this.emit('alert', {
        type: 'request_rate',
        service: metrics.service,
        value: requestRate,
        threshold: this.config.alertThresholds.requestRate
      });
    }
  }

  private startAggregation(): void {
    setInterval(async () => {
      try {
        const now = Math.floor(Date.now() / 1000);
        const windowStart = now - this.config.aggregationInterval * 60;

        // Get all realtime metrics keys
        const keys = await this.redis.keys('api:metrics:realtime:*');
        
        // Group by service
        const serviceMetrics = new Map<string, ServiceMetrics>();
        
        for (const key of keys) {
          const timestamp = parseInt(key.split(':').pop() || '0');
          if (timestamp >= windowStart) {
            const metrics = await this.redis.hgetall(key);
            if (!metrics) continue;

            const service = key.split(':')[3];
            let serviceData = serviceMetrics.get(service) || {
              requests: 0,
              errors: 0,
              totalDuration: 0,
              avgDuration: 0,
              statusCodes: {},
              endpoints: {}
            };

            // Aggregate metrics
            serviceData.requests += parseInt(metrics.requests || '0');
            serviceData.errors += parseInt(metrics.errors || '0');
            serviceData.totalDuration += parseInt(metrics.totalDuration || '0');

            // Aggregate endpoint metrics
            for (const [key, value] of Object.entries(metrics)) {
              if (key.startsWith('endpoint:')) {
                const [, endpoint, metric] = key.split(':');
                if (!serviceData.endpoints[endpoint]) {
                  serviceData.endpoints[endpoint] = {
                    requests: 0,
                    errors: 0,
                    avgDuration: 0
                  };
                }
                if (metric === 'requests') {
                  serviceData.endpoints[endpoint].requests += parseInt(value);
                } else if (metric === 'errors') {
                  serviceData.endpoints[endpoint].errors += parseInt(value);
                } else if (metric === 'duration') {
                  serviceData.endpoints[endpoint].avgDuration =
                    parseInt(value) / serviceData.endpoints[endpoint].requests;
                }
              }
            }

            serviceMetrics.set(service, serviceData);
          }
        }

        // Store aggregated metrics
        for (const [service, metrics] of serviceMetrics.entries()) {
          const key = `api:metrics:agg:${service}:${now}`;
          await this.redis.set(
            key,
            JSON.stringify(metrics),
            this.config.retentionPeriod * 24 * 60 * 60 // Convert days to seconds
          );
        }
      } catch (error) {
        this.logger.error('Error aggregating API metrics', error as Error);
      }
    }, this.config.aggregationInterval * 60 * 1000); // Convert minutes to milliseconds
  }

  private mergeMetrics(target: ServiceMetrics, source: ServiceMetrics): void {
    target.requests += source.requests;
    target.errors += source.errors;
    target.totalDuration += source.totalDuration;

    // Merge status codes
    for (const [code, count] of Object.entries(source.statusCodes)) {
      target.statusCodes[code] = (target.statusCodes[code] || 0) + count;
    }

    // Merge endpoint metrics
    for (const [endpoint, metrics] of Object.entries(source.endpoints)) {
      if (!target.endpoints[endpoint]) {
        target.endpoints[endpoint] = {
          requests: 0,
          errors: 0,
          avgDuration: 0
        };
      }
      target.endpoints[endpoint].requests += metrics.requests;
      target.endpoints[endpoint].errors += metrics.errors;
      target.endpoints[endpoint].avgDuration =
        (target.endpoints[endpoint].avgDuration * target.endpoints[endpoint].requests +
          metrics.avgDuration * metrics.requests) /
        (target.endpoints[endpoint].requests + metrics.requests);
    }
  }
} 