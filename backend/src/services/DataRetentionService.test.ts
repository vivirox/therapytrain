import { DataRetentionService, DataType } from './DataRetentionService';
import { SecurityAuditService } from './SecurityAuditService';
import { HIPAACompliantAuditService } from './HIPAACompliantAuditService';
import * as fs from 'fs/promises';
import * as path from 'path';
import os from 'os';

jest.mock('./SecurityAuditService');
jest.mock('./HIPAACompliantAuditService');

describe('DataRetentionService', () => {
    let dataRetentionService: DataRetentionService;
    let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
    let mockHipaaAuditService: jest.Mocked<HIPAACompliantAuditService>;
    let tempDir: string;

    beforeEach(async () => {
        mockSecurityAuditService = {
            recordAlert: jest.fn().mockResolvedValue(undefined)
        } as any;

        mockHipaaAuditService = {
            logEvent: jest.fn().mockResolvedValue('test-event-id')
        } as any;

        // Create temporary directory for test data
        tempDir = path.join(os.tmpdir(), 'data-retention-test-' + Math.random().toString(36).slice(2));
        await fs.mkdir(tempDir, { recursive: true });

        dataRetentionService = new DataRetentionService(
            mockSecurityAuditService,
            mockHipaaAuditService,
            tempDir
        );
        await dataRetentionService.initialize();
    });

    afterEach(async () => {
        // Clean up temporary directory
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    describe('Initialization', () => {
        it('should create required directories', async () => {
            const dataPath = path.join(tempDir, DataType.PATIENT_RECORD);
            const archivePath = path.join(tempDir, 'archive', DataType.PATIENT_RECORD);

            const [dataExists, archiveExists] = await Promise.all([
                fs.stat(dataPath).then(() => true).catch(() => false),
                fs.stat(archivePath).then(() => true).catch(() => false)
            ]);

            expect(dataExists).toBe(true);
            expect(archiveExists).toBe(true);
        });

        it('should handle initialization errors', async () => {
            jest.spyOn(fs, 'mkdir').mockRejectedValueOnce(new Error('Directory creation failed'));

            await expect(dataRetentionService.initialize()).rejects.toThrow();
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'DATA_RETENTION_INIT_ERROR',
                'HIGH',
                expect.any(Object)
            );
        });
    });

    describe('Retention Policy Processing', () => {
        it('should archive old files', async () => {
            // Create test file
            const fileName = 'test-patient-record.json';
            const filePath = path.join(tempDir, DataType.PATIENT_RECORD, fileName);
            await fs.writeFile(filePath, 'test data');

            // Set file's mtime to 2 years ago
            const twoYearsAgo = new Date();
            twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
            await fs.utimes(filePath, twoYearsAgo, twoYearsAgo);

            await dataRetentionService.processRetentionPolicies();

            // Verify file was archived
            const originalExists = await fs.stat(filePath)
                .then(() => true)
                .catch(() => false);
            expect(originalExists).toBe(false);

            const archivedFiles = await fs.readdir(path.join(tempDir, 'archive', DataType.PATIENT_RECORD));
            expect(archivedFiles.length).toBe(1);
            expect(archivedFiles[0]).toMatch(new RegExp(`^${fileName}\\..*\\.archive$`));

            expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'SYSTEM_OPERATION',
                    action: {
                        type: 'UPDATE',
                        status: 'SUCCESS'
                    }
                })
            );
        });

        it('should delete expired files', async () => {
            // Create test file
            const fileName = 'old-patient-record.json';
            const filePath = path.join(tempDir, DataType.PATIENT_RECORD, fileName);
            await fs.writeFile(filePath, 'test data');

            // Set file's mtime to 7 years ago
            const sevenYearsAgo = new Date();
            sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7);
            await fs.utimes(filePath, sevenYearsAgo, sevenYearsAgo);

            await dataRetentionService.processRetentionPolicies();

            // Verify file was deleted
            const fileExists = await fs.stat(filePath)
                .then(() => true)
                .catch(() => false);
            expect(fileExists).toBe(false);

            expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'SYSTEM_OPERATION',
                    action: {
                        type: 'DELETE',
                        status: 'SUCCESS'
                    }
                })
            );
        });

        it('should handle processing errors', async () => {
            jest.spyOn(fs, 'readdir').mockRejectedValueOnce(new Error('Read error'));

            await expect(dataRetentionService.processRetentionPolicies()).rejects.toThrow();
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'DATA_RETENTION_PROCESS_ERROR',
                'HIGH',
                expect.any(Object)
            );
        });
    });

    describe('Retention Status', () => {
        it('should return correct status for data type', async () => {
            // Create test files
            const activeFile = path.join(tempDir, DataType.PATIENT_RECORD, 'active.json');
            const pendingArchivalFile = path.join(tempDir, DataType.PATIENT_RECORD, 'pending-archival.json');
            const archivedFile = path.join(tempDir, 'archive', DataType.PATIENT_RECORD, 'archived.json');

            await Promise.all([
                fs.writeFile(activeFile, 'active'),
                fs.writeFile(pendingArchivalFile, 'pending'),
                fs.writeFile(archivedFile, 'archived')
            ]);

            // Set file mtimes
            const now = new Date();
            const twoYearsAgo = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);
            await fs.utimes(pendingArchivalFile, twoYearsAgo, twoYearsAgo);

            const status = await dataRetentionService.getRetentionStatus(DataType.PATIENT_RECORD);

            expect(status).toEqual({
                total: 3,
                active: 2,
                archived: 1,
                pendingArchival: 1,
                pendingDeletion: 0
            });
        });

        it('should handle status check errors', async () => {
            jest.spyOn(fs, 'readdir').mockRejectedValueOnce(new Error('Read error'));

            await expect(
                dataRetentionService.getRetentionStatus(DataType.PATIENT_RECORD)
            ).rejects.toThrow();

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'DATA_RETENTION_STATUS_ERROR',
                'HIGH',
                expect.any(Object)
            );
        });

        it('should throw error for invalid data type', async () => {
            await expect(
                dataRetentionService.getRetentionStatus('INVALID_TYPE' as DataType)
            ).rejects.toThrow('No retention rule found');
        });
    });
}); 