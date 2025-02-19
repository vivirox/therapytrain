import { EventEmitter } from 'events';
import { singleton } from '@/lib/decorators';

interface AuditEvent {
  type: string;
  data: any;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  source: string;
  severity: 'info' | 'warning' | 'error';
}

@singleton()
export class AuditService extends EventEmitter {
  private static instance: AuditService;
  private events: Array<{
    type: string;
    data: any;
    timestamp: number;
  }>;

  private constructor() {
    super();
    this.events = [];
  }

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  public async logEvent(
    type: string,
    data: any,
    options: {
      userId?: string;
      sessionId?: string;
      severity?: 'info' | 'warning' | 'error';
    } = {}
  ): Promise<void> {
    const event: AuditEvent = {
      type,
      data,
      timestamp: new Date(),
      userId: options.userId,
      sessionId: options.sessionId,
      source: 'VideoRecognitionService',
      severity: options.severity || 'info',
    };

    // Emit event for real-time monitoring
    this.emit('auditEvent', event);

    // Store event in secure storage (implementation pending)
    await this.storeEvent(event);

    const timestamp = Date.now();
    this.events.push({ type, data, timestamp });
  }

  private async storeEvent(event: AuditEvent): Promise<void> {
    // TODO: Implement secure storage of audit events
    // This should be HIPAA compliant and include encryption
    console.log('Audit event:', event);
  }

  public getEvents(): Array<{
    type: string;
    data: any;
    timestamp: number;
  }> {
    return this.events;
  }

  public clearEvents(): void {
    this.events = [];
  }
} 