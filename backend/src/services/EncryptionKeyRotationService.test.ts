import { EncryptionKeyRotationService, KeyPurpose, KeyStatus } from "./EncryptionKeyRotationService";
import { SecurityAuditService } from "./SecurityAuditService";
import { HIPAACompliantAuditService } from "./HIPAACompliantAuditService";
import * as fs from 'fs/promises';
import * as path from 'path';
import os from 'os';
jest.mock('./SecurityAuditService');
jest.mock('./HIPAACompliantAuditService');
describe('EncryptionKeyRotationService', () => {
    let keyRotationService: EncryptionKeyRotationService;
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
        // Create temporary directory for test keys
        tempDir = path.join(os.tmpdir(), 'key-rotation-test-' + Math.random().toString(36).slice(2));
        await fs.mkdir(tempDir, { recursive: true });
        keyRotationService = new EncryptionKeyRotationService(mockSecurityAuditService, mockHipaaAuditService, tempDir);
        await keyRotationService.initialize();
    });
    afterEach(async () => {
        await keyRotationService.cleanup();
        // Clean up temporary directory
        await fs.rm(tempDir, { recursive: true, force: true });
    });
    describe('Initialization', () => {
        it('should create required directories', async () => {
            const keysPath = path.join(tempDir);
            const backupPath = path.join(tempDir, 'backup');
            const [keysExist, backupExists] = await Promise.all([
                fs.stat(keysPath).then(() => true).catch(() => false),
                fs.stat(backupPath).then(() => true).catch(() => false)
            ]);
            expect(keysExist).toBe(true);
            expect(backupExists).toBe(true);
        });
        it('should generate initial keys for all purposes', async () => {
            const files = await fs.readdir(tempDir);
            const keyFiles = files.filter((f: any) => f.startsWith('key-') && f.endsWith('.json'));
            // Should have one key for each purpose
            expect(keyFiles.length).toBe(Object.keys(KeyPurpose).length);
            // Verify each key file
            for (const file of keyFiles) {
                const content = await fs.readFile(path.join(tempDir, file), 'utf-8');
                const key = JSON.parse(content);
                expect(key.status).toBe(KeyStatus.ACTIVE);
                expect(key.algorithm).toBe('aes-256-gcm');
                expect(key.keyMaterial).toBeDefined();
                expect(key.iv).toBeDefined();
            }
        });
        it('should handle initialization errors', async () => {
            jest.spyOn(fs, 'mkdir').mockRejectedValueOnce(new Error('Directory creation failed'));
            await expect(keyRotationService.initialize()).rejects.toThrow();
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('KEY_ROTATION_INIT_ERROR', 'HIGH', expect.any(Object));
        });
    });
    describe('Key Rotation', () => {
        it('should rotate key on demand', async () => {
            // Get initial key
            const files = await fs.readdir(tempDir);
            const initialKeyFile = files.find(f => f.startsWith('key-') && f.endsWith('.json'));
            const initialKeyContent = await fs.readFile(path.join(tempDir, initialKeyFile!), 'utf-8');
            const initialKey = JSON.parse(initialKeyContent);
            // Rotate key
            await keyRotationService.rotateKey(KeyPurpose.PHI_ENCRYPTION);
            // Verify old key was marked as rotating
            const oldKeyContent = await fs.readFile(path.join(tempDir, initialKeyFile!), 'utf-8');
            const oldKey = JSON.parse(oldKeyContent);
            expect(oldKey.status).toBe(KeyStatus.ROTATING);
            expect(oldKey.rotatedAt).toBeDefined();
            // Verify new key was created
            const newFiles = await fs.readdir(tempDir);
            const newKeyFile = newFiles.find(f => f.startsWith('key-') &&
                f.endsWith('.json') &&
                f !== initialKeyFile);
            expect(newKeyFile).toBeDefined();
            const newKeyContent = await fs.readFile(path.join(tempDir, newKeyFile!), 'utf-8');
            const newKey = JSON.parse(newKeyContent);
            expect(newKey.status).toBe(KeyStatus.ACTIVE);
            expect(newKey.id).not.toBe(initialKey.id);
            expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(expect.objectContaining({
                eventType: 'SYSTEM_OPERATION',
                action: {
                    type: 'UPDATE',
                    status: 'SUCCESS'
                }
            }));
        });
        it('should backup keys when required', async () => {
            await keyRotationService.rotateKey(KeyPurpose.PHI_ENCRYPTION);
            const backupFiles = await fs.readdir(path.join(tempDir, 'backup'));
            expect(backupFiles.length).toBeGreaterThan(0);
            expect(backupFiles[0]).toMatch(/^key-.*\.backup$/);
            const backupContent = await fs.readFile(path.join(tempDir, 'backup', backupFiles[0]), 'utf-8');
            const backupKey = JSON.parse(backupContent);
            expect(backupKey.keyMaterial).toBeDefined();
            expect(backupKey.iv).toBeDefined();
        });
        it('should handle rotation errors', async () => {
            jest.spyOn(fs, 'writeFile').mockRejectedValueOnce(new Error('Write error'));
            await expect(keyRotationService.rotateKey(KeyPurpose.PHI_ENCRYPTION)).rejects.toThrow();
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('KEY_ROTATION_ERROR', 'HIGH', expect.any(Object));
        });
    });
    describe('Automated Rotation', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });
        afterEach(() => {
            jest.useRealTimers();
        });
        it('should schedule key rotations', async () => {
            const rotationPeriod = 90 * 24 * 60 * 60 * 1000; // 90 days
            jest.advanceTimersByTime(rotationPeriod);
            // Verify rotation was scheduled
            expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), expect.any(Number));
        });
        it('should rotate expired keys immediately', async () => {
            // Create an expired key
            const expiredKey = {
                id: 'test-key',
                version: 1,
                algorithm: 'aes-256-gcm',
                keyMaterial: Buffer.from('test-key').toString('base64'),
                iv: Buffer.from('test-iv').toString('base64'),
                createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
                expiresAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
                status: KeyStatus.ACTIVE,
                purpose: [KeyPurpose.PHI_ENCRYPTION],
                metadata: {
                    hash: 'test-hash',
                    usageCount: 0
                }
            };
            await fs.writeFile(path.join(tempDir, `key-${expiredKey.id}.json`), JSON.stringify(expiredKey));
            // Reinitialize service to load expired key
            await keyRotationService.initialize();
            // Verify immediate rotation
            const files = await fs.readdir(tempDir);
            const newKeyFile = files.find(f => f.startsWith('key-') &&
                f.endsWith('.json') &&
                !f.includes(expiredKey.id));
            expect(newKeyFile).toBeDefined();
        });
    });
    describe('Key Loading', () => {
        it('should load existing keys on initialization', async () => {
            // Create test key
            const testKey = {
                id: 'test-key',
                version: 1,
                algorithm: 'aes-256-gcm',
                keyMaterial: Buffer.from('test-key').toString('base64'),
                iv: Buffer.from('test-iv').toString('base64'),
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                status: KeyStatus.ACTIVE,
                purpose: [KeyPurpose.PHI_ENCRYPTION],
                metadata: {
                    hash: 'test-hash',
                    usageCount: 0
                }
            };
            await fs.writeFile(path.join(tempDir, `key-${testKey.id}.json`), JSON.stringify(testKey));
            // Reinitialize service
            await keyRotationService.cleanup();
            await keyRotationService.initialize();
            // Verify key was loaded
            const files = await fs.readdir(tempDir);
            expect(files).toContain(`key-${testKey.id}.json`);
        });
        it('should handle key loading errors', async () => {
            jest.spyOn(fs, 'readFile').mockRejectedValueOnce(new Error('Read error'));
            await expect(keyRotationService.initialize()).rejects.toThrow();
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('KEY_LOAD_ERROR', 'HIGH', expect.any(Object));
        });
    });
    describe('Cleanup', () => {
        it('should clear all schedules and keys', async () => {
            await keyRotationService.cleanup();
            // Verify schedules were cleared
            const timeouts = (keyRotationService as any).rotationSchedules;
            expect(timeouts.size).toBe(0);
            // Verify active keys were cleared
            const activeKeys = (keyRotationService as any).activeKeys;
            expect(activeKeys.size).toBe(0);
        });
        it('should handle cleanup errors', async () => {
            jest.spyOn(Map.prototype, 'clear').mockImplementationOnce(() => {
                throw new Error('Clear error');
            });
            await expect(keyRotationService.cleanup()).rejects.toThrow();
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('KEY_ROTATION_CLEANUP_ERROR', 'HIGH', expect.any(Object));
        });
    });
});
