import { supabase, Message, ChatSession } from '../config/supabase';
import { SecurityAuditService } from './SecurityAuditService';
import { v4 as uuidv4 } from 'uuid';

export class MessageService {
  private securityAudit: SecurityAuditService;
  private readonly TABLE_MESSAGES = 'messages';
  private readonly TABLE_SESSIONS = 'chat_sessions';

  constructor(securityAudit: SecurityAuditService) {
    this.securityAudit = securityAudit;
  }

  async createSession(userId: string): Promise<string> {
    const session: Partial<ChatSession> = {
      id: uuidv4(),
      user_id: userId,
      started_at: new Date().toISOString(),
      metadata: {
        topics: [],
        sentiment_summary: 0,
        crisis_detected: false
      }
    };

    const { error } = await supabase
      .from(this.TABLE_SESSIONS)
      .insert(session);

    if (error) {
      this.securityAudit.recordEvent('session_creation_error', {
        userId,
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }

    return session.id;
  }

  async saveMessage(
    sessionId: string,
    userId: string,
    content: string,
    type: Message['type'],
    metadata?: Message['metadata']
  ): Promise<Message> {
    const message: Partial<Message> = {
      id: uuidv4(),
      session_id: sessionId,
      user_id: userId,
      content,
      type,
      metadata,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from(this.TABLE_MESSAGES)
      .insert(message)
      .select()
      .single();

    if (error) {
      this.securityAudit.recordEvent('message_save_error', {
        userId,
        sessionId,
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }

    // Update session metadata
    await this.updateSessionMetadata(sessionId, message);

    return data;
  }

  async getSessionMessages(sessionId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from(this.TABLE_MESSAGES)
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      this.securityAudit.recordEvent('message_fetch_error', {
        sessionId,
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }

    return data;
  }

  async getUserSessions(userId: string): Promise<ChatSession[]> {
    const { data, error } = await supabase
      .from(this.TABLE_SESSIONS)
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (error) {
      this.securityAudit.recordEvent('sessions_fetch_error', {
        userId,
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }

    return data;
  }

  async endSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from(this.TABLE_SESSIONS)
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) {
      this.securityAudit.recordEvent('session_end_error', {
        sessionId,
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
  }

  private async updateSessionMetadata(sessionId: string, message: Partial<Message>): Promise<void> {
    const { data: session, error: fetchError } = await supabase
      .from(this.TABLE_SESSIONS)
      .select('metadata')
      .eq('id', sessionId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    const metadata = session.metadata || {
      topics: [],
      sentiment_summary: 0,
      crisis_detected: false
    };

    // Update metadata based on message
    if (message.metadata) {
      // Update topics
      if (message.metadata.topics) {
        metadata.topics = [...new Set([...metadata.topics, ...message.metadata.topics])];
      }

      // Update sentiment summary
      if (typeof message.metadata.sentiment === 'number') {
        const currentSentiment = metadata.sentiment_summary || 0;
        metadata.sentiment_summary = (currentSentiment + message.metadata.sentiment) / 2;
      }

      // Check for crisis
      if (message.metadata.sentiment && message.metadata.sentiment < -0.7) {
        metadata.crisis_detected = true;
      }
    }

    const { error: updateError } = await supabase
      .from(this.TABLE_SESSIONS)
      .update({ metadata })
      .eq('id', sessionId);

    if (updateError) {
      throw updateError;
    }
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from(this.TABLE_MESSAGES)
      .delete()
      .match({ id: messageId, user_id: userId });

    if (error) {
      this.securityAudit.recordEvent('message_delete_error', {
        userId,
        messageId,
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
  }

  async getMessageCount(sessionId: string): Promise<number> {
    const { count, error } = await supabase
      .from(this.TABLE_MESSAGES)
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    if (error) {
      throw error;
    }

    return count || 0;
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    // Implementation
  }

  async getRecentMessages(sessionId: string, limit: number): Promise<any[]> {
    // Implementation
  }

  async getSessionSummary(sessionId: string): Promise<any> {
    // Implementation
  }
}
