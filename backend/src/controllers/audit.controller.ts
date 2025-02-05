import { Request, Response, NextFunction } from 'express';
import { SecurityAuditService } from '../services/SecurityAuditService';
import { z } from 'zod';

const auditQuerySchema = z.object({
    startTime: z.string().transform(str => new Date(str)),
    endTime: z.string().transform(str => new Date(str)),
    eventType: z.string().optional(),
    userId: z.string().optional(),
    sessionId: z.string().optional(),
    resourceType: z.string().optional(),
    status: z.enum(['success', 'failure']).optional(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional()
});

const metricsQuerySchema = z.object({
    startTime: z.string().transform(str => new Date(str)),
    endTime: z.string().transform(str => new Date(str)),
    interval: z.enum(['hour', 'day', 'week', 'month']).default('hour')
});

export class AuditController {
    private securityAudit: SecurityAuditService;

    constructor() {
        this.securityAudit = SecurityAuditService.getInstance();
    }

    /**
     * Get audit logs with optional filters
     */
    async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const query = auditQuerySchema.parse(req.query);
            const logs = await this.securityAudit.getAuditLogs(
                query.startTime,
                query.endTime,
                {
                    eventType: query.eventType,
                    userId: query.userId,
                    sessionId: query.sessionId,
                    resourceType: query.resourceType,
                    status: query.status,
                    severity: query.severity
                }
            );

            // Log the access to audit logs
            await this.securityAudit.logDataAccess(
                req.user?.id || 'unknown',
                'audit_logs',
                'READ',
                {
                    filters: query,
                    resultCount: logs.length
                }
            );

            res.json(logs);
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
            } else {
                next(error);
            }
        }
    }

    /**
     * Get security metrics for a time period
     */
    async getSecurityMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const query = metricsQuerySchema.parse(req.query);
            const { data, error } = await this.securityAudit.supabase
                .from('audit_metrics')
                .select('*')
                .gte('time_bucket', query.startTime.toISOString())
                .lte('time_bucket', query.endTime.toISOString())
                .order('time_bucket', { ascending: false });

            if (error) throw error;

            // Log the access to security metrics
            await this.securityAudit.logDataAccess(
                req.user?.id || 'unknown',
                'audit_metrics',
                'READ',
                {
                    timeRange: {
                        start: query.startTime,
                        end: query.endTime
                    },
                    interval: query.interval
                }
            );

            res.json(data);
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
            } else {
                next(error);
            }
        }
    }

    /**
     * Get recent security alerts
     */
    async getSecurityAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { data, error } = await this.securityAudit.supabase
                .from('audit_logs')
                .select('*')
                .eq('event_type', 'SECURITY_ALERT')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;

            // Log the access to security alerts
            await this.securityAudit.logDataAccess(
                req.user?.id || 'unknown',
                'security_alerts',
                'READ',
                {
                    resultCount: data.length
                }
            );

            res.json(data);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get rate limit events for an IP or user
     */
    async getRateLimitEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { ip, userId } = req.query;

            if (!ip && !userId) {
                return res.status(400).json({ error: 'Either ip or userId must be provided' });
            }

            let query = this.securityAudit.supabase
                .from('audit_logs')
                .select('*')
                .eq('event_type', 'RATE_LIMIT')
                .order('created_at', { ascending: false })
                .limit(100);

            if (ip) {
                query = query.eq('details->ip', ip);
            }
            if (userId) {
                query = query.eq('user_id', userId);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Log the access to rate limit events
            await this.securityAudit.logDataAccess(
                req.user?.id || 'unknown',
                'rate_limit_events',
                'READ',
                {
                    ip,
                    userId,
                    resultCount: data.length
                }
            );

            res.json(data);
        } catch (error) {
            next(error);
        }
    }
} 