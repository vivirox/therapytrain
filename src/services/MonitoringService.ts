import { RedisService } from './RedisService';

export class MonitoringService {
    private static instance: MonitoringService;
    private redisService: RedisService;
    private metricsHistory: Array<{
        timestamp: number;
        metrics: ReturnType<typeof RedisService.prototype.getMetrics>;
    }> = [];
    private readonly maxHistoryLength = 1000; // Keep last 1000 metrics points

    private constructor() {
        this.redisService = RedisService.getInstance();
        this.setupRedisMonitoring();
        this.startPeriodicMetricsCollection();
    }

    public static getInstance(): MonitoringService {
        if (!MonitoringService.instance) {
            MonitoringService.instance = new MonitoringService();
        }
        return MonitoringService.instance;
    }

    private setupRedisMonitoring(): void {
        // Monitor Redis events
        this.redisService.onEvent('error', (error) => {
            console.error('Redis Error:', error);
            // TODO: Add error reporting to your preferred service (e.g., Sentry)
        });

        this.redisService.onEvent('memoryUsage', (info) => {
            console.log('Redis Memory Usage:', info);
            // TODO: Add memory usage alerts if needed
        });

        // Monitor cache performance
        this.redisService.onEvent('hit', ({ key, latency }) => {
            if (latency > 100) { // Alert on high latency
                console.warn(`High latency cache hit for key ${key}: ${latency}ms`);
            }
        });

        this.redisService.onEvent('miss', ({ key }) => {
            console.debug(`Cache miss for key: ${key}`);
        });
    }

    private startPeriodicMetricsCollection(): void {
        setInterval(() => {
            const metrics = this.redisService.getMetrics();
            this.metricsHistory.push({
                timestamp: Date.now(),
                metrics
            });

            // Keep history within limits
            if (this.metricsHistory.length > this.maxHistoryLength) {
                this.metricsHistory.shift();
            }

            // Analyze metrics for potential issues
            this.analyzeMetrics(metrics);
        }, 60000); // Collect metrics every minute
    }

    private analyzeMetrics(metrics: ReturnType<typeof RedisService.prototype.getMetrics>): void {
        // Check hit rate
        if (metrics.hitRate < 0.8) {
            console.warn('Low cache hit rate detected:', metrics.hitRate);
        }

        // Check latency
        if (metrics.averageLatency > 50) {
            console.warn('High average latency detected:', metrics.averageLatency);
        }

        // Check invalidation rate
        const invalidationRate = metrics.invalidations / metrics.totalOperations;
        if (invalidationRate > 0.1) {
            console.warn('High cache invalidation rate detected:', invalidationRate);
        }
    }

    /**
     * Get current metrics
     */
    public getCurrentMetrics() {
        return this.redisService.getMetrics();
    }

    /**
     * Get metrics history
     */
    public getMetricsHistory() {
        return this.metricsHistory;
    }

    /**
     * Get metrics for a specific time range
     */
    public getMetricsForTimeRange(startTime: number, endTime: number) {
        return this.metricsHistory.filter(
            ({ timestamp }) => timestamp >= startTime && timestamp <= endTime
        );
    }

    /**
     * Calculate performance statistics
     */
    public getPerformanceStats() {
        const metrics = this.getCurrentMetrics();
        const recentMetrics = this.getMetricsForTimeRange(
            Date.now() - 3600000, // Last hour
            Date.now()
        );

        const avgLatencyTrend = recentMetrics.reduce(
            (acc, { metrics }) => acc + metrics.averageLatency,
            0
        ) / (recentMetrics.length || 1);

        return {
            current: metrics,
            hourlyAverage: {
                hitRate: recentMetrics.reduce(
                    (acc, { metrics }) => acc + metrics.hitRate,
                    0
                ) / (recentMetrics.length || 1),
                latency: avgLatencyTrend,
                invalidationRate: recentMetrics.reduce(
                    (acc, { metrics }) => acc + metrics.invalidations,
                    0
                ) / (recentMetrics.length || 1)
            },
            recommendations: this.generateRecommendations(metrics, avgLatencyTrend)
        };
    }

    private generateRecommendations(
        currentMetrics: ReturnType<typeof RedisService.prototype.getMetrics>,
        avgLatencyTrend: number
    ): string[] {
        const recommendations: string[] = [];

        if (currentMetrics.hitRate < 0.8) {
            recommendations.push(
                'Consider increasing cache TTL or reviewing cache invalidation strategy'
            );
        }

        if (avgLatencyTrend > 50) {
            recommendations.push(
                'Consider optimizing cache key structure or reviewing network configuration'
            );
        }

        if (currentMetrics.invalidations / currentMetrics.totalOperations > 0.1) {
            recommendations.push(
                'High number of cache invalidations. Review cache patterns and consider using more specific invalidation strategies'
            );
        }

        return recommendations;
    }

    /**
     * Reset monitoring history
     */
    public resetHistory(): void {
        this.metricsHistory = [];
        this.redisService.resetMetrics();
    }
} 