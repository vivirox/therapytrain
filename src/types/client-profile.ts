export interface ClientProfile {
  id: string;
  name: string;
  email: string;
  primary_issue: string;
  secondary_issues?: string[];
  goals?: string[];
  preferences?: {
    communication_style?: string;
    session_frequency?: string;
    preferred_time?: string;
  };
  history?: {
    previous_therapy?: boolean;
    trauma_history?: boolean;
    medication?: string[];
  };
  risk_factors?: string[];
  support_system?: string[];
  coping_strategies?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ClientSession {
  id: string;
  client_id: string;
  start_time: string;
  end_time?: string;
  mode: 'chat' | 'video' | 'hybrid';
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
  metrics?: {
    engagement_score?: number;
    progress_rating?: number;
    emotional_state?: string[];
    intervention_effectiveness?: number;
  };
}

export interface Message {
  id: string;
  session_id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  analysis?: {
    sentiment?: number;
    topics?: string[];
    patterns?: string[];
    interventions?: string[];
  };
}

export interface Intervention {
  id: string;
  session_id: string;
  type: string;
  description: string;
  timestamp: string;
  client_response?: {
    emotionalShift: 'positive' | 'negative' | 'neutral';
    engagement: number;
    feedback?: string;
  };
  effectiveness_rating?: number;
  follow_up_notes?: string;
}