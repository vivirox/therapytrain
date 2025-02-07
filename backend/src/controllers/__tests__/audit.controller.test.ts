import { Request, Response, NextFunction } from 'express';
import { AuditController } from "@/audit.controller";
import { SecurityAuditService } from "@/../services/SecurityAuditService";
jest.mock('../../services/SecurityAuditService');
describe('AuditController', () => {
    let auditController: AuditController;
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: jest.Mock;
    let mockSecurityAudit: jest.Mocked<SecurityAuditService>;
    beforeEach(() => {
        mockSecurityAudit = {
            getAuditLogs: jest.fn().mockResolvedValue([]),
            logDataAccess: jest.fn().mockResolvedValue(undefined),
            supabase: {
                from: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                gte: jest.fn().mockReturnThis(),
                lte: jest.fn().mockReturnThis(),
                order: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue({ data: [], error: null })
            }
        } as any;
        (SecurityAuditService.getInstance as jest.Mock).mockReturnValue(mockSecurityAudit);
        mockReq = {
            query: {},
            user: { id: 'test-user' }
        };
        mockRes = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };
        mockNext = jest.fn();
        auditController = new AuditController();
    });
    describe('getAuditLogs', () => {
        it('should return filtered audit logs', async () => {
            const mockLogs = [{ id: 1, eventType: 'TEST' }];
            mockSecurityAudit.getAuditLogs.mockResolvedValueOnce(mockLogs);
            mockReq.query = {
                startTime: '2024-01-01',
                endTime: '2024-01-02',
                eventType: 'AUTH_FAILURE'
            };
            await auditController.getAuditLogs(mockReq as Request, mockRes as Response, mockNext);
            expect(mockSecurityAudit.getAuditLogs).toHaveBeenCalledWith(expect.any(Date), expect.any(Date), expect.objectContaining({
                eventType: 'AUTH_FAILURE'
            }));
            expect(mockRes.json).toHaveBeenCalledWith(mockLogs);
        });
        it('should handle invalid query parameters', async () => {
            mockReq.query = {
                startTime: 'invalid-date',
                endTime: '2024-01-02'
            };
            await auditController.getAuditLogs(mockReq as Request, mockRes as Response, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Invalid query parameters'
            }));
        });
    });
    describe('getSecurityMetrics', () => {
        it('should return security metrics', async () => {
            const mockMetrics = [{ time_bucket: '2024-01-01', total_events: 100 }];
            mockSecurityAudit.supabase.limit.mockResolvedValueOnce({
                data: mockMetrics,
                error: null
            });
            mockReq.query = {
                startTime: '2024-01-01',
                endTime: '2024-01-02',
                interval: 'hour'
            };
            await auditController.getSecurityMetrics(mockReq as Request, mockRes as Response, mockNext);
            expect(mockSecurityAudit.supabase.from).toHaveBeenCalledWith('audit_metrics');
            expect(mockRes.json).toHaveBeenCalledWith(mockMetrics);
        });
        it('should handle database errors', async () => {
            mockSecurityAudit.supabase.limit.mockResolvedValueOnce({
                data: null,
                error: new Error('Database error')
            });
            mockReq.query = {
                startTime: '2024-01-01',
                endTime: '2024-01-02'
            };
            await auditController.getSecurityMetrics(mockReq as Request, mockRes as Response, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        });
    });
    describe('getSecurityAlerts', () => {
        it('should return recent security alerts', async () => {
            const mockAlerts = [{ id: 1, type: 'SUSPICIOUS_ACTIVITY' }];
            mockSecurityAudit.supabase.limit.mockResolvedValueOnce({
                data: mockAlerts,
                error: null
            });
            await auditController.getSecurityAlerts(mockReq as Request, mockRes as Response, mockNext);
            expect(mockSecurityAudit.supabase.from).toHaveBeenCalledWith('audit_logs');
            expect(mockSecurityAudit.supabase.eq).toHaveBeenCalledWith('event_type', 'SECURITY_ALERT');
            expect(mockRes.json).toHaveBeenCalledWith(mockAlerts);
        });
    });
    describe('getRateLimitEvents', () => {
        it('should return rate limit events for IP', async () => {
            const mockEvents = [{ id: 1, ip: '127.0.0.1' }];
            mockSecurityAudit.supabase.limit.mockResolvedValueOnce({
                data: mockEvents,
                error: null
            });
            mockReq.query = { ip: '127.0.0.1' };
            await auditController.getRateLimitEvents(mockReq as Request, mockRes as Response, mockNext);
            expect(mockSecurityAudit.supabase.from).toHaveBeenCalledWith('audit_logs');
            expect(mockSecurityAudit.supabase.eq).toHaveBeenCalledWith('event_type', 'RATE_LIMIT');
            expect(mockSecurityAudit.supabase.eq).toHaveBeenCalledWith('details->ip', '127.0.0.1');
            expect(mockRes.json).toHaveBeenCalledWith(mockEvents);
        });
        it('should require either ip or userId parameter', async () => {
            mockReq.query = {};
            await auditController.getRateLimitEvents(mockReq as Request, mockRes as Response, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Either ip or userId must be provided'
            }));
        });
    });
});
