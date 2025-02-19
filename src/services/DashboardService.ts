import { EventEmitter } from 'events';
import { RedisService } from './RedisService';
import { MonitoringService } from './MonitoringService';
import { LoadBalancerService } from './LoadBalancerService';
import { SmartCacheService } from './SmartCacheService';

interface DashboardMetrics {
    system: {
        uptime: number;
        totalRequests: number;
        errorRate: number;
        averageLatency: number;
    };
    cache: {
        hitRate: number;
        missRate: number;
        evictionRate: number;
        memoryUsage: number;
        hotKeys: string[];
        coldKeys: string[];
    };
    loadBalancing: {
        activeNodes: number;
        healthyNodes: number;
        totalConnections: number;
        nodeHealth: Map<string, {
            status: string;
            load: number;
            errorRate: number;
        }>;
    };
    performance: {
        cpu: number;
        memory: number;
        networkIO: number;
        diskIO: number;
    };
}

interface Alert {
    id: string;
    type: 'error' | 'warning' | 'info';
    message: string;
    timestamp: number;
    source: string;
    metadata: Record<string, any>;
}

export class DashboardService extends EventEmitter {
    private static instance: DashboardService;
    private redisService: RedisService;
    private monitoringService: MonitoringService;
    private loadBalancerService: LoadBalancerService;
    private smartCacheService: SmartCacheService;
    private metrics: DashboardMetrics;
    private alerts: Alert[] = [];
    private updateInterval: NodeJS.Timeout | null = null;
    private readonly METRICS_RETENTION = 86400000; // 24 hours
    private readonly UPDATE_INTERVAL = 5000; // 5 seconds

    private constructor() {
        super();
        this.redisService = RedisService.getInstance();
        this.monitoringService = MonitoringService.getInstance();
        this.loadBalancerService = LoadBalancerService.getInstance();
        this.smartCacheService = SmartCacheService.getInstance();
        
        this.metrics = this.initializeMetrics();
        this.setupEventListeners();
        this.startMetricsCollection();
    }

    public static getInstance(): DashboardService {
        if (!DashboardService.instance) {
            DashboardService.instance = new DashboardService();
        }
        return DashboardService.instance;
    }

    private initializeMetrics(): DashboardMetrics {
        return {
            system: {
                uptime: process.uptime(),
                totalRequests: 0,
                errorRate: 0,
                averageLatency: 0,
            },
            cache: {
                hitRate: 0,
                missRate: 0,
                evictionRate: 0,
                memoryUsage: 0,
                hotKeys: [],
                coldKeys: [],
            },
            loadBalancing: {
                activeNodes: 0,
                healthyNodes: 0,
                totalConnections: 0,
                nodeHealth: new Map(),
            },
            performance: {
                cpu: 0,
                memory: 0,
                networkIO: 0,
                diskIO: 0,
            },
        };
    }

    private setupEventListeners(): void {
        // Listen for cache events
        this.redisService.onEvent('hit', this.handleCacheHit.bind(this));
        this.redisService.onEvent('miss', this.handleCacheMiss.bind(this));
        this.redisService.onEvent('memoryWarning', this.handleMemoryWarning.bind(this));

        // Listen for load balancer events
        this.loadBalancerService.on('health:update', this.handleNodeHealthUpdate.bind(this));
        this.loadBalancerService.on('circuit:open', this.handleCircuitBreaker.bind(this));

        // Listen for monitoring events
        this.monitoringService.on('error', this.handleError.bind(this));
        this.monitoringService.on('performance', this.handlePerformanceMetrics.bind(this));
    }

    private startMetricsCollection(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.updateInterval = setInterval(async () => {
            try {
                await this.updateMetrics();
                this.emit('metrics:update', this.metrics);
                
                // Check alert conditions
                await this.checkAlertConditions();
                
                // Persist metrics
                await this.persistMetrics();
            } catch (error) {
                console.error('Error updating metrics:', error);
                this.handleError(error);
            }
        }, this.UPDATE_INTERVAL);
    }

    private async updateMetrics(): Promise<void> {
        // Update system metrics
        this.metrics.system.uptime = process.uptime();
        
        // Update cache metrics
        const cacheAnalytics = this.smartCacheService.getAnalytics();
        this.metrics.cache = {
            ...this.metrics.cache,
            hitRate: cacheAnalytics.cacheMetrics.hitRate,
            missRate: 1 - cacheAnalytics.cacheMetrics.hitRate,
            hotKeys: cacheAnalytics.hotKeys,
            coldKeys: cacheAnalytics.coldKeys,
        };

        // Update load balancing metrics
        const nodes = Array.from(this.loadBalancerService['nodes'].entries());
        this.metrics.loadBalancing = {
            ...this.metrics.loadBalancing,
            activeNodes: nodes.length,
            healthyNodes: nodes.filter(([, health]) => health.status === 'healthy').length,
            nodeHealth: new Map(
                nodes.map(([id, health]) => [
                    id,
                    {
                        status: health.status,
                        load: this.calculateNodeLoad(health),
                        errorRate: health.metrics.errorRate,
                    },
                ])
            ),
        };

        // Update performance metrics
        const performanceStats = await this.monitoringService.getPerformanceStats();
        this.metrics.performance = {
            ...this.metrics.performance,
            cpu: performanceStats.current.cpu || 0,
            memory: performanceStats.current.memory || 0,
            networkIO: performanceStats.current.networkIO || 0,
            diskIO: performanceStats.current.diskIO || 0,
        };
    }

