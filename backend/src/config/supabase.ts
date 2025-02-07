import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

export const supabase: SupabaseClient<Database> = createClient(supabaseUrl, supabaseKey);

// Message table types
export interface Message {
  id: string;
  user_id: string;
  content: string;
  type: 'message' | 'ai_response' | 'status' | 'error';
  metadata: {
    sentiment?: number;
    topics?: string[];
    followUpQuestions?: string[];
  } | null;
  created_at: string;
  session_id: string;
}

// Session types
export interface ChatSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  last_activity: string;
  metadata: {
    topics?: string[];
    sentiment_summary?: number;
    crisis_detected?: boolean;
  } | null;
}

// User profile types
export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  preferred_name?: string;
  avatar_url?: string;
  preferences: {
    theme?: 'light' | 'dark';
    language?: string;
    notifications?: boolean;
    crisis_support?: boolean;
  };
  status: 'active' | 'inactive' | 'locked';
  last_active: string;
  created_at: string;
  updated_at: string;
  metadata: {
    total_sessions?: number;
    total_messages?: number;
    average_sentiment?: number;
    crisis_history?: {
      last_detected?: string;
      count?: number;
    };
  } | null;
}

// User session types
export interface UserSession {
  id: string;
  user_id: string;
  token: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  expires_at: string;
  last_activity: string;
  metadata: {
    device_type?: string;
    location?: {
      country?: string;
      region?: string;
    };
  } | null;
}

export interface Database {
    public: { Tables: { [key: string]: any } };
}
