import type { ChatMessage, ChatSession, ChatContext, ChatService } from '../chat';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseChatTables {
  messages: {
    id: string;
    session_id: string;
    user_id: string;
    content: string;
    timestamp: string;
    type: string;
    metadata: Record<string, unknown>;
  };
  sessions: {
    id: string;
    user_id: string;
    start_time: string;
    end_time: string | null;
    status: string;
    metadata: Record<string, unknown>;
  };
  contexts: {
    session_id: string;
    user_id: string;
    emotional_state: Record<string, number> | null;
    intervention_context: Record<string, unknown> | null;
    updated_at: string;
  };
}

export interface SupabaseChatService extends ChatService {
  client: SupabaseClient;
  subscribeToMessages(sessionId: string, callback: (message: ChatMessage) => void): () => void;
  subscribeToSessionUpdates(sessionId: string, callback: (session: ChatSession) => void): () => void;
  batchInsertMessages(messages: Omit<ChatMessage, 'id' | 'timestamp'>[]): Promise<ChatMessage[]>;
  getMessagesByDateRange(startDate: Date, endDate: Date): Promise<ChatMessage[]>;
}

export interface SupabaseChatConfig {
  schema: string;
  tables: {
    messages: string;
    sessions: string;
    contexts: string;
  };
  realtime: {
    enabled: boolean;
    channel: string;
  };
  enableCaching: boolean;
  cacheTimeout: number;
} 