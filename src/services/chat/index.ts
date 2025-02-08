export * from '@/emotionalstate';
export * from '@/messagehandler';
export * from '@/supabasechat';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ChatSession {
  id: string;
  messages: Message[];
  status: 'active' | 'paused' | 'ended';
  startTime: Date;
  endTime?: Date;
  metadata?: Record<string, unknown>;
}

export interface ChatAnalytics {
  sessionId: string;
  messageCount: number;
  averageResponseTime: number;
  userSentiment: number;
  topicsCovered: string[];
  interventionsUsed: string[];
  sessionDuration: number;
  timestamp: Date;
} 