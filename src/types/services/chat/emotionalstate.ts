import type { ChatMessage, ChatContext } from '../chat';
import type { EmotionScores, Sentiment } from '../sentimentanalysis';

export interface EmotionalState {
  timestamp: Date;
  emotions: EmotionScores;
  sentiment: Sentiment;
  confidence: number;
  triggers?: Array<{
    type: string;
    confidence: number;
    evidence: string;
  }>;
}

export interface EmotionalStateHistory {
  userId: string;
  sessionId: string;
  states: EmotionalState[];
  aggregatedEmotions: EmotionScores;
  dominantEmotions: string[];
  emotionalTrend: 'improving' | 'stable' | 'deteriorating';
}

export interface EmotionalStateService {
  analyzeMessage(message: ChatMessage, context: ChatContext): Promise<EmotionalState>;
  getEmotionalHistory(sessionId: string): Promise<EmotionalStateHistory>;
  updateEmotionalState(sessionId: string, state: EmotionalState): Promise<void>;
  getEmotionalTrends(userId: string, startDate: Date, endDate: Date): Promise<Array<{
    date: Date;
    emotions: EmotionScores;
    sentiment: Sentiment;
  }>>;
}

export interface EmotionalStateConfig {
  updateFrequency: number;
  minConfidence: number;
  emotionThreshold: number;
  trendWindowSize: number;
  enableTriggerDetection: boolean;
} 