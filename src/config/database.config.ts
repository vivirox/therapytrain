// Database configuration types
export interface DatabasePerformanceConfig {
    slowQueryThreshold: number;
    errorRateThreshold: number;
    slowQueryRateThreshold: number;
    maxConcurrentQueries: number;
}

export interface DatabaseCachePattern {
    ttl: number;
    invalidateOnWrite: boolean;
}

export interface DatabaseCacheConfig {
    enabled: boolean;
    defaultTTL: number;
    maxEntries: number;
    patterns: {
        sessions: DatabaseCachePattern;
        profiles: DatabaseCachePattern;
        messages: DatabaseCachePattern;
    };
}

export interface DatabaseOptimizationConfig {
    batchSize: number;
    maxRetries: number;
    retryDelay: number;
    indexes: {
        sessions: string[];
        profiles: string[];
        messages: string[];
    };
}

export interface DatabaseMonitoringConfig {
    enabled: boolean;
    metrics: {
        collection: {
            interval: number;
            retention: number;
        };
        aggregation: {
            interval: number;
            types: string[];
        };
    };
    alerts: {
        slowQuery: {
            threshold: number;
            cooldown: number;
        };
        errorRate: {
            threshold: number;
            interval: number;
        };
        concurrency: {
            threshold: number;
            interval: number;
        };
    };
}

export interface DatabasePoolConfig {
    min: number;
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
    maxUses: number;
}

export interface DatabaseTimeoutConfig {
    default: number;
    long: number;
    transaction: number;
}

export interface DatabaseFeatureConfig {
    monitoring: boolean;
    caching: boolean;
    queryOptimization: boolean;
    connectionPooling: boolean;
    autoIndexing: boolean;
}

export interface DatabaseConfig {
    performance: DatabasePerformanceConfig;
    cache: DatabaseCacheConfig;
    optimization: DatabaseOptimizationConfig;
    monitoring: DatabaseMonitoringConfig;
    pool: DatabasePoolConfig;
    timeouts: DatabaseTimeoutConfig;
    features: DatabaseFeatureConfig;
}

export const databaseConfig: DatabaseConfig = {
    // Query performance thresholds
    performance: {
        slowQueryThreshold: 1000, // 1 second
        errorRateThreshold: 0.1, // 10% error rate
        slowQueryRateThreshold: 0.2, // 20% slow queries
        maxConcurrentQueries: 50,
    },

    // Cache settings
    cache: {
        enabled: true,
        defaultTTL: 60000, // 1 minute
        maxEntries: 1000,
        patterns: {
            sessions: {
                ttl: 300000, // 5 minutes
                invalidateOnWrite: true,
            },
            profiles: {
                ttl: 600000, // 10 minutes
                invalidateOnWrite: true,
            },
            messages: {
                ttl: 30000, // 30 seconds
                invalidateOnWrite: true,
            },
        },
    },

    // Query optimization settings
    optimization: {
        batchSize: 100,
        maxRetries: 3,
        retryDelay: 1000, // 1 second
        indexes: {
            sessions: ['client_id', 'therapist_id', 'status', 'created_at'],
            profiles: ['user_id', 'email', 'updated_at'],
            messages: ['session_id', 'user_id', 'created_at'],
        },
    },

    // Monitoring settings
    monitoring: {
        enabled: true,
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
        alerts: {
            slowQuery: {
                threshold: 1000,
                cooldown: 300000, // 5 minutes
            },
            errorRate: {
                threshold: 0.1,
                interval: 300000, // 5 minutes
            },
            concurrency: {
                threshold: 50,
                interval: 60000, // 1 minute
            },
        },
    },

    // Connection pool settings
    pool: {
        min: 2,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        maxUses: 7500,
    },

    // Query timeout settings
    timeouts: {
        default: 5000, // 5 seconds
        long: 30000, // 30 seconds
        transaction: 60000, // 1 minute
    },

    // Feature flags
    features: {
        monitoring: true,
        caching: true,
        queryOptimization: true,
        connectionPooling: true,
        autoIndexing: false, // Future feature
    },
} as const;

// Type definitions
export type DatabaseConfig = typeof databaseConfig;

// Helper functions
export const getQueryTimeout = (type: keyof typeof databaseConfig.timeouts): number => {
    return databaseConfig.timeouts[type] || databaseConfig.timeouts.default;
};

export const getCacheTTL = (table: keyof typeof databaseConfig.cache.patterns): number => {
    return databaseConfig.cache.patterns[table]?.ttl || databaseConfig.cache.defaultTTL;
};

export const shouldInvalidateCache = (table: keyof typeof databaseConfig.cache.patterns): boolean => {
    return databaseConfig.cache.patterns[table]?.invalidateOnWrite ?? true;
};

export const getTableIndexes = (table: keyof typeof databaseConfig.optimization.indexes): string[] => {
    return databaseConfig.optimization.indexes[table] || [];
};

export const isFeatureEnabled = (feature: keyof typeof databaseConfig.features): boolean => {
    return databaseConfig.features[feature];
};

export const getPerformanceThreshold = (
    metric: keyof typeof databaseConfig.performance
): number => {
    return databaseConfig.performance[metric];
};

export const getPoolConfig = () => databaseConfig.pool;

export const getMonitoringConfig = () => databaseConfig.monitoring;

export default databaseConfig; 