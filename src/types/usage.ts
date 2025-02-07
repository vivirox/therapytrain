export interface UsageMetrics {
    id: string;
    userId: string;
    sessionId?: string;
    type: string;
    value: number;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface UsageData {
    metrics: UsageMetrics[];
    summary: {
        totalUsage: number;
        averageUsage: number;
        peakUsage: number;
        lastUsed: Date;
    };
    trends: {
        daily: Record<string, number>;
        weekly: Record<string, number>;
        monthly: Record<string, number>;
    };
}

export interface UsageConfig {
    enabled: boolean;
    trackingLevel: 'basic' | 'detailed' | 'comprehensive';
    retentionDays: number;
    anonymize: boolean;
    excludedEvents: string[];
}

export interface UsageStatus {
    status: 'active' | 'inactive' | 'error';
    lastUpdate: Date;
    metrics: {
        totalEvents: number;
        uniqueUsers: number;
        storageUsed: number;
    };
}

export interface UsageEvent {
    id: string;
    type: string;
    userId: string;
    sessionId?: string;
    timestamp: Date;
    data: Record<string, any>;
}

export interface UsageReport {
    id: string;
    period: {
        start: Date;
        end: Date;
    };
    metrics: UsageMetrics[];
    summary: {
        totalUsage: number;
        uniqueUsers: number;
        averageUsagePerUser: number;
        topUsers: Array<{
            userId: string;
            usage: number;
        }>;
    };
    trends: {
        daily: Record<string, number>;
        weekly: Record<string, number>;
        monthly: Record<string, number>;
    };
}

export interface UsageAlert {
    id: string;
    type: 'threshold' | 'anomaly' | 'trend';
    severity: 'low' | 'medium' | 'high';
    message: string;
    timestamp: Date;
    metadata: Record<string, any>;
}

export interface UsageQuota {
    id: string;
    userId: string;
    limit: number;
    used: number;
    reset: Date;
    alerts: boolean;
}

export interface UsageFilter {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    sessionId?: string;
    types?: string[];
    minValue?: number;
    maxValue?: number;
}

export interface UsageAggregation {
    period: 'hourly' | 'daily' | 'weekly' | 'monthly';
    groupBy?: string[];
    metrics: string[];
}

export interface UsageExport {
    format: 'csv' | 'json' | 'excel';
    data: any[];
    metadata: {
        generated: Date;
        filters: UsageFilter;
        aggregation?: UsageAggregation;
    };
}

export const generateUsages = (days: number, usersCount: number): UsageMetrics[] => {
    const usages: UsageMetrics[] = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
        for (let j = 0; j < usersCount; j++) {
            usages.push({
                id: `usage_${i}_${j}`,
                userId: `user_${j}`,
                type: 'session',
                value: Math.floor(Math.random() * 100),
                timestamp: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
                metadata: {
                    source: 'web',
                    platform: 'desktop'
                }
            });
        }
    }

    return usages;
};

export const USAGE_METRICS = generateUsages(23, 14);
