export interface Session {
  id: string;
  clientId: string;
  mode: 'chat' | 'voice' | 'video';
  status: 'active' | 'completed' | 'cancelled';
  startTime: string;
  endTime?: string;
  metrics?: {
    duration: number;
    messageCount: number;
    responseTime: number;
  };
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  sessionId: string;
  parentId?: string;
  content: string;
  type: 'user' | 'assistant';
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  role: 'client' | 'therapist' | 'admin';
  profile?: {
    name: string;
    timezone: string;
    preferences: Record<string, any>;
  };
  created_at: string;
  updated_at: string;
}
