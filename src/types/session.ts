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
  sentiment: number;
  engagement: number;
  riskLevel: number;
  interventionSuccess: number;
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

export interface SessionState {
  id: string;
  clientId: string;
  mode: SessionMode;
  status: 'active' | 'completed' | 'error';
  startTime: Date;
  endTime?: Date;
  metrics: SessionMetrics;
  lastActivity?: Date;
  nodeId?: string;
  version?: number;
}

export interface SessionManager {
  startSession(clientId: string, mode: SessionMode): Promise<SessionState>;
  getSession(sessionId: string): Promise<SessionState | null>;
  updateSession(sessionId: string, updates: Partial<SessionState>): Promise<SessionState | null>;
  endSession(sessionId: string): Promise<void>;
}

export interface DistributedSessionEvents {
  'session:update': (sessionId: string, session: SessionState) => void;
  'session:end': (sessionId: string) => void;
  'node:heartbeat': (nodeId: string) => void;
  'node:offline': (nodeId: string) => void;
}
