import { BaseEntity, Metadata } from './common';
import { UserProfile } from './user';
import { Message } from './chat';

export interface Session extends BaseEntity {
  user_id: string;
  client_id: string;
  status: SessionStatus;
  mode: SessionMode;
  metrics: SessionMetrics | null;
  metadata?: Metadata;
}

export type SessionStatus = 'active' | 'completed' | 'cancelled';

export type SessionMode = 'chat' | 'video' | 'audio' | 'in-person';

export interface SessionMetrics {
  duration: number;
  message_count: number;
  response_time_avg: number;
  sentiment_scores: {
    positive: number;
    negative: number;
    neutral: number;
  };
  engagement_score: number;
  therapeutic_progress: number;
  risk_level: 'low' | 'medium' | 'high';
  metadata?: Metadata;
}

export interface SessionConfig {
  mode: SessionMode;
  duration?: number;
  preferences?: {
    language: string;
    timezone: string;
    notifications: boolean;
    recording: boolean;
  };
  security?: {
    encryption: boolean;
    privacy_level: 'standard' | 'high';
  };
  metadata?: Metadata;
}

export interface SessionParticipant {
  user: UserProfile;
  role: 'therapist' | 'client';
  joined_at: string;
  left_at?: string;
  metadata?: Metadata;
}

export interface SessionEvent {
  id: string;
  session_id: string;
  type: SessionEventType;
  data: Record<string, unknown>;
  created_at: string;
  metadata?: Metadata;
}

export type SessionEventType =
  | 'session_started'
  | 'session_ended'
  | 'participant_joined'
  | 'participant_left'
  | 'message_sent'
  | 'intervention_applied'
  | 'risk_level_changed'
  | 'mode_changed';

export interface SessionSummary {
  id: string;
  session_id: string;
  summary: string;
  key_points: string[];
  action_items: string[];
  risk_factors: string[];
  next_steps: string[];
  created_at: string;
  metadata?: Metadata;
}

export interface SessionFeedback {
  id: string;
  session_id: string;
  user_id: string;
  rating: number;
  comments: string;
  areas_of_improvement: string[];
  created_at: string;
  metadata?: Metadata;
}

export interface SessionAnalytics {
  session_id: string;
  metrics: SessionMetrics;
  events: SessionEvent[];
  feedback?: SessionFeedback[];
  summary?: SessionSummary;
  metadata?: Metadata;
}

export interface SessionManager {
  createSession: (config: SessionConfig) => Promise<Session>;
  endSession: (session_id: string) => Promise<void>;
  getSession: (session_id: string) => Promise<Session>;
  updateSession: (session_id: string, updates: Partial<Session>) => Promise<Session>;
  getSessionMetrics: (session_id: string) => Promise<SessionMetrics>;
  getSessionEvents: (session_id: string) => Promise<SessionEvent[]>;
  getSessionSummary: (session_id: string) => Promise<SessionSummary>;
  getSessionFeedback: (session_id: string) => Promise<SessionFeedback[]>;
  getSessionAnalytics: (session_id: string) => Promise<SessionAnalytics>;
}
