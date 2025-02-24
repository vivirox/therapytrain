import { EventEmitter } from 'events';
import { RedisService } from './RedisService';
import { MonitoringService } from './MonitoringService';
import {
    loadBalancerConfig,
    getHealthCheckConfig,
    getCircuitBreakerConfig,
    getLoadThresholds,
    getRoutingConfig,
    getFailoverConfig,
} from '../config/loadbalancer.config';

interface NodeHealth {
    nodeId: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: number;
    metrics: {
        cpu: number;
        memory: number;
        activeConnections: number;
        errorRate: number;
        responseTime: number;
    };
}

interface CircuitBreaker {
    nodeId: string;
    status: 'closed' | 'open' | 'half-open';
    failures: number;
    lastFailure: number;
    nextAttempt: number;
}

export class LoadBalancerService extends EventEmitter {
    private static instance: LoadBalancerService;
    private redisService: RedisService;
    private monitoringService: MonitoringService;
    private nodes: Map<string, NodeHealth> = new Map();
    private circuitBreakers: Map<string, CircuitBreaker> = new Map();
    private healthCheckInterval: NodeJS.Timeout | null = null;
    private readonly config = loadBalancerConfig;

    private constructor() {
        super();
        this.redisService = RedisService.getInstance();
        this.monitoringService = MonitoringService.getInstance();
        this.startHealthChecks();
    }

    public static getInstance(): LoadBalancerService {
        if (!LoadBalancerService.instance) {
            LoadBalancerService.instance = new LoadBalancerService();
        }
        return LoadBalancerService.instance;
    }

    private async startHealthChecks(): Promise<void> {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        const { interval } = getHealthCheckConfig();
        this.healthCheckInterval = setInterval(async () => {
            try {
                const activeNodes = await this.redisService.keys('node:*');
                for (const nodeKey of activeNodes) {
                    const nodeId = nodeKey.replace('node:', '');
                    await this.checkNodeHealth(nodeId);
                }
                this.updateCircuitBreakers();
            } catch (error) {
                console.error('Error during health checks:', error);
            }
        }, interval);
    }

