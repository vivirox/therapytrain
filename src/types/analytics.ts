import { Usage } from '@/usage';
import { USAGE_METRICS } from '@/usage';

export interface LearningAnalytics {
    userId: string;
    metrics: {
        skillGrowth: SkillGrowth[];
        completionRate: number;
        averageScore: number;
        timeInvested: number;
        learningVelocity: number;
    };
    insights: {
        strengths: string[];
        weaknesses: string[];
        recommendations: string[];
    };
    progress: {
        currentLevel: number;
        nextMilestone: string;
        completedModules: string[];
    };
}

export interface SkillGrowth {
    skillId: string;
    skillName: string;
    initialLevel: number;
    currentLevel: number;
    growthRate: number;
    lastAssessment: Date;
}

export interface AnalyticsData {
    id: string;
    timestamp: Date;
    eventType: string;
    userId: string;
    sessionId?: string;
    data: Record<string, any>;
    metadata?: {
        source: string;
        version: string;
        environment: string;
    };
}

export interface MetricsData {
    id: string;
    name: string;
    value: number;
    unit: string;
    timestamp: Date;
    tags: Record<string, string>;
    metadata?: Record<string, any>;
}

export interface AnalyticsConfig {
    enabled: boolean;
    samplingRate: number;
    retentionDays: number;
    anonymize: boolean;
    excludedEvents: string[];
}

export interface AnalyticsEvent {
    id: string;
    type: string;
    timestamp: Date;
    userId?: string;
    sessionId?: string;
    data: Record<string, any>;
}

export interface AnalyticsFilter {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    sessionId?: string;
    eventTypes?: string[];
    tags?: Record<string, string>;
}

export interface AnalyticsSummary {
    totalEvents: number;
    uniqueUsers: number;
    activeSessions: number;
    eventsByType: Record<string, number>;
    topUsers: Array<{
        userId: string;
        eventCount: number;
    }>;
    timeDistribution: Record<string, number>;
}

export interface AnalyticsReport {
    id: string;
    name: string;
    description: string;
    period: {
        start: Date;
        end: Date;
    };
    summary: AnalyticsSummary;
    details: Record<string, any>;
    metadata: {
        generatedAt: Date;
        version: string;
        filters: AnalyticsFilter;
    };
}

export interface MetricItem {
    id: string;
    name: string;
    value: number;
    unit: string;
    timestamp: Date;
    tags: Record<string, string>;
    metadata?: Record<string, any>;
}

export interface MetricGroup {
    name: string;
    metrics: MetricItem[];
    summary: {
        total: number;
        average: number;
        min: number;
        max: number;
    };
}

export interface MetricSnapshot {
    timestamp: Date;
    metrics: MetricGroup[];
    tags: Record<string, string>;
}

export interface MetricTrend {
    metric: string;
    period: string;
    values: Array<{
        timestamp: Date;
        value: number;
    }>;
    trend: 'increasing' | 'decreasing' | 'stable';
}

export interface MetricAlert {
    id: string;
    metric: string;
    threshold: number;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    value: number;
    timestamp: Date;
    status: 'active' | 'resolved';
}

export interface MetricDashboard {
    id: string;
    name: string;
    description: string;
    metrics: MetricGroup[];
    layout: Array<{
        id: string;
        type: 'chart' | 'gauge' | 'table';
        position: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        config: Record<string, any>;
    }>;
}

export const THERAPY_METRICS = {
    sessions: [
        { id: 'metric1', name: 'Session Duration', value: 45, unit: 'minutes' },
        { id: 'metric2', name: 'Session Count', value: 12, unit: 'sessions' }
    ],
    engagement: [
        { id: 'metric3', name: 'Response Rate', value: 85, unit: 'percent' },
        { id: 'metric4', name: 'Completion Rate', value: 92, unit: 'percent' }
    ],
    outcomes: [
        { id: 'metric5', name: 'Progress Score', value: 78, unit: 'points' },
        { id: 'metric6', name: 'Satisfaction', value: 4.5, unit: 'stars' }
    ]
};
