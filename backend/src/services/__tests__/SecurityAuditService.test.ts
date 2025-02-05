import { SecurityAuditService } from '../SecurityAuditService';
import { supabase } from '../../config/supabase';

jest.mock('../../config/supabase', () => ({
    supabase: {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockResolvedValue({ error: null }),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null })
    }
}));

describe('SecurityAuditService', () => {
    let securityAudit: SecurityAuditService;

    beforeEach(() => {
        jest.clearAllMocks();
        securityAudit = SecurityAuditService.getInstance();
    });

    describe('recordEvent', () => {
        it('should buffer events and flush when buffer is full', async () => {
            const mockEvents = Array(51).fill(null).map((_, i) => ({
                eventType: 'TEST_EVENT',
                details: { test: `event-${i}` }
            }));

            // Record 51 events (buffer size is 50)
            for (const event of mockEvents) {
                await securityAudit.recordEvent(event.eventType, event.details);
            }

            expect(supabase.from).toHaveBeenCalledWith('audit_logs');
            expect(supabase.insert).toHaveBeenCalled();
        });

        it('should include required fields in the audit log', async () => {
            const eventType = 'TEST_EVENT';
            const details = { test: 'data' };

            await securityAudit.recordEvent(eventType, details);

            expect(supabase.from).toHaveBeenCalledWith('audit_logs');
            expect(supabase.insert).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({
                    eventType,
                    resourceType: 'security',
                    action: eventType,
                    status: 'success',
                    details,
                    metadata: expect.any(Object)
                })
            ]));
        });
    });

    describe('recordAuthAttempt', () => {
        it('should record successful authentication attempt', async () => {
            const userId = 'test-user';
            const details = {
                ip: '127.0.0.1',
                userAgent: 'test-agent',
                method: 'password'
            };

            await securityAudit.recordAuthAttempt(userId, true, details);

            expect(supabase.from).toHaveBeenCalledWith('audit_logs');
            expect(supabase.insert).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({
                    eventType: 'AUTH_SUCCESS',
                    details: expect.objectContaining({
                        userId,
                        status: 'success',
                        ...details
                    })
                })
            ]));
        });

        it('should record failed authentication attempt', async () => {
            const userId = 'unknown';
            const details = {
                ip: '127.0.0.1',
                userAgent: 'test-agent',
                method: 'token',
                error: 'Invalid token'
            };

            await securityAudit.recordAuthAttempt(userId, false, details);

            expect(supabase.from).toHaveBeenCalledWith('audit_logs');
            expect(supabase.insert).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({
                    eventType: 'AUTH_FAILURE',
                    details: expect.objectContaining({
                        userId,
                        status: 'failure',
                        ...details
                    })
                })
            ]));
        });
    });

    describe('recordAlert', () => {
        it('should record security alerts with severity', async () => {
            const alertType = 'SUSPICIOUS_ACTIVITY';
            const severity = 'HIGH';
            const details = { ip: '127.0.0.1', reason: 'Too many failed attempts' };

            await securityAudit.recordAlert(alertType, severity, details);

            expect(supabase.from).toHaveBeenCalledWith('audit_logs');
            expect(supabase.insert).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({
                    eventType: 'SECURITY_ALERT',
                    details: expect.objectContaining({
                        type: alertType,
                        severity,
                        details
                    })
                })
            ]));
        });
    });

    describe('getAuditLogs', () => {
        it('should retrieve audit logs with filters', async () => {
            const startTime = new Date('2024-01-01');
            const endTime = new Date('2024-01-02');
            const filters = {
                eventType: 'AUTH_FAILURE',
                userId: 'test-user'
            };

            await securityAudit.getAuditLogs(startTime, endTime, filters);

            expect(supabase.from).toHaveBeenCalledWith('audit_logs');
            expect(supabase.gte).toHaveBeenCalledWith('createdAt', startTime.toISOString());
            expect(supabase.lte).toHaveBeenCalledWith('createdAt', endTime.toISOString());
            expect(supabase.eq).toHaveBeenCalledWith('eventType', filters.eventType);
            expect(supabase.eq).toHaveBeenCalledWith('userId', filters.userId);
        });

        it('should handle database errors', async () => {
            const startTime = new Date('2024-01-01');
            const endTime = new Date('2024-01-02');

            (supabase.order as jest.Mock).mockResolvedValueOnce({
                data: null,
                error: new Error('Database error')
            });

            await expect(securityAudit.getAuditLogs(startTime, endTime))
                .rejects.toThrow('Database error');
        });
    });

    describe('logSessionEvent', () => {
        it('should record session events', async () => {
            const sessionId = 'test-session';
            const eventType = 'CREATED';
            const details = { userId: 'test-user', mode: 'chat' };

            await securityAudit.logSessionEvent(sessionId, eventType, details);

            expect(supabase.from).toHaveBeenCalledWith('audit_logs');
            expect(supabase.insert).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({
                    eventType: 'SESSION_CREATED',
                    details: expect.objectContaining({
                        sessionId,
                        ...details
                    })
                })
            ]));
        });
    });

    describe('logRateLimitEvent', () => {
        it('should record rate limit events', async () => {
            const userId = 'test-user';
            const endpoint = '/api/test';
            const details = { ip: '127.0.0.1', limit: 100 };

            await securityAudit.logRateLimitEvent(userId, endpoint, details);

            expect(supabase.from).toHaveBeenCalledWith('audit_logs');
            expect(supabase.insert).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({
                    eventType: 'RATE_LIMIT',
                    details: expect.objectContaining({
                        userId,
                        endpoint,
                        ...details
                    })
                })
            ]));
        });
    });
}); 