import { Document, Types } from 'mongoose';

export interface AuditLog extends Document {
  eventType: string;
  userId?: string;
  sessionId?: string;
  resourceType: string;
  resourceId: string;
  action: string;
  status: 'success' | 'failure';
  details: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface ClientProfile extends Document {
  _id: Types.ObjectId;
  age: number;
  background: string;
  category: string;
  complexity: string;
  description: string;
  keyTraits: string[];
  name: string;
  primaryIssue: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session extends Document {
  _id: Types.ObjectId;
  clientId: Types.ObjectId;
  userId: string;
  mode: 'text' | 'video';
  status: 'active' | 'completed';
  startTime: Date;
  endTime?: Date;
  metrics: {
    sentiment: number;
    engagement: number;
  };
  messages: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends Document {
  _id: Types.ObjectId;
  userId: string;
  email: string;
  name: string;
  skills: {
    [key: string]: number;
  };
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
    language: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      audit_logs: {
        Row: AuditLog
        Insert: Omit<AuditLog, '_id' | 'createdAt'>
        Update: Partial<AuditLog>
      }
      client_profiles: {
        Row: ClientProfile
        Insert: Omit<ClientProfile, '_id' | 'createdAt' | 'updatedAt'>
        Update: Partial<ClientProfile>
      }
      sessions: {
        Row: Session
        Insert: Omit<Session, '_id' | 'createdAt' | 'updatedAt'>
        Update: Partial<Session>
      }
      user_profiles: {
        Row: UserProfile
        Insert: Omit<UserProfile, '_id' | 'createdAt' | 'updatedAt'>
        Update: Partial<UserProfile>
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}
