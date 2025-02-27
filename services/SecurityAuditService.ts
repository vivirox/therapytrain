import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { singleton } from 'tsyringe';

interface AuditLogEntry {
  timestamp: Date;
  operation: string;
  userId?: string;
  recipientId?: string;
  threadId?: string;
  messageId?: string;
  status: 'success' | 'error';
  error?: Error;
  metadata?: Record<string, any>;
}

@singleton()
export class SecurityAuditService {
  private supabase: SupabaseClient;
  private readonly TABLE_NAME = 'security_audit_logs';

  constructor(supabaseClient?: SupabaseClient) {
    if (supabaseClient) {
      this.supabase = supabaseClient;
    } else {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error('Supabase environment variables are required');
      }
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
    }
  }

  private async logEntry(entry: AuditLogEntry): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(this.TABLE_NAME)
        .insert([{
          ...entry,
          error: entry.error ? JSON.stringify(entry.error) : null,
          metadata: entry.metadata ? JSON.stringify(entry.metadata) : null
        }]);

      if (error) {
        console.error('Failed to log security audit entry:', error);
      }
    } catch (error) {
      console.error('Error in security audit logging:', error);
    }
  }

  public async logMessageEncryption(params: {
    messageId: string;
    userId: string;
    recipientId: string;
    threadId: string;
    status: 'success' | 'error';
    error?: Error;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.logEntry({
      timestamp: new Date(),
      operation: 'message_encryption',
      ...params
    });
  }

  public async logMessageDecryption(params: {
    messageId: string;
    userId: string;
    status: 'success' | 'error';
    error?: Error;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.logEntry({
      timestamp: new Date(),
      operation: 'message_decryption',
      ...params
    });
  }

  public async logKeyGeneration(params: {
    operation: string;
    status: 'success' | 'error';
    error?: Error;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.logEntry({
      timestamp: new Date(),
      ...params
    });
  }

  public async logKeyRotation(params: {
    operation: string;
    status: 'success' | 'error';
    error?: Error;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.logEntry({
      timestamp: new Date(),
      ...params
    });
  }

  public async logKeyOperation(params: {
    operation: string;
    status: 'success' | 'error';
    error?: Error;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.logEntry({
      timestamp: new Date(),
      ...params
    });
  }

  public async logError(params: {
    operation: string;
    error: Error;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.logEntry({
      timestamp: new Date(),
      operation: params.operation,
      status: 'error',
      error: params.error,
      metadata: params.metadata
    });
  }

  public async getAuditLogs(params: {
    startDate?: Date;
    endDate?: Date;
    operation?: string;
    userId?: string;
    messageId?: string;
    status?: 'success' | 'error';
    limit?: number;
    offset?: number;
  }): Promise<AuditLogEntry[]> {
    let query = this.supabase
      .from(this.TABLE_NAME)
      .select('*');

    if (params.startDate) {
      query = query.gte('timestamp', params.startDate.toISOString());
    }
    if (params.endDate) {
      query = query.lte('timestamp', params.endDate.toISOString());
    }
    if (params.operation) {
      query = query.eq('operation', params.operation);
    }
    if (params.userId) {
      query = query.eq('userId', params.userId);
    }
    if (params.messageId) {
      query = query.eq('messageId', params.messageId);
    }
    if (params.status) {
      query = query.eq('status', params.status);
    }

    query = query
      .order('timestamp', { ascending: false })
      .limit(params.limit || 100)
      .range(params.offset || 0, (params.offset || 0) + (params.limit || 100) - 1);

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data.map(entry => ({
      ...entry,
      error: entry.error ? JSON.parse(entry.error) : undefined,
      metadata: entry.metadata ? JSON.parse(entry.metadata) : undefined
    }));
  }
} 