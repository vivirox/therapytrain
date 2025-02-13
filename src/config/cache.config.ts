export const cacheConfig = {
    redis: {
        // Connection settings
        connection: {
            maxRetriesPerRequest: 3,
            connectTimeout: 10000,
            commandTimeout: 5000,
            enableOfflineQueue: true,
            retryStrategy: (times: number) => Math.min(times * 50, 2000),
        },

        // TTL settings (in seconds)
        ttl: {
            session: 3600, // 1 hour
            branch: 1800, // 30 minutes
            metrics: 86400, // 24 hours
            messages: 300, // 5 minutes
            default: 3600, // 1 hour
        },

        // Patterns for grouped cache management
        patterns: {
            activeSessions: 'active-sessions',
            completedSessions: 'completed-sessions',
            sessionBranches: 'session-branches',
            metrics: 'performance-metrics',
            messages: 'chat-messages',
        },

        // Performance thresholds
        performance: {
            minHitRate: 0.8, // 80% hit rate
            maxLatency: 50, // 50ms
            maxInvalidationRate: 0.1, // 10% of operations
            metricsHistoryLength: 1000,
            metricsCollectionInterval: 60000, // 1 minute
        },

        // Cleanup settings
        cleanup: {
            interval: 300000, // 5 minutes
            inactiveTimeout: 3600000, // 1 hour
            maxKeys: 10000,
        },

        // Memory management
        memory: {
            maxMemoryPolicy: 'allkeys-lru',
            maxMemoryBytes: 512 * 1024 * 1024, // 512MB
            warningThreshold: 0.8, // 80% of max memory
        },
    },

    // Monitoring settings
    monitoring: {
        enabled: true,
        alertThresholds: {
            hitRate: 0.8,
            latency: 100,
            errorRate: 0.01,
            memoryUsage: 0.9,
        },
        metrics: {
            collection: {
                interval: 60000, // 1 minute
                retention: 86400000, // 24 hours
            },
            aggregation: {
                interval: 300000, // 5 minutes
                types: ['avg', 'max', 'min', 'p95', 'p99'],
            },
        },
    },

    // Feature flags for cache functionality
    features: {
        patternInvalidation: true,
        monitoring: true,
        recommendations: true,
        autoScaling: false, // Future feature
    },
} as const;

// Type definitions for cache configuration
export type CacheConfig = typeof cacheConfig;

// Helper functions for accessing config values
export const getCacheTTL = (type: keyof typeof cacheConfig.redis.ttl): number => {
    return cacheConfig.redis.ttl[type] || cacheConfig.redis.ttl.default;
};

export const getCachePattern = (type: keyof typeof cacheConfig.redis.patterns): string => {
    return cacheConfig.redis.patterns[type];
};

export const isFeatureEnabled = (feature: keyof typeof cacheConfig.features): boolean => {
    return cacheConfig.features[feature];
};

export const getPerformanceThreshold = (
    metric: keyof typeof cacheConfig.redis.performance
): number => {
    return cacheConfig.redis.performance[metric];
};

export const getMonitoringConfig = () => cacheConfig.monitoring;

export default cacheConfig; 