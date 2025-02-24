import { ZKAuditService } from "../ZKAuditService";
import { SecurityAuditService } from "../SecurityAuditService";
import { supabase } from "../../config/supabase";
import { SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { 
    MockedWebSocket, 
    MockedSupabaseClient, 
    MockedSecurityAuditService 
} from '../../types/mocks';
import { AuditEvent } from '../../types/audit';

jest.mock('@supabase/supabase-js');
jest.mock('ws');

describe('ZKAuditService', () => {
    let zkAuditService: ZKAuditService;
    let mockSecurityAuditService: MockedSecurityAuditService;
    let mockSupabase: MockedSupabaseClient;
    let mockWebSocket: MockedWebSocket;

    beforeEach(() => {
        mockSecurityAuditService = {
            recordAlert: jest.fn(),
            recordEvent: jest.fn(),
            recordAuthAttempt: jest.fn(),
            logAccessPattern: jest.fn(),
            logSessionEvent: jest.fn(),
            logDataAccess: jest.fn(),
            getAuditLogs: jest.fn()
        };
        
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockResolvedValue({ error: null }),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
                data: [],
                error: null
            })
        } as unknown as MockedSupabaseClient;

        mockWebSocket = {
            send: jest.fn(),
            on: jest.fn(),
            readyState: WebSocket.OPEN,
            close: jest.fn()
        } as unknown as MockedWebSocket;

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
        const mockEvent: AuditEvent = {
            id: 'test-id',
            eventType: 'PROOF_GENERATED',
            timestamp: new Date(),
            details: { test: 'data' },
            metadata: { duration: 100 }
        };

        it('should record audit event successfully', async () => {
            await zkAuditService.recordAuditEvent(mockEvent);
            expect(mockSupabase.from).toHaveBeenCalledWith('zk_audit_logs');
            expect(mockSupabase.insert).toHaveBeenCalledWith({
                eventType: mockEvent.eventType,
                timestamp: mockEvent.timestamp.toISOString(),
                details: mockEvent.details,
                metadata: mockEvent.metadata
            });
        });

        it('should forward high severity events to security audit', async () => {
            const highSeverityEvent: AuditEvent = {
                ...mockEvent,
                details: { ...mockEvent.details, severity: 'HIGH' }
            };
            
            await zkAuditService.recordAuditEvent(highSeverityEvent);
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                highSeverityEvent.eventType,
                'HIGH',
                highSeverityEvent.details
            );
        });

        it('should update metrics correctly', async () => {
            // Record proof generation
            await zkAuditService.recordAuditEvent({
                ...mockEvent,
                eventType: 'PROOF_GENERATED',
                metadata: { duration: 100 }
            });

            // Record cache hit
            await zkAuditService.recordAuditEvent({
                ...mockEvent,
                eventType: 'PROOF_CACHE_HIT'
            });

            // Record error
            await zkAuditService.recordAuditEvent({
                ...mockEvent,
                eventType: 'PROOF_GENERATION_ERROR',
                details: { ...mockEvent.details, severity: 'HIGH' }
            });

            // Trigger metrics broadcast
            zkAuditService.emit('metrics-update');
            
            // Check if WebSocket clients received the update
            zkAuditService.registerDashboardClient(mockWebSocket);
            
            // Wait for next metrics update
            await new Promise(resolve => setTimeout(resolve, 150));
            
            expect(mockWebSocket.send).toHaveBeenCalled();
            const sentData = JSON.parse((mockWebSocket.send as jest.Mock).mock.calls[0][0]);
            expect(sentData.metrics).toMatchObject({
                errorRate: expect.any(Number),
                cacheHitRate: expect.any(Number),
                averageProofTime: expect.any(Number)
            });
        });

        it('should handle Supabase errors', async () => {
            const error = new Error('Database error');
            mockSupabase.insert.mockResolvedValueOnce({ error });
            await expect(zkAuditService.recordAuditEvent(mockEvent))
                .rejects.toThrow(error);
        });
    });

    describe('getHistoricalMetrics', () => {
        it('should retrieve historical metrics', async () => {
            const startTime = new Date('2025-01-01');
            const endTime = new Date('2025-01-02');
            const mockData = [{
                eventType: 'PROOF_GENERATED',
                timestamp: '2025-01-01T12:00:00Z'
            }];

            mockSupabase.order.mockResolvedValueOnce({
                data: mockData,
                error: null
            });

            const result = await zkAuditService.getHistoricalMetrics(startTime, endTime);
            expect(mockSupabase.from).toHaveBeenCalledWith('zk_audit_logs');
            expect(mockSupabase.select).toHaveBeenCalledWith('*');
            expect(mockSupabase.gte).toHaveBeenCalledWith('timestamp', startTime.toISOString());
            expect(mockSupabase.lte).toHaveBeenCalledWith('timestamp', endTime.toISOString());
            expect(result).toEqual(mockData);
        });

        it('should handle Supabase errors in historical metrics', async () => {
            const error = new Error('Query error');
            mockSupabase.order.mockResolvedValueOnce({
                data: null,
                error
            });
            await expect(zkAuditService.getHistoricalMetrics(new Date(), new Date()))
                .rejects.toThrow(error);
        });
    });

    describe('dashboard integration', () => {
        it('should handle dashboard client registration', () => {
            zkAuditService.registerDashboardClient(mockWebSocket);
            
            // Get the close handler
            const closeHandler = (mockWebSocket.on as jest.Mock).mock.calls.find(
                ([event]) => event === 'close'
            )?.[1];

            expect(closeHandler).toBeDefined();
            closeHandler?.();

            // Trigger metrics update
            zkAuditService.emit('metrics-update');
            
            // Client should not receive updates after disconnection
            expect(mockWebSocket.send).not.toHaveBeenCalled();
        });
    });

    describe('WebSocket handling', () => {
        it('should handle WebSocket connections correctly', () => {
            const mockWs = {
                on: jest.fn(),
                send: jest.fn(),
                close: jest.fn(),
            } as unknown as MockedWebSocket;

            const calls = mockWs.on.mock.calls;
            const closeHandler = calls.find((call) => call[0] === 'close');
            expect(closeHandler).toBeDefined();
        });
    });

    describe('registerDashboardClient', () => {
        it('should register a WebSocket client and handle disconnection', () => {
            zkAuditService.registerDashboardClient(mockWebSocket);

            // Get the close handler
            const closeHandler = (mockWebSocket.on as jest.Mock).mock.calls.find(
                ([event]) => event === 'close'
            )?.[1];

            expect(closeHandler).toBeDefined();
            closeHandler?.();

            expect(mockSecurityAuditService.recordEvent).toHaveBeenCalledWith(
                'DASHBOARD_CLIENT_DISCONNECTED',
                expect.any(Object)
            );
        });

        it('should handle client disconnection errors', () => {
            zkAuditService.registerDashboardClient(mockWebSocket);

            // Get the close handler
            const closeHandler = (mockWebSocket.on as jest.Mock).mock.calls.find(
                ([event]) => event === 'close'
            )?.[1];

            expect(closeHandler).toBeDefined();

            // Simulate error during disconnection
            mockSecurityAuditService.recordEvent.mockRejectedValueOnce(new Error('Test error'));
            closeHandler?.();

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'DASHBOARD_CLIENT_DISCONNECT_ERROR',
                'HIGH',
                expect.any(Object)
            );
        });
    });
});

export interface Database {
    public: { Tables: { [key: string]: any } };
}
