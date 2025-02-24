export interface Client {
  id: string; // Unique identifier for the client
  name: string; // Name of the client
  age: number; // Age of the client
  primary_issue: string; // Primary issue of the client
  complexity: string; // Complexity of the client's situation
  description: string; // Description of the client
  key_traits?: Array<string>; // Key traits of the client
  background?: string; // Background information of the client
}

export interface ClientProfile {
  id: string;
  name: string;
  age: number;
  gender: string;
  primary_issue: string;
  key_traits: string[];
  background: string;
  goals: string[];
  preferences: {
    communication_style: string;
    therapy_type: string[];
    session_frequency: string;
  };
  progress: {
    sessions_completed: number;
    goals_achieved: string[];
    current_focus: string[];
    customized_focus?: string[];
  };
  risk_factors: string[];
  support_network: string[];
  medications: string[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ClientState {
  emotional_state: string;
  stress_level: number;
  engagement: number;
  progress: number;
  current_concerns: string[];
}

export interface ClientSession {
  id: string;
  client_id: string;
  date: string;
  duration: number;
  type: string;
  notes: string;
  goals_discussed: string[];
  progress_made: string[];
  next_steps: string[];
  emotional_state: ClientState;
}

export interface ClientInteraction {
  timestamp: number;
  type: 'message' | 'intervention' | 'assessment';
  content: string;
  emotional_indicators?: {
    sentiment: number;
    emotions: string[];
    intensity: number;
  };
  metadata?: Record<string, unknown>;
}