import { EmotionalResponse, EmotionalContext } from './emotions';

export type TherapySessionStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
export type MessageRole = 'system' | 'user' | 'assistant';

export interface TherapySession {
  id: string;
  title: string;
  clientId: string;
  therapistId: string;
  status: TherapySessionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  notes?: string;
  tags?: string[];
  currentEmotionalState?: EmotionalResponse;
  emotionalContext?: EmotionalContext;
  metadata?: Record<string, any>;
}

export interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  emotionalState?: EmotionalResponse;
  metadata?: Record<string, any>;
}

export interface TherapySessionUpdate {
  title?: string;
  status?: TherapySessionStatus;
  endTime?: Date;
  duration?: number;
  notes?: string;
  tags?: string[];
  currentEmotionalState?: EmotionalResponse;
  emotionalContext?: EmotionalContext;
  metadata?: Record<string, any>;
}

export interface SessionSummary {
  id: string;
  sessionId: string;
  timestamp: Date;
  content: string;
  emotionalAnalysis: {
    dominantEmotions: EmotionalResponse[];
    significantChanges: number;
    stabilityScore: number;
    engagementScore: number;
  };
  keyTopics: string[];
  interventions: string[];
  progress: {
    goals: {
      id: string;
      description: string;
      progress: number;
    }[];
    overallProgress: number;
  };
  recommendations: string[];
  metadata?: Record<string, any>;
}

export interface TherapyGoal {
  id: string;
  clientId: string;
  description: string;
  status: 'active' | 'completed' | 'abandoned';
  priority: 'low' | 'medium' | 'high';
  targetDate?: Date;
  progress: number;
  notes?: string;
  relatedSessions: string[];
  emotionalProgress?: {
    startingState: EmotionalResponse;
    currentState: EmotionalResponse;
    progressTrend: 'improving' | 'stable' | 'declining';
  };
  metadata?: Record<string, any>;
}

export interface Intervention {
  id: string;
  sessionId: string;
  type: string;
  description: string;
  timestamp: Date;
  duration?: number;
  effectiveness?: number;
  emotionalImpact?: {
    before: EmotionalResponse;
    after: EmotionalResponse;
    change: 'positive' | 'neutral' | 'negative';
  };
  metadata?: Record<string, any>;
}

export interface TherapyMetrics {
  sessionId: string;
  timestamp: Date;
  duration: number;
  messageCount: number;
  clientEngagement: number;
  therapeuticAlliance: number;
  emotionalProgress: {
    startState: EmotionalResponse;
    endState: EmotionalResponse;
    volatility: number;
    improvement: number;
  };
  interventionEffectiveness: number;
  goalProgress: number;
  metadata?: Record<string, any>;
} 