    private async checkNodeHealth(nodeId: string): Promise<void> {
        const { timeout, unhealthyThreshold } = getHealthCheckConfig();
        try {
            const metrics = await Promise.race([
                this.getNodeMetrics(nodeId),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Health check timeout')), timeout)
                )
            ]);

            const status = this.calculateNodeStatus(metrics);
            const currentHealth = this.nodes.get(nodeId);

            if (currentHealth?.status === 'healthy' && status !== 'healthy') {
                // Track consecutive failures
                const failures = (currentHealth as any).consecutiveFailures || 0;
                if (failures + 1 >= unhealthyThreshold) {
                    status === 'unhealthy';
                }
                (metrics as any).consecutiveFailures = failures + 1;
            } else if (status === 'healthy') {
                (metrics as any).consecutiveFailures = 0;
            }

            this.nodes.set(nodeId, {
                nodeId,
                status,
                lastCheck: Date.now(),
                metrics
            });

            this.emit('health:update', { nodeId, status, metrics });

            if (status === 'unhealthy') {
                this.recordFailure(nodeId);
            }
        } catch (error) {
            console.error(`Error checking health for node ${nodeId}:`, error);
            this.recordFailure(nodeId);
        }
    }

    private async getNodeMetrics(nodeId: string): Promise<NodeHealth['metrics']> {
        const nodeMetrics = await this.monitoringService.getNodeMetrics(nodeId);
        const redisInfo = await this.redisService.get(`node:${nodeId}:metrics`);

        return {
            cpu: redisInfo?.cpu || 0,
            memory: redisInfo?.memory || 0,
            activeConnections: nodeMetrics.sessions || 0,
            errorRate: nodeMetrics.errorRate || 0,
            responseTime: nodeMetrics.averageLatency || 0
        };
    }

    private calculateNodeStatus(metrics: NodeHealth['metrics']): NodeHealth['status'] {
        const thresholds = getLoadThresholds();
        
        if (
            metrics.cpu > thresholds.cpu ||
            metrics.memory > thresholds.memory ||
            metrics.activeConnections > thresholds.connections ||
            metrics.errorRate > thresholds.errorRate ||
            metrics.responseTime > thresholds.responseTime
        ) {
            return 'degraded';
        }

        if (metrics.errorRate > thresholds.errorRate * 2) {
            return 'unhealthy';
        }

        return 'healthy';
    }

    private recordFailure(nodeId: string): void {
        const { failureThreshold, resetTimeout } = getCircuitBreakerConfig();
        let breaker = this.circuitBreakers.get(nodeId);
        
        if (!breaker) {
            breaker = {
                nodeId,
                status: 'closed',
                failures: 0,
                lastFailure: Date.now(),
                nextAttempt: Date.now()
            };
        }

        breaker.failures++;
        breaker.lastFailure = Date.now();

        if (breaker.failures >= failureThreshold) {
            breaker.status = 'open';
            breaker.nextAttempt = Date.now() + resetTimeout;
            this.emit('circuit:open', { nodeId, breaker });
        }

        this.circuitBreakers.set(nodeId, breaker);
    }

    private updateCircuitBreakers(): void {
        const now = Date.now();
        const { halfOpenMaxRequests } = getCircuitBreakerConfig();
        
        for (const [nodeId, breaker] of this.circuitBreakers) {
            if (breaker.status === 'open' && now >= breaker.nextAttempt) {
                breaker.status = 'half-open';
                (breaker as any).remainingHalfOpenRequests = halfOpenMaxRequests;
                this.emit('circuit:half-open', { nodeId, breaker });
            }
        }
    }

    public async getOptimalNode(retryCount = 0): Promise<string | null> {
        const { strategy, weights } = getRoutingConfig();
        const { enabled: failoverEnabled, maxRetries, retryDelay, fallbackNodes } = getFailoverConfig();

        const availableNodes = Array.from(this.nodes.entries())
            .filter(([nodeId, health]) => {
                const breaker = this.circuitBreakers.get(nodeId);
                return health.status !== 'unhealthy' && 
                       (!breaker || breaker.status === 'closed');
            })
            .sort(([, a], [, b]) => {
                // Calculate weighted load score (lower is better)
                const getLoadScore = (health: NodeHealth) => {
                    return (
                        (health.metrics.cpu / getLoadThresholds().cpu) * weights.cpu +
                        (health.metrics.memory / getLoadThresholds().memory) * weights.memory +
                        (health.metrics.activeConnections / getLoadThresholds().connections) * weights.connections +
                        (health.metrics.errorRate / getLoadThresholds().errorRate) * weights.errorRate +
                        (health.metrics.responseTime / getLoadThresholds().responseTime) * weights.responseTime
                    );
                };

                return getLoadScore(a) - getLoadScore(b);
            });

        if (availableNodes.length === 0) {
            if (failoverEnabled && retryCount < maxRetries) {
                // Try fallback nodes
                for (const fallbackId of fallbackNodes) {
                    const health = await this.checkNodeHealth(fallbackId);
                    if (health && health.status !== 'unhealthy') {
                        return fallbackId;
                    }
                }

                // Wait and retry
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return this.getOptimalNode(retryCount + 1);
            }
            return null;
        }

        return availableNodes[0][0];
    }

    public async handleNodeSuccess(nodeId: string): Promise<void> {
        const { healthyThreshold } = getHealthCheckConfig();
        const breaker = this.circuitBreakers.get(nodeId);
        const health = this.nodes.get(nodeId);

        if (breaker) {
            if (breaker.status === 'half-open') {
                const remainingRequests = (breaker as any).remainingHalfOpenRequests - 1;
                if (remainingRequests <= 0) {
                    breaker.status = 'closed';
                    breaker.failures = 0;
                    this.emit('circuit:close', { nodeId, breaker });
                } else {
                    (breaker as any).remainingHalfOpenRequests = remainingRequests;
                }
            }
            this.circuitBreakers.set(nodeId, breaker);
        }

        if (health) {
            const successCount = (health as any).consecutiveSuccesses || 0;
            if (successCount + 1 >= healthyThreshold) {
                health.status = 'healthy';
                (health as any).consecutiveSuccesses = 0;
            } else {
                (health as any).consecutiveSuccesses = successCount + 1;
            }
            this.nodes.set(nodeId, health);
        }
    }

    public getNodeHealth(nodeId: string): NodeHealth | null {
        return this.nodes.get(nodeId) || null;
    }

    public getCircuitBreakerStatus(nodeId: string): CircuitBreaker | null {
        return this.circuitBreakers.get(nodeId) || null;
    }

    public async shutdown(): Promise<void> {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        this.removeAllListeners();
    }
} 