import { User } from '@/config/supabase';

export interface UsageMetrics {
    period: {
        start: Date;
        end: Date;
    };
    users: {
        total: number;
        active: number;
        new: number;
        returning: number;
    };
    sessions: {
        total: number;
        completed: number;
        cancelled: number;
        averageDuration: number;
    };
    resources: {
        storage: {
            used: number;
            available: number;
            files: number;
        };
        bandwidth: {
            incoming: number;
            outgoing: number;
            peak: number;
        };
        compute: {
            cpu: number;
            memory: number;
            operations: number;
        };
    };
}

export interface UserUsage {
    userId: string;
    user: User;
    period: {
        start: Date;
        end: Date;
    };
    sessions: {
        count: number;
        duration: number;
        types: Record<string, number>;
    };
    resources: {
        storage: number;
        bandwidth: number;
        apiCalls: number;
    };
    features: {
        name: string;
        usage: number;
        limit: number;
    }[];
    billing?: {
        plan: string;
        cost: number;
        overages: number;
    };
}

export interface FeatureUsage {
    name: string;
    period: {
        start: Date;
        end: Date;
    };
    metrics: {
        totalUses: number;
        uniqueUsers: number;
        averageUsagePerUser: number;
        peakUsage: {
            value: number;
            timestamp: Date;
        };
    };
    distribution: {
        byTime: Record<string, number>;
        byUserType: Record<string, number>;
        byPlatform: Record<string, number>;
    };
    performance: {
        averageResponseTime: number;
        errorRate: number;
        availability: number;
    };
}

export interface UsageQuota {
    feature: string;
    limit: number;
    used: number;
    remaining: number;
    resetDate: Date;
    alerts: {
        warning: number;
        critical: number;
    };
    overages: {
        allowed: boolean;
        cost: number;
        limit: number;
    };
}

export interface UsageAlert {
    id: string;
    type: 'WARNING' | 'CRITICAL' | 'INFO';
    feature: string;
    threshold: number;
    currentValue: number;
    timestamp: Date;
    message: string;
    metadata?: {
        userId?: string;
        resourceId?: string;
        recommendations?: string[];
    };
}

export interface UsageReport {
    id: string;
    period: {
        start: Date;
        end: Date;
    };
    overview: {
        totalCost: number;
        activeUsers: number;
        resourceUtilization: number;
        growth: number;
    };
    details: {
        byFeature: Record<string, FeatureUsage>;
        byUser: Record<string, UserUsage>;
        byResource: Record<string, number>;
    };
    trends: {
        daily: Record<string, number>;
        weekly: Record<string, number>;
        monthly: Record<string, number>;
    };
    recommendations: {
        type: string;
        description: string;
        impact: number;
        difficulty: number;
    }[];
}

// Re-export usage-related implementations
export * from './usageTracker';
export * from './quotaManager';
export * from './alertManager';
export * from './reportGenerator'; 