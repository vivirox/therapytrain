export const loadBalancerConfig = {
    healthCheck: {
        interval: 10000, // 10 seconds
        timeout: 5000, // 5 seconds
        unhealthyThreshold: 3, // Number of consecutive failures before marking as unhealthy
        healthyThreshold: 2, // Number of consecutive successes before marking as healthy
    },

    circuitBreaker: {
        failureThreshold: 5, // Number of failures before opening
        resetTimeout: 30000, // 30 seconds before attempting to close
        halfOpenMaxRequests: 3, // Maximum requests in half-open state
    },

    loadThresholds: {
        cpu: 80, // 80% CPU usage
        memory: 85, // 85% memory usage
        connections: 1000, // 1000 active connections
        errorRate: 0.1, // 10% error rate
        responseTime: 200, // 200ms response time
    },

    routing: {
        strategy: 'weighted-least-connections' as const,
        weights: {
            cpu: 0.3,
            memory: 0.2,
            connections: 0.2,
            errorRate: 0.15,
            responseTime: 0.15,
        },
    },

    monitoring: {
        enabled: true,
        metricsInterval: 60000, // 1 minute
        retentionPeriod: 86400000, // 24 hours
    },

    failover: {
        enabled: true,
        maxRetries: 3,
        retryDelay: 1000, // 1 second
        fallbackNodes: [], // List of fallback node IDs
    },
} as const;

// Type definitions
export type LoadBalancerConfig = typeof loadBalancerConfig;

// Helper functions
export const getHealthCheckConfig = () => loadBalancerConfig.healthCheck;
export const getCircuitBreakerConfig = () => loadBalancerConfig.circuitBreaker;
export const getLoadThresholds = () => loadBalancerConfig.loadThresholds;
export const getRoutingConfig = () => loadBalancerConfig.routing;
export const getMonitoringConfig = () => loadBalancerConfig.monitoring;
export const getFailoverConfig = () => loadBalancerConfig.failover;

export default loadBalancerConfig; 