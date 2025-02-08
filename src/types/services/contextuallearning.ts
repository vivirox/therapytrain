import type { ChatMessage } from './chat';

export interface LearningContext {
  userId: string;
  sessionId: string;
  topics: string[];
  difficulty: number;
  progress: number;
  lastActivity: Date;
  preferences: Record<string, unknown>;
}

export interface LearningEvent {
  type: 'completion' | 'struggle' | 'skip' | 'review' | 'feedback';
  timestamp: Date;
  userId: string;
  sessionId: string;
  topicId: string;
  data: Record<string, unknown>;
}

export interface LearningMetrics {
  completionRate: number;
  averageTime: number;
  strugglePoints: string[];
  mastery: Record<string, number>;
  engagement: number;
}

export interface ContextualLearningService {
  updateContext(userId: string, context: Partial<LearningContext>): Promise<LearningContext>;
  trackEvent(event: LearningEvent): Promise<void>;
  getMetrics(userId: string): Promise<LearningMetrics>;
  suggestNextTopic(userId: string): Promise<{
    topicId: string;
    reason: string;
    confidence: number;
  }>;
  analyzeMessage(message: ChatMessage): Promise<{
    detectedTopics: string[];
    suggestedActions: Array<{
      type: string;
      payload: unknown;
    }>;
  }>;
}

export interface ContextualLearningConfig {
  adaptationRate: number;
  minConfidence: number;
  maxDifficulty: number;
  topicDetectionThreshold: number;
  enableAdaptiveLearning: boolean;
} 