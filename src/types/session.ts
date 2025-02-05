export type SessionMode = 'chat' | 'video' | 'hybrid';

export interface SessionState {
  id: string;
  clientId: string;
  therapistId: string;
  mode: SessionMode;
  status: 'active' | 'ended' | 'paused';
  startTime: string;
  endTime?: string;
  metrics: {
    sentiment: number;
    engagement: number;
    progress: number;
  };
  settings: {
    notifications: boolean;
    recording: boolean;
    transcription: boolean;
  };
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

export type SessionStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

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
