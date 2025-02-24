import { BaseEntity, Metadata } from './common';
import { UserProfile } from './user';
import { Session } from './session';

export interface Message extends BaseEntity {
  session_id: string;
  content: string;
  role: MessageRole;
  metadata?: MessageMetadata;
  reactions?: MessageReactionCount[];
  id: string;
  sender: string;
  timestamp: string;
  thread_id?: string;
  recipientId?: string;
  status?: MessageStatus;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    size: number;
  }>;
  user_id?: string;
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
  | 'participant_left'
  | 'reaction_added'
  | 'reaction_removed';

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
  reaction_metrics?: {
    total_reactions: number;
    reactions_per_message: number;
    most_used_reactions: Array<{
      emoji: string;
      count: number;
    }>;
    reaction_trends: Array<{
      timestamp: string;
      count: number;
    }>;
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
  searchMessages: (options: SearchOptions) => Promise<MessageSearchResult[]>;
  getSearchStatistics: (thread_id: string) => Promise<SearchStatistics[]>;
  getSearchHistory: (thread_id: string) => Promise<SearchAuditLog[]>;
}

export enum MessageStatus {
  PENDING = 'pending',
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed',
  QUEUED = 'queued'
}

export interface FailedMessage {
  message_id: string;
  thread_id: string;
  content: string;
  sender_id: string;
  recipient_id: string;
  status: MessageStatus;
  error?: string;
  retry_count: number;
  encryption_key_version: string;
  encryption_key_id?: string;
  encryption_metadata?: {
    key_transitions?: Array<{
      from_version: string;
      to_version: string;
      timestamp: number;
    }>;
  };
  created_at: string;
  updated_at: string;
}

export interface KeyTransitionContext {
  fromVersion: string;
  toVersion: string;
  keyId?: string;
  transitionStarted: Date;
  retryCount: number;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  updated_at: string;
}

export interface MessageReactionCount {
  message_id: string;
  emoji: string;
  count: number;
  user_ids: string[];
}

export interface ReactionAuditLog {
  id: string;
  reaction_id: string;
  message_id: string;
  user_id: string;
  action: 'add' | 'remove';
  emoji: string;
  metadata?: {
    timestamp: number;
    [key: string]: unknown;
  };
  created_at: string;
}

export interface MessageSearchResult {
  message: Message;
  score: number;
  context?: {
    before: Message[];
    after: Message[];
  };
}

export interface SearchOptions {
  query: string;
  threadId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface SearchStatistics {
  user_id: string;
  thread_id: string;
  time_bucket: string;
  search_count: number;
  avg_results: number;
  avg_execution_time: number;
  queries: string[];
}

export interface SearchAuditLog {
  id: string;
  user_id: string;
  thread_id: string;
  query: string;
  result_count: number;
  execution_time_ms: number;
  created_at: string;
  metadata?: {
    client_info?: {
      browser: string;
      os: string;
      device: string;
    };
    filters?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

export interface ThreadWithMetadata {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  participants: Array<{
    user: {
      id: string;
      name: string;
      avatar?: string;
    };
    role: string;
  }>;
  metadata?: {
    type?: string;
    icon?: string;
    color?: string;
    [key: string]: any;
  };
}
