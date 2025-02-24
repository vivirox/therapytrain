export interface SessionMetrics {
  duration: number;
  messageCount: number;
  responseTime: number;
  engagementScore: number;
  emotionalState: string;
  interventionsUsed: string[];
  timestamp: Date;
}

export interface SessionConfig {
  maxDuration: number;
  inactivityTimeout: number;
  maxMessages: number;
  autoSaveInterval: number;
  encryptionEnabled: boolean;
  retentionPeriod: number;
}

export type SessionState = 
  | 'initializing'
  | 'active'
  | 'paused'
  | 'ending'
  | 'ended'
  | 'error';

export type SessionMode = 
  | 'standard'
  | 'crisis'
  | 'assessment'
  | 'followup'
  | 'training';

export interface SessionData {
  id: string;
  userId: string;
  state: SessionState;
  mode: SessionMode;
  startTime: Date;
  endTime?: Date;
  metrics: SessionMetrics;
  config: SessionConfig;
  metadata?: Record<string, unknown>;
}

export interface SessionService {
  createSession(userId: string, mode: SessionMode): Promise<SessionData>;
  getSession(sessionId: string): Promise<SessionData>;
  updateSession(sessionId: string, updates: Partial<SessionData>): Promise<SessionData>;
  endSession(sessionId: string): Promise<void>;
  getSessionMetrics(sessionId: string): Promise<SessionMetrics>;
  listSessions(userId: string): Promise<SessionData[]>;
}

export * from '@/services/sessionmanager';
export * from '@/services/sessionanalytics'; 