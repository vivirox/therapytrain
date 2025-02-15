import { RedisService } from './RedisService';

export class MonitoringService {
    private static instance: MonitoringService;
    private redisService: RedisService;
    private metricsHistory: Array<{
        timestamp: number;
        metrics: ReturnType<typeof RedisService.prototype.getMetrics>;
    }> = [];
    private sessionMetrics: Map<string, {
        operations: number;
        errors: number;
        latency: number[];
        lastActivity: number;
        nodeId: string;
    }> = new Map();
    private readonly maxHistoryLength = 1000; // Keep last 1000 metrics points

    private constructor() {
        this.redisService = RedisService.getInstance();
        this.setupRedisMonitoring();
        this.startPeriodicMetricsCollection();
        this.startSessionMetricsCleanup();
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

    public recordCacheOperation(
        operation: string,
        success: boolean,
        latency: number
    ): void {
        // Record operation metrics
        const metrics = this.getCurrentMetrics();
        if (success) {
            metrics.hits++;
        } else {
            metrics.misses++;
        }
        metrics.latency.push(latency);

        // Analyze for potential issues
        this.analyzeMetrics(metrics);
    }

    public recordSessionOperation(
        sessionId: string,
        nodeId: string,
        success: boolean,
        latency: number
    ): void {
        let sessionMetric = this.sessionMetrics.get(sessionId);
        if (!sessionMetric) {
            sessionMetric = {
                operations: 0,
                errors: 0,
                latency: [],
                lastActivity: Date.now(),
                nodeId
            };
            this.sessionMetrics.set(sessionId, sessionMetric);
        }

        sessionMetric.operations++;
        if (!success) {
            sessionMetric.errors++;
        }
        sessionMetric.latency.push(latency);
        sessionMetric.lastActivity = Date.now();
        sessionMetric.nodeId = nodeId;

        // Analyze session health
        this.analyzeSessionHealth(sessionId, sessionMetric);
    }

    private analyzeSessionHealth(
        sessionId: string,
        metrics: {
            operations: number;
            errors: number;
            latency: number[];
            lastActivity: number;
            nodeId: string;
        }
    ): void {
        const errorRate = metrics.errors / metrics.operations;
        const avgLatency = metrics.latency.reduce((a, b) => a + b, 0) / metrics.latency.length;

        if (errorRate > 0.1) {
            console.warn(`High error rate (${errorRate.toFixed(2)}) for session ${sessionId}`);
        }

        if (avgLatency > 100) {
            console.warn(`High average latency (${avgLatency.toFixed(2)}ms) for session ${sessionId}`);
        }

        const inactiveTime = Date.now() - metrics.lastActivity;
        if (inactiveTime > 300000) { // 5 minutes
            console.warn(`Session ${sessionId} has been inactive for ${(inactiveTime / 1000).toFixed(0)} seconds`);
        }
    }

    private startSessionMetricsCleanup(): void {
        setInterval(() => {
            const now = Date.now();
            for (const [sessionId, metrics] of this.sessionMetrics.entries()) {
                if (now - metrics.lastActivity > 3600000) { // 1 hour
                    this.sessionMetrics.delete(sessionId);
                }
            }
        }, 300000); // Clean up every 5 minutes
    }

    public getSessionMetrics(sessionId: string) {
        const metrics = this.sessionMetrics.get(sessionId);
        if (!metrics) return null;

        const avgLatency = metrics.latency.reduce((a, b) => a + b, 0) / metrics.latency.length;
        const errorRate = metrics.errors / metrics.operations;

        return {
            operations: metrics.operations,
            errors: metrics.errors,
            errorRate,
            averageLatency: avgLatency,
            lastActivity: metrics.lastActivity,
            nodeId: metrics.nodeId,
            health: this.calculateSessionHealth(errorRate, avgLatency)
        };
    }

    private calculateSessionHealth(
        errorRate: number,
        avgLatency: number
    ): 'healthy' | 'degraded' | 'unhealthy' {
        if (errorRate < 0.05 && avgLatency < 50) {
            return 'healthy';
        } else if (errorRate < 0.1 && avgLatency < 100) {
            return 'degraded';
        } else {
            return 'unhealthy';
        }
    }

    public getAllSessionMetrics() {
        const result = new Map<string, ReturnType<typeof this.getSessionMetrics>>();
        for (const [sessionId] of this.sessionMetrics) {
            const metrics = this.getSessionMetrics(sessionId);
            if (metrics) {
                result.set(sessionId, metrics);
            }
        }
        return result;
    }

    public getNodeMetrics(nodeId: string) {
        const sessions = Array.from(this.sessionMetrics.entries())
            .filter(([_, metrics]) => metrics.nodeId === nodeId);

        const totalOperations = sessions.reduce((sum, [_, metrics]) => sum + metrics.operations, 0);
        const totalErrors = sessions.reduce((sum, [_, metrics]) => sum + metrics.errors, 0);
        const allLatencies = sessions.flatMap(([_, metrics]) => metrics.latency);

        return {
            sessions: sessions.length,
            operations: totalOperations,
            errors: totalErrors,
            errorRate: totalErrors / totalOperations,
            averageLatency: allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length,
            health: this.calculateNodeHealth(sessions.length, totalErrors / totalOperations)
        };
    }

    private calculateNodeHealth(
        sessionCount: number,
        errorRate: number
    ): 'healthy' | 'degraded' | 'unhealthy' {
        if (sessionCount === 0) return 'healthy';
        if (errorRate < 0.05) return 'healthy';
        if (errorRate < 0.1) return 'degraded';
        return 'unhealthy';
    }
} 