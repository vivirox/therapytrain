import { supabase } from '../config/supabase';
import { AuditLog } from '../models/auditLog';
import { v4 as uuidv4 } from 'uuid';

export class SecurityAuditService {
    private static instance: SecurityAuditService;
    private eventBuffer: AuditLog[] = [];
    private readonly BUFFER_SIZE = 50;
    private readonly FLUSH_INTERVAL = 5000; // 5 seconds

    private constructor() {
        this.startBufferFlush();
    }

    public static getInstance(): SecurityAuditService {
        if (!SecurityAuditService.instance) {
            SecurityAuditService.instance = new SecurityAuditService();
        }
        return SecurityAuditService.instance;
    }

    /**
     * Records security-related events for auditing purposes
     */
    async recordEvent(eventType: string, details: Record<string, any>): Promise<void> {
        const auditLog: AuditLog = {
            id: uuidv4(),
            eventType,
            resourceType: 'security',
            resourceId: uuidv4(),
            action: eventType,
            status: 'success',
            details,
            metadata: {
                timestamp: new Date().toISOString(),
                ip: details.ip,
                userAgent: details.userAgent
            },
            createdAt: new Date()
        };

        // Add to buffer
        this.eventBuffer.push(auditLog);

        // Flush if buffer is full
        if (this.eventBuffer.length >= this.BUFFER_SIZE) {
            await this.flushBuffer();
        }
    }

    /**
     * Records authentication attempts (successful or failed)
     */
    async recordAuthAttempt(userId: string, success: boolean, details: Record<string, any>): Promise<void> {
        await this.recordEvent(
            success ? 'AUTH_SUCCESS' : 'AUTH_FAILURE',
            {
                userId,
                status: success ? 'success' : 'failure',
                ip: details.ip,
                userAgent: details.userAgent,
                method: details.method,
                timestamp: new Date().toISOString()
            }
        );
    }

    /**
     * Records security alerts for later analysis
     */
    async recordAlert(alertType: string, severity: string, details: Record<string, any>): Promise<void> {
        await this.recordEvent('SECURITY_ALERT', {
            type: alertType,
            severity,
            details,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Records user access patterns for analysis
     */
    async logAccessPattern(userId: string, resource: string, details: Record<string, any> = {}): Promise<void> {
        await this.recordEvent('ACCESS_PATTERN', {
            userId,
            resource,
            ...details,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Records session-related events
     */
    async logSessionEvent(sessionId: string, eventType: string, details: Record<string, any> = {}): Promise<void> {
        await this.recordEvent(`SESSION_${eventType.toUpperCase()}`, {
            sessionId,
            ...details,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Records data access events
     */
    async logDataAccess(userId: string, resource: string, action: string, details: Record<string, any> = {}): Promise<void> {
        await this.recordEvent('DATA_ACCESS', {
            userId,
            resource,
            action,
            ...details,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Records rate limit events
     */
    async logRateLimitEvent(userId: string, endpoint: string, details: Record<string, any> = {}): Promise<void> {
        await this.recordEvent('RATE_LIMIT', {
            userId,
            endpoint,
            ...details,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Retrieves audit logs for a specific time range
     */
    async getAuditLogs(
        startTime: Date,
        endTime: Date,
        filters: Record<string, any> = {}
    ): Promise<AuditLog[]> {
        let query = supabase
            .from('audit_logs')
            .select('*')
            .gte('createdAt', startTime.toISOString())
            .lte('createdAt', endTime.toISOString());

        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined) {
                query = query.eq(key, value);
            }
        });

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    private async flushBuffer(): Promise<void> {
        if (this.eventBuffer.length === 0) return;

        const events = [...this.eventBuffer];
        this.eventBuffer = [];

        try {
            const { error } = await supabase
                .from('audit_logs')
                .insert(events);

            if (error) throw error;
        } catch (error) {
            console.error('Error flushing audit logs:', error);
            // Put events back in buffer
            this.eventBuffer = [...events, ...this.eventBuffer];
        }
    }

    private startBufferFlush(): void {
        setInterval(() => {
            this.flushBuffer().catch(error: unknown => {
                console.error('Error in flush interval:', error);
            });
        }, this.FLUSH_INTERVAL);
    }
}