    private calculateNodeLoad(health: any): number {
        const { cpu, memory, activeConnections } = health.metrics;
        return (cpu * 0.4 + memory * 0.3 + (activeConnections / 1000) * 0.3);
    }

    private async checkAlertConditions(): Promise<void> {
        const { metrics } = this;

        // Check system alerts
        if (metrics.system.errorRate > 0.1) {
            this.createAlert('error', 'High error rate detected', 'system', {
                errorRate: metrics.system.errorRate,
            });
        }

        // Check cache alerts
        if (metrics.cache.hitRate < 0.7) {
            this.createAlert('warning', 'Low cache hit rate', 'cache', {
                hitRate: metrics.cache.hitRate,
            });
        }

        if (metrics.cache.memoryUsage > 0.9) {
            this.createAlert('error', 'High memory usage', 'cache', {
                memoryUsage: metrics.cache.memoryUsage,
            });
        }

        // Check node health alerts
        for (const [nodeId, health] of metrics.loadBalancing.nodeHealth) {
            if (health.status === 'unhealthy') {
                this.createAlert('error', `Node ${nodeId} is unhealthy`, 'loadBalancer', {
                    nodeId,
                    status: health.status,
                    errorRate: health.errorRate,
                });
            }
        }

        // Check performance alerts
        if (metrics.performance.cpu > 80) {
            this.createAlert('warning', 'High CPU usage', 'performance', {
                cpu: metrics.performance.cpu,
            });
        }

        if (metrics.performance.memory > 85) {
            this.createAlert('warning', 'High memory usage', 'performance', {
                memory: metrics.performance.memory,
            });
        }
    }

    private createAlert(
        type: Alert['type'],
        message: string,
        source: string,
        metadata: Record<string, any>
    ): void {
        const alert: Alert = {
            id: crypto.randomUUID(),
            type,
            message,
            timestamp: Date.now(),
            source,
            metadata,
        };

        this.alerts.push(alert);
        this.emit('alert', alert);

        // Persist alert
        this.persistAlert(alert);
    }

    private async persistMetrics(): Promise<void> {
        try {
            await this.redisService.set(
                `metrics:${Date.now()}`,
                this.metrics,
                this.METRICS_RETENTION / 1000
            );
        } catch (error) {
            console.error('Error persisting metrics:', error);
        }
    }

    private async persistAlert(alert: Alert): Promise<void> {
        try {
            await this.redisService.set(
                `alert:${alert.id}`,
                alert,
                this.METRICS_RETENTION / 1000
            );
        } catch (error) {
            console.error('Error persisting alert:', error);
        }
    }

    // Event handlers
    private handleCacheHit({ key, latency }: { key: string; latency: number }): void {
        this.metrics.system.averageLatency = 
            (this.metrics.system.averageLatency + latency) / 2;
    }

    private handleCacheMiss({ key }: { key: string }): void {
        this.metrics.cache.missRate = 
            (this.metrics.cache.missRate * this.metrics.system.totalRequests + 1) /
            (this.metrics.system.totalRequests + 1);
    }

    private handleMemoryWarning(warning: { used: number; max: number }): void {
        this.metrics.cache.memoryUsage = warning.used / warning.max;
        if (this.metrics.cache.memoryUsage > 0.9) {
            this.createAlert('warning', 'High memory usage', 'cache', warning);
        }
    }

    private handleNodeHealthUpdate({ nodeId, status, metrics }: any): void {
        this.metrics.loadBalancing.nodeHealth.set(nodeId, {
            status,
            load: this.calculateNodeLoad(metrics),
            errorRate: metrics.errorRate,
        });
    }

    private handleCircuitBreaker({ nodeId, breaker }: any): void {
        this.createAlert('error', `Circuit breaker opened for node ${nodeId}`, 'loadBalancer', {
            nodeId,
            failures: breaker.failures,
            lastFailure: breaker.lastFailure,
        });
    }

    private handleError(error: Error): void {
        this.metrics.system.errorRate = 
            (this.metrics.system.errorRate * this.metrics.system.totalRequests + 1) /
            (this.metrics.system.totalRequests + 1);
        
        this.createAlert('error', error.message, 'system', {
            stack: error.stack,
        });
    }

    private handlePerformanceMetrics(metrics: any): void {
        this.metrics.performance = {
            ...this.metrics.performance,
            ...metrics,
        };
    }

    // Public methods
    public getMetrics(): DashboardMetrics {
        return this.metrics;
    }

    public getAlerts(
        type?: Alert['type'],
        source?: string,
        limit = 100
    ): Alert[] {
        return this.alerts
            .filter(alert => 
                (!type || alert.type === type) &&
                (!source || alert.source === source)
            )
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    public async getHistoricalMetrics(
        startTime: number,
        endTime: number
    ): Promise<DashboardMetrics[]> {
        try {
            const keys = await this.redisService.keys(`metrics:*`);
            const timestamps = keys
                .map(key => parseInt(key.split(':')[1]))
                .filter(ts => ts >= startTime && ts <= endTime);

            const metrics = await Promise.all(
                timestamps.map(ts => 
                    this.redisService.get<DashboardMetrics>(`metrics:${ts}`)
                )
            );

            return metrics.filter((m): m is DashboardMetrics => m !== null);
        } catch (error) {
            console.error('Error fetching historical metrics:', error);
            return [];
        }
    }

    public async shutdown(): Promise<void> {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.removeAllListeners();
    }
} 