import { AuditEventType } from './auditEventType.enum';

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
      for (const event of events) {
        await this.logEventToMongo(event);
      }
    } catch (error) {
      console.error('Error flushing audit logs:', error);
      // Put events back in buffer
      this.eventBuffer = [...events, ...this.eventBuffer];
    }
  }

  private async logEventToMongo(event: AuditEvent): Promise<void> {
    try {
      const response = await fetch('/api/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event)
      });
      if (!response.ok) {
        throw new Error('Failed to log audit event');
      }
    } catch (error) {
      console.error('Error logging audit event:', error);
      throw error;
    }
  }

  /**
   * Start the buffer flush interval
   */
  private startBufferFlush(): void {
    setInterval(() => {
      this.flushBuffer().catch(error: unknown => {
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
    try {
      const queryParams = new URLSearchParams({ sessionId });
      const response = await fetch(`/api/audit-logs?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  /**
   * Get security audit logs
   */
  public async getSecurityAuditLogs(
    startDate: Date,
    endDate: Date
  ): Promise<Array<AuditEvent>> {
    try {
      const queryParams = new URLSearchParams({
        eventType: AuditEventType.SECURITY,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      const response = await fetch(`/api/audit-logs?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch security logs');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching security logs:', error);
      throw error;
    }
  }
}

export default AuditLogger;
