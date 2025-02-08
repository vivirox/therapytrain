import { EmotionState } from '@/emotions';
import { ChatSession } from '@/chat';

export interface MetricValue {
    value: number;
    timestamp: Date;
    metadata?: {
        source: string;
        confidence: number;
        context?: string;
    };
}

export interface TimeSeriesMetric {
    id: string;
    name: string;
    type: 'COUNTER' | 'GAUGE' | 'HISTOGRAM';
    unit: string;
    values: MetricValue[];
    metadata?: {
        description: string;
        tags: string[];
        aggregation: string;
    };
}

export interface SessionMetrics {
    sessionId: string;
    duration: number;
    messageCount: number;
    participantCount: number;
    emotionalStates: {
        userId: string;
        states: EmotionState[];
    }[];
    interventions: {
        count: number;
        successful: number;
        types: Record<string, number>;
    };
    engagement: {
        messageFrequency: number;
        responseTime: number;
        interactionDepth: number;
    };
}

export interface UserMetrics {
    userId: string;
    period: {
        start: Date;
        end: Date;
    };
    sessions: {
        total: number;
        completed: number;
        duration: {
            average: number;
            total: number;
        };
    };
    emotions: {
        dominant: string;
        distribution: Record<string, number>;
        stability: number;
    };
    progress: {
        skillsImproved: number;
        goalsAchieved: number;
        milestones: number;
    };
    engagement: {
        frequency: number;
        consistency: number;
        quality: number;
    };
}

export interface SystemMetrics {
    timestamp: Date;
    performance: {
        cpu: number;
        memory: number;
        latency: number;
        errors: number;
    };
    usage: {
        activeUsers: number;
        concurrentSessions: number;
        messageRate: number;
        storageUsed: number;
    };
    availability: {
        uptime: number;
        incidents: number;
        responseTime: number;
    };
    security: {
        authAttempts: number;
        failedLogins: number;
        suspiciousActivities: number;
    };
}

export interface MetricsQuery {
    metric: string;
    period: {
        start: Date;
        end: Date;
        interval?: string;
    };
    filters?: {
        userId?: string;
        sessionId?: string;
        type?: string;
        tags?: string[];
    };
    aggregation?: {
        function: 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT';
        groupBy?: string[];
    };
}

export interface MetricsReport {
    id: string;
    title: string;
    description: string;
    period: {
        start: Date;
        end: Date;
    };
    metrics: {
        name: string;
        value: number | Record<string, number>;
        trend: number;
        status: 'GOOD' | 'WARNING' | 'CRITICAL';
    }[];
    insights: {
        type: string;
        description: string;
        importance: number;
        recommendations?: string[];
    }[];
    metadata?: {
        author: string;
        createdAt: Date;
        format: string;
        tags: string[];
    };
}

// Re-export metrics-related implementations
export * from './metricCollector';
export * from './metricAggregator';
export * from './reportGenerator';
export * from './alertManager'; 