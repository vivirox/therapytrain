import { supabase } from '../integrations/supabase/client';

export interface AuditEvent {
  eventType: AuditEventType;
  userId?: string;
  sessionId?: string;
  resourceType: string;
  resourceId: string;
  action: string;
  status: 'success' | 'failure';
  details: Record<string, any>;
  metadata: {
    ip?: string;
    userAgent?: string;
    timestamp: string;
    proofId?: string;
  };
}

export enum AuditEventType {
  SECURITY = 'SECURITY',
  ACCESS = 'ACCESS',
  DATA = 'DATA',
  PROOF = 'PROOF',
  SYSTEM = 'SYSTEM'
}

export class AuditLogger {
  private static instance: AuditLogger;
  private eventBuffer: Array<AuditEvent> = [];
  private readonly BUFFER_SIZE = 50;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  private constructor() {
    this.startBufferFlush();
  }

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Log a security-related event
   */
  public async logSecurityEvent(
    action: string,
    status: 'success' | 'failure',
    details: Record<string, any>,
    metadata: Partial<AuditEvent['metadata']> = {}
  ): Promise<void> {
    await this.logEvent({
      eventType: AuditEventType.SECURITY,
      resourceType: 'security',
      resourceId: this.generateEventId(),
      action,
      status,
      details,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log a proof verification event
   */
  public async logProofEvent(
    sessionId: string,
    proofId: string,
    action: string,
    status: 'success' | 'failure',
    details: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      eventType: AuditEventType.PROOF,
      sessionId,
      resourceType: 'proof',
      resourceId: proofId,
      action,
      status,
      details,
      metadata: {
        proofId,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log a data access event
   */
  public async logDataAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string,
    status: 'success' | 'failure',
    details: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      eventType: AuditEventType.ACCESS,
      userId,
      resourceType,
      resourceId,
      action,
      status,
      details,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log a system event
   */
  public async logSystemEvent(
    action: string,
    status: 'success' | 'failure',
    details: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      eventType: AuditEventType.SYSTEM,
      resourceType: 'system',
      resourceId: this.generateEventId(),
      action,
      status,
      details,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Internal method to log an event
   */
  private async logEvent(event: AuditEvent): Promise<void> {
    // Add event to buffer
    this.eventBuffer.push(event);

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.BUFFER_SIZE) {
      await this.flushBuffer();
    }
  }

  /**
   * Flush the event buffer to the database
   */
  private async flushBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) {
      return;
    }

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert(events.map(event => ({
          ...event,
          details: JSON.stringify(event.details),
          metadata: JSON.stringify(event.metadata)
        })));

      if (error) {
        console.error('Failed to flush audit logs:', error);
        // Put events back in buffer
        this.eventBuffer = [...events, ...this.eventBuffer];
      }
    } catch (error) {
      console.error('Error flushing audit logs:', error);
      // Put events back in buffer
      this.eventBuffer = [...events, ...this.eventBuffer];
    }
  }

  /**
   * Start the buffer flush interval
   */
  private startBufferFlush(): void {
    setInterval(() => {
      this.flushBuffer().catch(error => {
        console.error('Error in flush interval:', error);
      });
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Generate a unique event ID using crypto API
   */
  private generateEventId(): string {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Get audit logs for a specific session
   */
  public async getSessionAuditLogs(sessionId: string): Promise<Array<AuditEvent>> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('sessionId', sessionId)
      .order('metadata->timestamp', { ascending: false });

    if (error) {
      throw new Error(`Failed to get audit logs: ${error.message}`);
    }

    return data.map(log => ({
      ...log,
      details: JSON.parse(log.details),
      metadata: JSON.parse(log.metadata)
    }));
  }

  /**
   * Get security audit logs
   */
  public async getSecurityAuditLogs(
    startDate: Date,
    endDate: Date
  ): Promise<Array<AuditEvent>> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('eventType', AuditEventType.SECURITY)
      .gte('metadata->timestamp', startDate.toISOString())
      .lte('metadata->timestamp', endDate.toISOString())
      .order('metadata->timestamp', { ascending: false });

    if (error) {
      throw new Error(`Failed to get security logs: ${error.message}`);
    }

    return data.map(log => ({
      ...log,
      details: JSON.parse(log.details),
      metadata: JSON.parse(log.metadata)
    }));
  }
}

export default AuditLogger;
