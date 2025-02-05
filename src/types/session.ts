export interface SessionState {
  id: string;
  clientId: string;
  therapistId: string;
  startTime: Date;
  endTime?: Date;
  status: SessionStatus;
  type: SessionType;
  metrics: SessionMetrics;
  interventions: Intervention[];
  notes: SessionNote[];
  flags: SessionFlag[];
}

export type SessionStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

export type SessionType = 'initial' | 'follow-up' | 'crisis' | 'group' | 'assessment';

export interface SessionMetrics {
  duration: number;
  sentiment: number;
  engagement: number;
  progress: number;
  riskLevel: number;
  interventionEffectiveness: number;
  clientSatisfaction?: number;
  therapistConfidence?: number;
}

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
