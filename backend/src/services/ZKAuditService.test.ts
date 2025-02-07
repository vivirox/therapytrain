import { ZKAuditService } from "./ZKAuditService";
import { SecurityAuditService } from "./SecurityAuditService";
import * as fs from 'fs/promises';
import * as path from 'path';
import os from 'os';
jest.mock('./SecurityAuditService');
describe('ZKAuditService', () => {
    let zkAuditService: ZKAuditService;
    let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
    let tempDir: string;
    beforeEach(async () => {
        mockSecurityAuditService = {
            recordAlert: jest.fn().mockResolvedValue(undefined)
        } as any;
        // Create temporary directory for test logs
        tempDir = path.join(os.tmpdir(), 'zk-audit-test-' + Math.random().toString(36).slice(2));
        await fs.mkdir(tempDir, { recursive: true });
        zkAuditService = new ZKAuditService(mockSecurityAuditService, tempDir);
        await zkAuditService.initialize();
    });
    afterEach(async () => {
        // Clean up temporary directory
        await fs.rm(tempDir, { recursive: true, force: true });
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
});
