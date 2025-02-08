export interface AnalyticsEvent {
    id: string;
    type: string;
    timestamp: Date;
    userId: string;
    data: Record<string, any>;
    metadata?: Record<string, any>;
}

export interface AnalyticsFilter {
    startDate?: Date;
    endDate?: Date;
    eventType?: string;
    userId?: string;
    limit?: number;
    offset?: number;
}

export interface AnalyticsConfig {
    retentionPeriod: number;
    batchSize: number;
    flushInterval: number;
    exportFormat: 'JSON' | 'CSV';
    encryptionEnabled: boolean;
    compressionEnabled: boolean;
}

export interface LearningAnalytics {
    userId: string;
    skillProgress: Record<string, number>;
    completedTutorials: string[];
    currentSkillLevel: string;
    learningPathProgress: {
        pathId: string;
        progress: number;
        completedSteps: string[];
        nextStep?: string;
    }[];
    timestamp: Date;
}

export interface SkillGrowth {
    skillId: string;
    initialLevel: number;
    currentLevel: number;
    growthRate: number;
    milestones: Array<{
        level: number;
        achievedAt: Date;
        tutorialId?: string;
    }>;
}

export interface AnalyticsData {
    events: AnalyticsEvent[];
    learningProgress: LearningAnalytics;
    skillGrowth: SkillGrowth[];
    summary: {
        totalEvents: number;
        activeUsers: number;
        averageSkillGrowth: number;
        completionRate: number;
    };
}

export interface MetricsData {
    totalSessions: number;
    totalMessages: number;
    totalDuration: number;
    activeUsers: number;
    averageSessionDuration: number;
    messageDistribution: {
        user: number;
        assistant: number;
        system: number;
    };
    topicDistribution: Record<string, number>;
    emotionalStates: Record<string, number>;
    interventions: {
        total: number;
        successful: number;
        byType: Record<string, number>;
    };
    timestamp: Date;
} 