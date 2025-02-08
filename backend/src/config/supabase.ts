import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Message table types
export interface Message {
  id: string;
  content: string;
  role: 'SYSTEM' | 'ASSISTANT' | 'USER';
  sessionId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Session types
export interface ChatSession {
  id: string;
  userId: string;
  status: 'ACTIVE' | 'PAUSED' | 'ENDED';
  startTime: Date;
  endTime?: Date;
  messages: Message[];
  metadata?: {
    topic?: string;
    emotionalState?: string;
    interventions?: string[];
    goals?: string[];
    notes?: string;
  };
}

// User profile types
export interface UserProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

// User session types
export interface UserSession {
  id: string;
  userId: string;
  token: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  metadata?: Record<string, any>;
}

export interface Tables {
  messages: Message;
  chat_sessions: ChatSession;
  user_profiles: UserProfile;
  audit_logs: {
    id: string;
    eventType: string;
    userId: string;
    details: Record<string, any>;
    timestamp: Date;
    metadata?: Record<string, any>;
  };
}
