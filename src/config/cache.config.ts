// Cache configuration types
export interface RedisTTLConfig {
    session: number;
    branch: number;
    metrics: number;
    messages: number;
    default: number;
    sessions: number;
    templates: number;
    preferences: number;
    rateLimit: number;
}

export interface RedisPatternConfig {
    activeSessions: string;
    completedSessions: string;
    sessionBranches: string;
    metrics: string;
    messages: string;
    userPreferences: string;
    chatSessions: string;
    failedMessages: string;
    rateLimit: string;
}

export interface RedisPerformanceConfig {
    minHitRate: number;
    maxLatency: number;
    maxInvalidationRate: number;
    metricsHistoryLength: number;
    metricsCollectionInterval: number;
}

export interface RedisCleanupConfig {
    interval: number;
    inactiveTimeout: number;
    maxKeys: number;
}

export interface RedisMemoryConfig {
    maxMemoryPolicy: 'allkeys-lru' | 'volatile-lru' | 'allkeys-random' | 'volatile-random';
    maxMemoryBytes: number;
    warningThreshold: number;
}

export interface RedisSmartCachingConfig {
    enabled: boolean;
    patternThreshold: number;
    warmInterval: number;
    maxHistory: number;
    confidenceThreshold: number;
    ttlMultiplier: number;
    categories: {
        hot: {
            minAccessCount: number;
            maxInactiveTime: number;
        };
        cold: {
            minInactiveTime: number;
            maxAccessCount: number;
        };
    };
    optimization: {
        interval: number;
        maxPredictions: number;
        maxWarmingConcurrency: number;
    };
}

export interface RedisConfig {
    connection: {
        maxRetriesPerRequest: number;
        connectTimeout: number;
        commandTimeout: number;
        enableOfflineQueue: boolean;
        retryStrategy: (times: number) => number;
    };
    ttl: RedisTTLConfig;
    patterns: RedisPatternConfig;
    performance: RedisPerformanceConfig;
    cleanup: RedisCleanupConfig;
    memory: RedisMemoryConfig;
    smartCaching: RedisSmartCachingConfig;
}

export interface MonitoringConfig {
    enabled: boolean;
    alertThresholds: {
        hitRate: number;
        latency: number;
        errorRate: number;
        memoryUsage: number;
    };
    metrics: {
        collection: {
            interval: number;
            retention: number;
        };
    };
}

export interface CacheConfig {
    redis: RedisConfig;
    monitoring: MonitoringConfig;
}

export const cacheConfig: CacheConfig = {
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
            messages: 604800, // 7 days
            default: 3600, // 1 hour
            sessions: 86400, // 24 hours
            templates: 60 * 60 * 24 * 365, // 1 year
            preferences: 3600, // 1 hour
            rateLimit: 60, // 1 minute
        },

        // Patterns for grouped cache management
        patterns: {
            activeSessions: 'active-sessions',
            completedSessions: 'completed-sessions',
            sessionBranches: 'session-branches',
            metrics: 'metrics',
            messages: 'messages',
            userPreferences: 'user:preferences',
            chatSessions: 'chat:sessions',
            failedMessages: 'failed:messages',
            rateLimit: 'rate:limit',
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

        // Smart caching settings
        smartCaching: {
            enabled: true,
            patternThreshold: 5, // Minimum accesses to establish a pattern
            warmInterval: 60000, // 1 minute
            maxHistory: 100, // Maximum number of access timestamps to keep
            confidenceThreshold: 0.8, // Minimum confidence for predictions
            ttlMultiplier: 1.5, // Multiplier for hot keys TTL
            categories: {
                hot: {
                    minAccessCount: 10,
                    maxInactiveTime: 300000, // 5 minutes
                },
                cold: {
                    minInactiveTime: 3600000, // 1 hour
                    maxAccessCount: 5,
                },
            },
            optimization: {
                interval: 300000, // 5 minutes
                maxPredictions: 1000,
                maxWarmingConcurrency: 10,
            },
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
        smartCaching: true,
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

export const getSmartCachingConfig = () => {
    return cacheConfig.redis.smartCaching;
};

export default cacheConfig; 