export interface ChatMessage {
  content: string;
  senderType: 'therapist' | 'client' | 'system';
  interventionType?: string;
  approach?: string;
  timestamp?: string;
}

export interface EmotionalAnalysis {
  primaryEmotion: string;
  intensity: number;
  triggers: Array<string>;
}

export interface TherapySession {
  session_id: string;
  client_profile: string;
  status: 'active' | 'completed' | 'paused';
  messages: Array<ChatMessage>;
  emotional_state: string;
}