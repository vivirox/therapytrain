import type { LearningNode } from './learningpath';
import type { TutorialStep } from './tutorialpathway';

export interface RecommendationContext {
  userId: string;
  currentTopic?: string;
  learningHistory: Array<{
    nodeId: string;
    timestamp: Date;
    performance: number;
  }>;
  preferences: Record<string, unknown>;
  skillLevel: Record<string, number>;
}

export interface Recommendation {
  id: string;
  type: 'learning_node' | 'tutorial' | 'resource' | 'exercise';
  title: string;
  description: string;
  confidence: number;
  reason: string;
  content: LearningNode | TutorialStep | Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface RecommendationFeedback {
  userId: string;
  recommendationId: string;
  helpful: boolean;
  timestamp: Date;
  feedback?: string;
  engagement: number;
  completion?: boolean;
}

export interface RecommendationMetrics {
  acceptanceRate: number;
  completionRate: number;
  averageEngagement: number;
  feedbackScore: number;
  topPerformingTypes: Array<{
    type: string;
    score: number;
  }>;
}

export interface RecommendationService {
  getRecommendations(context: RecommendationContext): Promise<Recommendation[]>;
  trackFeedback(feedback: RecommendationFeedback): Promise<void>;
  updateContext(userId: string, context: Partial<RecommendationContext>): Promise<void>;
  getMetrics(userId: string): Promise<RecommendationMetrics>;
  refineRecommendations(userId: string, feedback: RecommendationFeedback[]): Promise<void>;
}

export interface RecommendationConfig {
  maxRecommendations: number;
  minConfidence: number;
  feedbackWeight: number;
  contextUpdateInterval: number;
  enablePersonalization: boolean;
} 