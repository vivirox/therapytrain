import { ZKAuditService } from '../ZKAuditService';
import { SecurityAuditService } from '../SecurityAuditService';
import { SupabaseClient } from '@supabase/supabase-js';
import { WebSocket } from 'ws';
import { EventEmitter } from 'events';

jest.mock('@supabase/supabase-js');
jest.mock('ws');

describe('ZKAuditService', () => {
    let zkAuditService: ZKAuditService;
    let mockSupabase: jest.Mocked<SupabaseClient>;
    let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
    let mockWebSocket: jest.Mocked<WebSocket>;

    beforeEach(() => {
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockResolvedValue({ error: null }),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ 
                data: [], 
                error: null 
            })
        } as any;

        mockSecurityAuditService = {
            recordAlert: jest.fn()
        } as any;

        mockWebSocket = {
            send: jest.fn(),
            on: jest.fn(),
            readyState: WebSocket.OPEN,
            close: jest.fn()
        } as any;

        zkAuditService = new ZKAuditService(
            mockSupabase,
            mockSecurityAuditService,
            10, // smaller window for testing
            100 // faster updates for testing
        );
    });

    afterEach(async () => {
        await zkAuditService.cleanup();
    });

    describe('recordAuditEvent', () => {
        const mockEvent = {
            type: 'PROOF_GENERATED',
            severity: 'LOW' as const,
            timestamp: Date.now(),
            data: { test: 'data' },
            metadata: { duration: 100 }
        };

        it('should record audit event successfully', async () => {
            await zkAuditService.recordAuditEvent(mockEvent);

            expect(mockSupabase.from).toHaveBeenCalledWith('zk_audit_logs');
            expect(mockSupabase.insert).toHaveBeenCalledWith({
                type: mockEvent.type,
                severity: mockEvent.severity,
                timestamp: expect.any(String),
                data: mockEvent.data,
                metadata: mockEvent.metadata
            });
        });

        it('should forward high severity events to security audit', async () => {
            const highSeverityEvent = {
                ...mockEvent,
                severity: 'HIGH' as const
            };

            await zkAuditService.recordAuditEvent(highSeverityEvent);

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                highSeverityEvent.type,
                highSeverityEvent.severity,
                highSeverityEvent.data
            );
        });

        it('should update metrics correctly', async () => {
            // Record proof generation
            await zkAuditService.recordAuditEvent({
                ...mockEvent,
                type: 'PROOF_GENERATED',
                metadata: { duration: 100 }
            });

            // Record cache hit
            await zkAuditService.recordAuditEvent({
                ...mockEvent,
                type: 'PROOF_CACHE_HIT'
            });

            // Record error
            await zkAuditService.recordAuditEvent({
                ...mockEvent,
                type: 'PROOF_GENERATION_ERROR',
                severity: 'HIGH'
            });

            // Trigger metrics broadcast
            zkAuditService.emit('metrics-update');

            // Check if WebSocket clients received the update
            zkAuditService.registerDashboardClient(mockWebSocket);
            
            // Wait for next metrics update
            await new Promise(resolve => setTimeout(resolve, 150));

            expect(mockWebSocket.send).toHaveBeenCalled();
            const sentData = JSON.parse(
                (mockWebSocket.send as jest.Mock).mock.calls[0][0]
            );

            expect(sentData.metrics).toMatchObject({
                errorRate: expect.any(Number),
                cacheHitRate: expect.any(Number),
                averageProofTime: expect.any(Number)
            });
        });

        it('should handle Supabase errors', async () => {
            const error = new Error('Database error');
            (mockSupabase.insert as jest.Mock).mockResolvedValueOnce({ 
                error 
            });

            await expect(zkAuditService.recordAuditEvent(mockEvent))
                .rejects.toThrow(error);
        });
    });

    describe('getHistoricalMetrics', () => {
        it('should retrieve historical metrics', async () => {
            const startTime = new Date('2025-01-01');
            const endTime = new Date('2025-01-02');
            const mockData = [{
                type: 'PROOF_GENERATED',
                timestamp: '2025-01-01T12:00:00Z'
            }];

            (mockSupabase.order as jest.Mock).mockResolvedValueOnce({
                data: mockData,
                error: null
            });

            const result = await zkAuditService.getHistoricalMetrics(
                startTime,
                endTime
            );

            expect(mockSupabase.from).toHaveBeenCalledWith('zk_audit_logs');
            expect(mockSupabase.select).toHaveBeenCalledWith('*');
            expect(mockSupabase.gte).toHaveBeenCalledWith(
                'timestamp',
                startTime.toISOString()
            );
            expect(mockSupabase.lte).toHaveBeenCalledWith(
                'timestamp',
                endTime.toISOString()
            );
            expect(result).toEqual(mockData);
        });

        it('should handle Supabase errors in historical metrics', async () => {
            const error = new Error('Query error');
            (mockSupabase.order as jest.Mock).mockResolvedValueOnce({
                data: null,
                error
            });

            await expect(zkAuditService.getHistoricalMetrics(
                new Date(),
                new Date()
            )).rejects.toThrow(error);
        });
    });

    describe('dashboard integration', () => {
        it('should handle dashboard client registration', () => {
            zkAuditService.registerDashboardClient(mockWebSocket);

            // Simulate client disconnection
            const closeHandler = (mockWebSocket.on as jest.Mock).mock.calls.find(
                call => call[0] === 'close'
            )[1];
            closeHandler();

            // Trigger metrics update
            zkAuditService.emit('metrics-update');

            // Client should not receive updates after disconnection
            expect(mockWebSocket.send).not.toHaveBeenCalled();
        });
    });
});
