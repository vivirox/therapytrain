import { BaseEntity, Metadata } from './common';
import { UserProfile } from './user';
import { Session } from './session';

export interface Message extends BaseEntity {
  session_id: string;
  content: string;
  role: MessageRole;
  metadata?: MessageMetadata;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface MessageMetadata extends Metadata {
  sentiment?: number;
  intent?: string;
  entities?: Array<{
    type: string;
    value: string;
    start: number;
    end: number;
  }>;
  flags?: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    details?: Record<string, unknown>;
  }>;
}

export interface ChatSession extends Session {
  messages: Message[];
  participants: Array<{
    user: UserProfile;
    role: 'therapist' | 'client';
  }>;
  active_participant?: string;
  last_message_at?: string;
  typing?: {
    user_id: string;
    timestamp: string;
  };
}

export interface ChatEvent {
  type: ChatEventType;
  session_id: string;
  user_id: string;
  timestamp: string;
  data: Record<string, unknown>;
  metadata?: Metadata;
}

export type ChatEventType =
  | 'message_sent'
  | 'message_received'
  | 'message_read'
  | 'message_edited'
  | 'message_deleted'
  | 'typing_started'
  | 'typing_stopped'
  | 'participant_joined'
  | 'participant_left';

export interface ChatAnalytics {
  session_id: string;
  message_count: number;
  participant_count: number;
  duration: number;
  sentiment_analysis: {
    positive: number;
    negative: number;
    neutral: number;
  };
  response_times: {
    average: number;
    min: number;
    max: number;
  };
  engagement_metrics: {
    messages_per_participant: Record<string, number>;
    average_message_length: number;
    interaction_gaps: number[];
  };
  metadata?: Metadata;
}

export interface ChatConfig {
  mode: 'realtime' | 'async';
  features: {
    typing_indicators: boolean;
    read_receipts: boolean;
    file_sharing: boolean;
    reactions: boolean;
  };
  preferences: {
    notifications: boolean;
    sound: boolean;
    theme: 'light' | 'dark' | 'system';
  };
  security: {
    encryption: boolean;
    message_retention: number;
    file_types: string[];
  };
  metadata?: Metadata;
}

export interface ChatManager {
  sendMessage: (session_id: string, content: string, metadata?: MessageMetadata) => Promise<Message>;
  editMessage: (message_id: string, content: string) => Promise<Message>;
  deleteMessage: (message_id: string) => Promise<void>;
  getMessages: (session_id: string, options?: {
    limit?: number;
    before?: string;
    after?: string;
  }) => Promise<Message[]>;
  markAsRead: (message_ids: string[]) => Promise<void>;
  setTypingStatus: (session_id: string, is_typing: boolean) => Promise<void>;
  getAnalytics: (session_id: string) => Promise<ChatAnalytics>;
}
