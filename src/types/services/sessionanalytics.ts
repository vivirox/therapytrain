import type { AnalyticsEvent } from './analytics';

export interface SessionMetrics {
  sessionId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  interactionCount: number;
  messageCount: number;
  emotionalStates: Record<string, number>;
  interventions: string[];
  outcomes: Record<string, unknown>;
}

export interface SessionAnalyticsService {
  startSession(userId: string): Promise<string>;
  endSession(sessionId: string): Promise<void>;
  trackSessionEvent(sessionId: string, event: AnalyticsEvent): Promise<void>;
  getSessionMetrics(sessionId: string): Promise<SessionMetrics>;
  getUserSessions(userId: string, startDate: Date, endDate: Date): Promise<SessionMetrics[]>;
  analyzeSessionTrends(userId: string): Promise<Record<string, unknown>>;
}

export interface SessionAnalyticsConfig {
  sessionTimeout: number;
  trackEmotionalStates: boolean;
  trackInterventions: boolean;
  metricsRetentionDays: number;
} 