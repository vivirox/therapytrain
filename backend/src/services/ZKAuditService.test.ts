import { ZKAuditService } from "./ZKAuditService";
import { SecurityAuditService } from "./SecurityAuditService";
import * as fs from 'fs/promises';
import * as path from 'path';
import os from 'os';
import { SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

jest.mock('./SecurityAuditService');
jest.mock('@supabase/supabase-js');
jest.mock('ws');

describe('ZKAuditService', () => {
    let zkAuditService: ZKAuditService;
    let mockSupabase: jest.Mocked<SupabaseClient>;
    let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
    let mockWebSocket: jest.Mocked<WebSocket>;
    let tempDir: string;

    beforeEach(async () => {
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis()
        } as any;

        mockSecurityAuditService = {
            recordAlert: jest.fn().mockResolvedValue(undefined)
        } as any;

        mockWebSocket = {
            on: jest.fn(),
            send: jest.fn(),
            close: jest.fn()
        } as any;

        // Create temporary directory for test logs
        tempDir = path.join(os.tmpdir(), 'zk-audit-test-' + Math.random().toString(36).slice(2));
        await fs.mkdir(tempDir, { recursive: true });
        zkAuditService = new ZKAuditService(mockSupabase, mockSecurityAuditService, tempDir);
        await zkAuditService.initialize();
    });

    afterEach(async () => {
        // Clean up temporary directory
        await fs.rm(tempDir, { recursive: true, force: true });
        await zkAuditService.cleanup();
    });

    describe('Operation Logging', () => {
        it('should log successful operations', async () => {
            const operation = {
                type: 'PROOF_GENERATION' as const,
                timestamp: new Date(),
                sessionId: 'test-session',
                status: 'SUCCESS' as const,
                details: { inputHash: 'abc123' },
                duration: 100
            };
            const operationId = await zkAuditService.logOperation(operation);
            expect(operationId).toBeDefined();
            expect(typeof operationId).toBe('string');
            expect(mockSecurityAuditService.recordAlert).not.toHaveBeenCalled();
            // Verify log file content
            const files = await fs.readdir(tempDir);
            expect(files.length).toBe(1);
            const logContent = await fs.readFile(path.join(tempDir, files[0]), 'utf-8');
            const logEntry = JSON.parse(logContent.trim());
            expect(logEntry).toMatchObject({
                ...operation,
                id: operationId
            });
        });
        it('should log and alert on failed operations', async () => {
            const operation = {
                type: 'PROOF_VERIFICATION' as const,
                timestamp: new Date(),
                sessionId: 'test-session',
                status: 'FAILURE' as const,
                details: { error: 'Verification failed' },
                duration: 50
            };
            await zkAuditService.logOperation(operation);
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('ZK_OPERATION_FAILURE', 'HIGH', expect.objectContaining({
                operationType: operation.type,
                details: operation.details
            }));
        });
        it('should handle log rotation', async () => {
            // Mock file stats to trigger rotation
            jest.spyOn(fs, 'stat').mockResolvedValueOnce({
                size: 200 * 1024 * 1024 // Exceed max size
            } as any);
            const operation = {
                type: 'KEY_ROTATION' as const,
                timestamp: new Date(),
                status: 'SUCCESS' as const,
                details: {},
                duration: 25
            };
            await zkAuditService.logOperation(operation);
            const files = await fs.readdir(tempDir);
            expect(files.length).toBe(2); // Original + new file
        });
    });
    describe('Operation History', () => {
        it('should retrieve filtered operation history', async () => {
            const operations = [
                {
                    type: 'PROOF_GENERATION' as const,
                    timestamp: new Date(),
                    sessionId: 'session1',
                    status: 'SUCCESS' as const,
                    details: {},
                    duration: 100
                },
                {
                    type: 'PROOF_VERIFICATION' as const,
                    timestamp: new Date(),
                    sessionId: 'session2',
                    status: 'FAILURE' as const,
                    details: {},
                    duration: 50
                }
            ];
            // Log operations
            await Promise.all(operations.map(op => zkAuditService.logOperation(op)));
            // Retrieve with filters
            const history = await zkAuditService.getOperationHistory(new Date(Date.now() - 3600000), // 1 hour ago
            new Date(), {
                type: 'PROOF_GENERATION',
                status: 'SUCCESS'
            });
            expect(history.length).toBe(1);
            expect(history[0].type).toBe('PROOF_GENERATION');
            expect(history[0].status).toBe('SUCCESS');
        });
        it('should handle errors in history retrieval', async () => {
            jest.spyOn(fs, 'readFile').mockRejectedValue(new Error('Read error'));
            await expect(zkAuditService.getOperationHistory(new Date(), new Date())).rejects.toThrow();
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('ZK_AUDIT_HISTORY_ERROR', 'HIGH', expect.any(Object));
        });
    });
    describe('Report Generation', () => {
        it('should generate audit report', async () => {
            const operations = [
                {
                    type: 'PROOF_GENERATION' as const,
                    timestamp: new Date(),
                    status: 'SUCCESS' as const,
                    details: {},
                    duration: 100
                },
                {
                    type: 'PROOF_VERIFICATION' as const,
                    timestamp: new Date(),
                    status: 'FAILURE' as const,
                    details: { error: 'Test error' },
                    duration: 50
                },
                {
                    type: 'KEY_ROTATION' as const,
                    timestamp: new Date(),
                    status: 'SUCCESS' as const,
                    details: {},
                    duration: 25
                }
            ];
            // Log operations
            await Promise.all(operations.map(op => zkAuditService.logOperation(op)));
            const startDate = new Date(Date.now() - 3600000); // 1 hour ago
            const endDate = new Date();
            const report = await zkAuditService.generateReport(startDate, endDate);
            expect(report).toMatchObject({
                totalOperations: 3,
                successRate: (2 / 3) * 100,
                averageDuration: (100 + 50 + 25) / 3,
                operationsByType: {
                    PROOF_GENERATION: 1,
                    PROOF_VERIFICATION: 1,
                    KEY_ROTATION: 1
                },
                failureReasons: {
                    'Test error': 1
                },
                keyRotations: 1
            });
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('ZK_AUDIT_REPORT_GENERATED', 'LOW', expect.any(Object));
        });
        it('should handle empty operation history', async () => {
            const report = await zkAuditService.generateReport(new Date(), new Date());
            expect(report).toMatchObject({
                totalOperations: 0,
                successRate: 100,
                averageDuration: 0,
                operationsByType: {},
                failureReasons: {},
                keyRotations: 0
            });
        });
        it('should handle errors in report generation', async () => {
            jest.spyOn(fs, 'readdir').mockRejectedValue(new Error('Read error'));
            await expect(zkAuditService.generateReport(new Date(), new Date())).rejects.toThrow();
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('ZK_AUDIT_REPORT_ERROR', 'HIGH', expect.any(Object));
        });
    });

    describe('recordAuditEvent', () => {
        it('should record an audit event successfully', async () => {
            const mockEvent = {
                eventType: 'PHI_ACCESS',
                timestamp: new Date(),
                actor: { id: 'user1', role: 'THERAPIST', ipAddress: '192.168.1.1' },
                action: { type: 'READ', status: 'SUCCESS', details: {} },
                resource: { type: 'PHI', id: 'record1', description: 'Patient Record' }
            };

            mockSupabase.insert.mockResolvedValueOnce({ data: [{ id: 'event1' }], error: null });

            await zkAuditService.recordAuditEvent(mockEvent);

            expect(mockSupabase.from).toHaveBeenCalledWith('zk_audit_events');
            expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
                eventType: mockEvent.eventType,
                actorId: mockEvent.actor.id
            }));
        });

        it('should handle database errors', async () => {
            const mockEvent = {
                eventType: 'PHI_ACCESS',
                timestamp: new Date(),
                actor: { id: 'user1', role: 'THERAPIST', ipAddress: '192.168.1.1' },
                action: { type: 'READ', status: 'SUCCESS', details: {} },
                resource: { type: 'PHI', id: 'record1', description: 'Patient Record' }
            };

            const error = new Error('Database error');
            mockSupabase.insert.mockRejectedValueOnce(error);

            await expect(zkAuditService.recordAuditEvent(mockEvent))
                .rejects.toThrow('Failed to record audit event');

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'ZK_AUDIT_RECORD_ERROR',
                'HIGH',
                expect.objectContaining({ error: error.message })
            );
        });
    });

    describe('getHistoricalMetrics', () => {
        it('should retrieve historical metrics successfully', async () => {
            const startTime = new Date('2024-01-01');
            const endTime = new Date('2024-01-31');

            mockSupabase.order.mockResolvedValueOnce({
                data: [
                    { eventType: 'PHI_ACCESS', count: 10 },
                    { eventType: 'PHI_MODIFICATION', count: 5 }
                ],
                error: null
            });

            const result = await zkAuditService.getHistoricalMetrics(startTime, endTime);

            expect(mockSupabase.from).toHaveBeenCalledWith('zk_audit_events');
            expect(mockSupabase.select).toHaveBeenCalledWith('*');
            expect(mockSupabase.gte).toHaveBeenCalledWith('timestamp', startTime.toISOString());
            expect(mockSupabase.lte).toHaveBeenCalledWith('timestamp', endTime.toISOString());
            expect(result).toHaveLength(2);
        });

        it('should handle database errors', async () => {
            const error = new Error('Database error');
            mockSupabase.order.mockRejectedValueOnce(error);

            await expect(zkAuditService.getHistoricalMetrics(new Date(), new Date()))
                .rejects.toThrow('Failed to retrieve historical metrics');

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'ZK_AUDIT_METRICS_ERROR',
                'HIGH',
                expect.objectContaining({ error: error.message })
            );
        });
    });

    describe('dashboard client management', () => {
        it('should handle client registration and disconnection', () => {
            zkAuditService.registerDashboardClient(mockWebSocket);

            const closeHandler = mockWebSocket.on.mock.calls.find(([event]) => event === 'close')[1];
            closeHandler();

            expect(mockWebSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
        });

        it('should broadcast metrics updates to connected clients', () => {
            zkAuditService.registerDashboardClient(mockWebSocket);
            zkAuditService.emit('metrics-update');

            expect(mockWebSocket.send).toHaveBeenCalled();
        });
    });
});
