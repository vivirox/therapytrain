export enum SessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum SessionMode {
  CHAT = 'chat',
  VOICE = 'voice',
  VIDEO = 'video'
}

export interface SessionState {
  id: string;
  clientId: string;
  therapistId: string;
  status: SessionStatus;
  mode: SessionMode;
  startTime: string;
  endTime?: string;
  duration: number;
  metrics: {
    engagement: number;
    progress: number;
    riskLevel: number;
  };
  notes: {
    therapist?: string;
    system?: string;
  };
  goals: Array<{
    id: string;
    description: string;
    status: 'pending' | 'in-progress' | 'completed';
    progress: number;
  }>;
  interventions: Array<{
    id: string;
    type: string;
    timestamp: string;
    description: string;
    outcome?: string;
  }>;
  flags: {
    needsAttention?: boolean;
    riskAssessment?: boolean;
    followUpRequired?: boolean;
  };
  privacy: {
    recordingConsent: boolean;
    dataSharing: boolean;
    restrictions?: string[];
  };
  metadata: {
    platform: string;
    version: string;
    features: string[];
    settings: Record<string, any>;
  };
}

export interface SessionConfig {
  mode: SessionMode;
  duration?: number;
  features?: string[];
  preferences?: {
    language?: string;
    notifications?: boolean;
    accessibility?: Record<string, boolean>;
  };
  privacy?: {
    recordingConsent?: boolean;
    dataSharing?: boolean;
    restrictions?: string[];
  };
}

export interface SessionSummary {
  id: string;
  clientId: string;
  therapistId: string;
  status: SessionStatus;
  mode: SessionMode;
  startTime: string;
  endTime?: string;
  duration: number;
  progress: number;
  mainTopics: string[];
  keyInsights: string[];
  nextSteps: string[];
}

export interface SessionError extends Error {
  code: string;
  details?: Record<string, any>;
  retry?: boolean;
}

export interface SessionControls {
  startSession: (clientId: string, mode: SessionMode) => Promise<void>;
  endSession: (sessionId: string) => Promise<void>;
  pauseSession: (sessionId: string) => Promise<void>;
  resumeSession: (sessionId: string) => Promise<void>;
  switchMode: (sessionId: string, newMode: SessionMode) => Promise<void>;
}

export interface SessionMetrics {
  sentiment: number;
  engagement: number;
  progress: number;
  duration: number;
  interventions: number;
  goals: {
    set: number;
    achieved: number;
  };
}

export type SessionType = 'initial' | 'follow-up' | 'crisis' | 'group' | 'assessment';

export interface Intervention {
  id: string;
  sessionId: string;
  type: InterventionType;
  timestamp: Date;
  description: string;
  effectiveness?: number;
  clientResponse?: string;
  followUp?: string;
}

export type InterventionType =
  | 'cognitive-restructuring'
  | 'behavioral-activation'
  | 'exposure'
  | 'mindfulness'
  | 'skills-training'
  | 'psychoeducation'
  | 'crisis-intervention'
  | 'other';

export interface SessionNote {
  id: string;
  sessionId: string;
  timestamp: Date;
  content: string;
  type: NoteType;
  visibility: NoteVisibility;
  tags?: string[];
}

export type NoteType = 'observation' | 'assessment' | 'plan' | 'homework' | 'alert';

export type NoteVisibility = 'private' | 'shared' | 'supervisor-only';

export interface SessionFlag {
  id: string;
  sessionId: string;
  type: FlagType;
  severity: FlagSeverity;
  timestamp: Date;
  description: string;
  status: FlagStatus;
  resolution?: string;
}

export type FlagType = 'risk' | 'safety' | 'compliance' | 'technical' | 'quality';

export type FlagSeverity = 'low' | 'medium' | 'high' | 'critical';

export type FlagStatus = 'active' | 'resolved' | 'dismissed';
