import { supabase } from '@/config/supabase';
import { AuditLog } from '@/models/auditLog';

export interface AuditEvent {
    eventType: string;
    userId: string;
    action: string;
    resource: string;
    status: 'SUCCESS' | 'FAILURE';
    details?: Record<string, any>;
    metadata?: {
        ipAddress?: string;
        userAgent?: string;
        sessionId?: string;
    };
}

export class AuditLogger {
    private static instance: AuditLogger;
    private readonly eventBuffer: AuditEvent[] = [];
    private readonly BUFFER_SIZE = 100;
    private readonly FLUSH_INTERVAL = 5000; // 5 seconds

    private constructor() {
        setInterval(() => this.flushEvents(), this.FLUSH_INTERVAL);
    }

    public static getInstance(): AuditLogger {
        if (!AuditLogger.instance) {
            AuditLogger.instance = new AuditLogger();
        }
        return AuditLogger.instance;
    }

    public async logEvent(event: AuditEvent): Promise<void> {
        this.eventBuffer.push(event);
        if (this.eventBuffer.length >= this.BUFFER_SIZE) {
            await this.flushEvents();
        }
    }

    public async logProofEvent(
        sessionId: string,
        proofId: string,
        action: string,
        status: 'SUCCESS' | 'FAILURE',
        details?: Record<string, any>
    ): Promise<void> {
        await this.logEvent({
            eventType: 'PROOF_GENERATION',
            userId: sessionId,
            action,
            resource: proofId,
            status,
            details,
            metadata: {
                sessionId
            }
        });
    }

    private async flushEvents(): Promise<void> {
        if (this.eventBuffer.length === 0) return;

        const events = this.eventBuffer.splice(0, this.eventBuffer.length);
        const auditLogs: AuditLog[] = events.map(event => ({
            id: crypto.randomUUID(),
            eventType: event.eventType,
            userId: event.userId,
            timestamp: new Date(),
            details: {
                action: event.action,
                resource: event.resource,
                status: event.status,
                ...event.details
            },
            metadata: event.metadata
        }));

        try {
            const { error } = await supabase.from('audit_logs').insert(auditLogs);
            if (error) {
                console.error('Error flushing audit logs:', error);
                // Re-add failed events back to the buffer
                this.eventBuffer.unshift(...events);
            }
        } catch (error) {
            console.error('Error flushing audit logs:', error);
            // Re-add failed events back to the buffer
            this.eventBuffer.unshift(...events);
        }
    }
}

export const auditLogger = AuditLogger.getInstance(); 