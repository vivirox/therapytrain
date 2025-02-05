import { User } from '@supabase/supabase-js';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  sessionId: string;
  userId: string;
  metadata?: {
    sentiment?: number;
    intent?: string;
    topics?: string[];
    [key: string]: any;
  };
}

export interface ChatSession {
  id: string;
  clientId: string;
  therapistId: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed' | 'cancelled';
  summary?: string;
  metrics?: {
    sentiment: number;
    engagement: number;
    progress: number;
    [key: string]: any;
  };
  tags?: string[];
  notes?: string;
}

export interface ChatState {
  messages: Message[];
  session: ChatSession | null;
  isLoading: boolean;
  error: Error | null;
}

export interface ChatContextType {
  state: ChatState;
  sendMessage: (content: string) => Promise<void>;
  startSession: (clientId: string) => Promise<void>;
  endSession: () => Promise<void>;
  clearChat: () => void;
}