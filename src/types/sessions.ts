interface SessionMetadata {
  mood_score?: number;
  session_goals?: Array<string>;
  key_topics?: Array<string>;
  follow_up_items?: Array<string>;
  ai_insights?: {
    patterns?: Array<string>;
    recommendations?: Array<string>;
  };
}

export interface TherapySession {
  id: string;
  client_id: string;
  therapist_id: string;
  ai_model_id: string;
  session_metadata: SessionMetadata;
  created_at: string;
}
