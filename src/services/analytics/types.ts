export interface AnalyticsEvent {
  type: string;
  userId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface SkillGrowth {
  skillId: string;
  previousLevel: number;
  currentLevel: number;
  growthRate: number;
}

export interface LearningAnalytics {
  userId: string;
  period: {
    start: number;
    end: number;
  };
  metrics: {
    skillGrowth: SkillGrowth[];
    completionRate: number;
    averageScore: number;
    timeInvested: number;
    learningVelocity: number;
  };
}

export interface EngagementMetrics {
  activeTime: number;
  interactionCount: number;
  completionRate: number;
  focusScore: number;
}

export interface PerformanceMetrics {
  accuracy: number;
  speed: number;
  consistency: number;
  improvement: number;
}

export interface SessionAnalytics {
  sessionId: string;
  userId: string;
  startTime: number;
  endTime: number;
  engagement: EngagementMetrics;
  performance: PerformanceMetrics;
  milestones: Array<{
    id: string;
    timestamp: number;
    type: string;
    data: Record<string, unknown>;
  }>;
}

export interface AnalyticsFilter {
  startDate?: number;
  endDate?: number;
  userId?: string;
  eventTypes?: string[];
  metrics?: string[];
}

export interface AnalyticsReport {
  timeframe: {
    start: number;
    end: number;
  };
  summary: {
    totalEvents: number;
    uniqueUsers: number;
    averageEngagement: number;
  };
  metrics: Record<string, number>;
  trends: Array<{
    date: number;
    metrics: Record<string, number>;
  }>;
}

export interface RealTimeMetrics {
  timestamp: number;
  activeUsers: number;
  currentSessions: number;
  eventRate: number;
  systemLoad: number;
}

export interface UserAnalytics {
  userId: string;
  lastActive: number;
  totalSessions: number;
  averageSessionDuration: number;
  completedObjectives: string[];
  skillLevels: Record<string, number>;
  preferences: Record<string, unknown>;
}

export interface AIAnalytics {
  timestamp: number;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  latency: number;
  accuracy: number;
  confidence: number;
  metadata: Record<string, unknown>;
} 