import { SecurityAuditService } from './SecurityAuditService';
import { HIPAACompliantAuditService } from './HIPAACompliantAuditService';
import { EncryptionKeyRotationService, KeyPurpose } from './EncryptionKeyRotationService';
import * as fs from 'fs/promises';
import * as path from 'path';
import crypto from 'crypto';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';

interface BackupConfig {
    dataType: string;
    retentionPeriod: number; // in days
    encryptionRequired: boolean;
    compressionRequired: boolean;
    verificationRequired: boolean;
    schedule: {
        frequency: number; // in hours
        startTime?: string; // HH:mm format
        maxDuration?: number; // in minutes
    };
}

interface BackupMetadata {
    id: string;
    timestamp: Date;
    dataType: string;
    size: number;
    chunks: number;
    encryptionKeyId?: string;
    hash: string;
    compressionRatio?: number;
    verificationStatus: 'PENDING' | 'SUCCESS' | 'FAILURE';
    lastVerified?: Date;
    restorationTested?: Date;
}

interface BackupVerificationResult {
    isValid: boolean;
    errors?: string[];
    details: {
        hashMatch: boolean;
        sizeMatch: boolean;
        decryptionSuccess: boolean;
        contentVerified: boolean;
    };
}

export class SecureBackupService {
    private readonly backupPath: string;
    private readonly metadataPath: string;
    private readonly tempPath: string;
    private readonly backupConfigs: Map<string, BackupConfig> = new Map();
    private backupSchedules: Map<string, NodeJS.Timeout> = new Map();

    constructor(
        private readonly securityAuditService: SecurityAuditService,
        private readonly hipaaAuditService: HIPAACompliantAuditService,
        private readonly keyRotationService: EncryptionKeyRotationService,
        backupPath?: string
    ) {
        this.backupPath = backupPath || path.join(__dirname, '../backups');
        this.metadataPath = path.join(this.backupPath, 'metadata');
        this.tempPath = path.join(this.backupPath, 'temp');
        this.initializeBackupConfigs();
    }

    private initializeBackupConfigs(): void {
        // PHI Data Backups
        this.backupConfigs.set('PHI', {
            dataType: 'PHI',
            retentionPeriod: 365 * 6, // 6 years
            encryptionRequired: true,
            compressionRequired: true,
            verificationRequired: true,
            schedule: {
                frequency: 24, // daily
                startTime: '02:00', // 2 AM
                maxDuration: 120 // 2 hours
            }
        });

        // Audit Log Backups
        this.backupConfigs.set('AUDIT_LOGS', {
            dataType: 'AUDIT_LOGS',
            retentionPeriod: 365 * 6, // 6 years
            encryptionRequired: true,
            compressionRequired: true,
            verificationRequired: true,
            schedule: {
                frequency: 12, // twice daily
                startTime: '00:00', // midnight
                maxDuration: 60 // 1 hour
            }
        });

        // System Configuration Backups
        this.backupConfigs.set('SYSTEM_CONFIG', {
            dataType: 'SYSTEM_CONFIG',
            retentionPeriod: 365, // 1 year
            encryptionRequired: true,
            compressionRequired: true,
            verificationRequired: true,
            schedule: {
                frequency: 168, // weekly
                startTime: '01:00', // 1 AM
                maxDuration: 30 // 30 minutes
            }
        });
    }

    async initialize(): Promise<void> {
        try {
            // Create required directories
            await fs.mkdir(this.backupPath, { recursive: true });
            await fs.mkdir(this.metadataPath, { recursive: true });
            await fs.mkdir(this.tempPath, { recursive: true });

            // Create type-specific directories
            for (const config of this.backupConfigs.values()) {
                await fs.mkdir(path.join(this.backupPath, config.dataType), { recursive: true });
            }

            // Schedule backups
            this.scheduleBackups();

            await this.hipaaAuditService.logEvent({
                eventType: 'SYSTEM_OPERATION',
                actor: {
                    id: 'SYSTEM',
                    role: 'SYSTEM',
                    ipAddress: '127.0.0.1'
                },
                action: {
                    type: 'CREATE',
                    status: 'SUCCESS',
                    details: {
                        operation: 'BACKUP_SERVICE_INIT'
                    }
                },
                resource: {
                    type: 'SYSTEM',
                    id: 'backup-service',
                    description: 'Secure Backup Service'
                }
            });
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'BACKUP_SERVICE_INIT_ERROR',
                'HIGH',
                {
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
            );
            throw error;
        }
    }

    async createBackup(
        dataType: string,
        sourcePath: string,
        metadata?: Record<string, any>
    ): Promise<BackupMetadata> {
        const config = this.backupConfigs.get(dataType);
        if (!config) {
            throw new Error(`No backup configuration found for data type: ${dataType}`);
        }

        try {
            const backupId = crypto.randomBytes(16).toString('hex');
            const timestamp = new Date();
            const stats = await fs.stat(sourcePath);

            // Create backup metadata
            const backupMetadata: BackupMetadata = {
                id: backupId,
                timestamp,
                dataType,
                size: stats.size,
                chunks: 0,
                hash: '',
                verificationStatus: 'PENDING'
            };

            // Process backup
            const backupFileName = `backup-${backupId}-${timestamp.toISOString()}.bak`;
            const backupFilePath = path.join(this.backupPath, dataType, backupFileName);
            const tempFilePath = path.join(this.tempPath, backupFileName);

            // Create hash stream
            const hash = crypto.createHash('sha256');

            // Compress data
            if (config.compressionRequired) {
                await pipeline(
                    createReadStream(sourcePath),
                    createGzip(),
                    createWriteStream(tempFilePath)
                );

                const compressedStats = await fs.stat(tempFilePath);
                backupMetadata.compressionRatio = stats.size / compressedStats.size;
            } else {
                await fs.copyFile(sourcePath, tempFilePath);
            }

            // Encrypt if required
            if (config.encryptionRequired) {
                const key = await this.keyRotationService.getActiveKey(KeyPurpose.BACKUP_ENCRYPTION);
                backupMetadata.encryptionKeyId = key.id;

                const iv = crypto.randomBytes(16);
                const cipher = crypto.createCipheriv(key.algorithm, key.keyMaterial, iv);

                await pipeline(
                    createReadStream(tempFilePath),
                    cipher,
                    createWriteStream(backupFilePath)
                );

                // Update hash with encrypted data
                await pipeline(
                    createReadStream(backupFilePath),
                    hash
                );
            } else {
                await fs.rename(tempFilePath, backupFilePath);

                // Update hash with unencrypted data
                await pipeline(
                    createReadStream(backupFilePath),
                    hash
                );
            }

            // Save metadata
            backupMetadata.hash = hash.digest('hex');
            await this.saveBackupMetadata(backupMetadata);

            // Verify backup if required
            if (config.verificationRequired) {
                const verificationResult = await this.verifyBackup(backupId);
                backupMetadata.verificationStatus = verificationResult.isValid ? 'SUCCESS' : 'FAILURE';
                await this.saveBackupMetadata(backupMetadata);

                if (!verificationResult.isValid) {
                    throw new Error(`Backup verification failed: ${verificationResult.errors?.join(', ')}`);
                }
            }

            await this.hipaaAuditService.logEvent({
                eventType: 'SYSTEM_OPERATION',
                actor: {
                    id: 'SYSTEM',
                    role: 'SYSTEM',
                    ipAddress: '127.0.0.1'
                },
                action: {
                    type: 'CREATE',
                    status: 'SUCCESS',
                    details: {
                        operation: 'CREATE_BACKUP',
                        backupId,
                        dataType,
                        size: stats.size
                    }
                },
                resource: {
                    type: 'SYSTEM',
                    id: backupId,
                    description: 'Backup'
                }
            });

            return backupMetadata;
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'BACKUP_CREATE_ERROR',
                'HIGH',
                {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    dataType
                }
            );
            throw error;
        }
    }

    async verifyBackup(backupId: string): Promise<BackupVerificationResult> {
        try {
            const metadata = await this.getBackupMetadata(backupId);
            const backupPath = this.getBackupPath(metadata);
            const verificationPath = path.join(this.tempPath, `verify-${backupId}`);

            const result: BackupVerificationResult = {
                isValid: false,
                errors: [],
                details: {
                    hashMatch: false,
                    sizeMatch: false,
                    decryptionSuccess: false,
                    contentVerified: false
                }
            };

            // Verify file exists
            const stats = await fs.stat(backupPath);
            if (stats.size !== metadata.size) {
                result.errors!.push('Backup size mismatch');
            } else {
                result.details.sizeMatch = true;
            }

            // Verify hash
            const hash = crypto.createHash('sha256');
            await pipeline(
                createReadStream(backupPath),
                hash
            );

            if (hash.digest('hex') !== metadata.hash) {
                result.errors!.push('Backup hash mismatch');
            } else {
                result.details.hashMatch = true;
            }

            // Decrypt and verify if encrypted
            if (metadata.encryptionKeyId) {
                try {
                    const key = await this.keyRotationService.getKey(metadata.encryptionKeyId);
                    const decipher = crypto.createDecipheriv(key.algorithm, key.keyMaterial, key.iv!);

                    await pipeline(
                        createReadStream(backupPath),
                        decipher,
                        createWriteStream(verificationPath)
                    );

                    result.details.decryptionSuccess = true;
                } catch (error) {
                    result.errors!.push('Backup decryption failed');
                }
            }

            // Decompress if needed
            if (metadata.compressionRatio) {
                try {
                    const decompressedPath = `${verificationPath}-decompressed`;
                    await pipeline(
                        createReadStream(verificationPath),
                        createGunzip(),
                        createWriteStream(decompressedPath)
                    );

                    // Verify decompressed size
                    const decompressedStats = await fs.stat(decompressedPath);
                    if (Math.abs(decompressedStats.size * metadata.compressionRatio - metadata.size) > 1024) {
                        result.errors!.push('Decompression size mismatch');
                    }

                    await fs.unlink(decompressedPath);
                } catch (error) {
                    result.errors!.push('Backup decompression failed');
                }
            }

            // Clean up verification file
            await fs.unlink(verificationPath).catch(() => { });

            // Update verification status
            result.isValid = result.errors!.length === 0;
            metadata.verificationStatus = result.isValid ? 'SUCCESS' : 'FAILURE';
            metadata.lastVerified = new Date();
            await this.saveBackupMetadata(metadata);

            await this.hipaaAuditService.logEvent({
                eventType: 'SYSTEM_OPERATION',
                actor: {
                    id: 'SYSTEM',
                    role: 'SYSTEM',
                    ipAddress: '127.0.0.1'
                },
                action: {
                    type: 'UPDATE',
                    status: result.isValid ? 'SUCCESS' : 'FAILURE',
                    details: {
                        operation: 'VERIFY_BACKUP',
                        backupId,
                        verificationDetails: result.details
                    }
                },
                resource: {
                    type: 'SYSTEM',
                    id: backupId,
                    description: 'Backup'
                }
            });

            return result;
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'BACKUP_VERIFY_ERROR',
                'HIGH',
                {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    backupId
                }
            );
            throw error;
        }
    }

    async testRestoration(
        backupId: string,
        targetPath: string
    ): Promise<void> {
        try {
            const metadata = await this.getBackupMetadata(backupId);
            const backupPath = this.getBackupPath(metadata);
            const restorationPath = path.join(this.tempPath, `restore-${backupId}`);

            // Decrypt if needed
            if (metadata.encryptionKeyId) {
                const key = await this.keyRotationService.getKey(metadata.encryptionKeyId);
                const decipher = crypto.createDecipheriv(key.algorithm, key.keyMaterial, key.iv!);

                await pipeline(
                    createReadStream(backupPath),
                    decipher,
                    createWriteStream(restorationPath)
                );
            } else {
                await fs.copyFile(backupPath, restorationPath);
            }

            // Decompress if needed
            if (metadata.compressionRatio) {
                const decompressedPath = `${restorationPath}-decompressed`;
                await pipeline(
                    createReadStream(restorationPath),
                    createGunzip(),
                    createWriteStream(decompressedPath)
                );

                await fs.rename(decompressedPath, targetPath);
                await fs.unlink(restorationPath);
            } else {
                await fs.rename(restorationPath, targetPath);
            }

            // Verify restored file
            const stats = await fs.stat(targetPath);
            if (stats.size !== metadata.size) {
                throw new Error('Restored file size mismatch');
            }

            // Update metadata
            metadata.restorationTested = new Date();
            await this.saveBackupMetadata(metadata);

            await this.hipaaAuditService.logEvent({
                eventType: 'SYSTEM_OPERATION',
                actor: {
                    id: 'SYSTEM',
                    role: 'SYSTEM',
                    ipAddress: '127.0.0.1'
                },
                action: {
                    type: 'UPDATE',
                    status: 'SUCCESS',
                    details: {
                        operation: 'TEST_RESTORATION',
                        backupId,
                        targetPath
                    }
                },
                resource: {
                    type: 'SYSTEM',
                    id: backupId,
                    description: 'Backup'
                }
            });
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'BACKUP_RESTORE_TEST_ERROR',
                'HIGH',
                {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    backupId
                }
            );
            throw error;
        }
    }

    private async saveBackupMetadata(metadata: BackupMetadata): Promise<void> {
        const metadataPath = path.join(this.metadataPath, `${metadata.id}.json`);
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    }

    private async getBackupMetadata(backupId: string): Promise<BackupMetadata> {
        const metadataPath = path.join(this.metadataPath, `${backupId}.json`);
        const content = await fs.readFile(metadataPath, 'utf-8');
        return JSON.parse(content);
    }

    private getBackupPath(metadata: BackupMetadata): string {
        return path.join(
            this.backupPath,
            metadata.dataType,
            `backup-${metadata.id}-${metadata.timestamp.toISOString()}.bak`
        );
    }

    private scheduleBackups(): void {
        for (const [dataType, config] of this.backupConfigs.entries()) {
            const schedule = config.schedule;
            const now = new Date();
            let nextRun: Date;

            if (schedule.startTime) {
                const [hours, minutes] = schedule.startTime.split(':').map(Number);
                nextRun = new Date(now);
                nextRun.setHours(hours, minutes, 0, 0);
                if (nextRun <= now) {
                    nextRun.setDate(nextRun.getDate() + 1);
                }
            } else {
                nextRun = new Date(now.getTime() + schedule.frequency * 60 * 60 * 1000);
            }

            const timeout = setTimeout(async () => {
                try {
                    // Implement backup logic here
                    // This would typically involve scanning the data directory
                    // and creating backups of modified files
                } catch (error) {
                    await this.securityAuditService.recordAlert(
                        'BACKUP_SCHEDULE_ERROR',
                        'HIGH',
                        {
                            error: error instanceof Error ? error.message : 'Unknown error',
                            dataType
                        }
                    );
                }
            }, nextRun.getTime() - now.getTime());

            this.backupSchedules.set(dataType, timeout);
        }
    }

    async cleanup(): Promise<void> {
        try {
            // Clear backup schedules
            for (const timeout of this.backupSchedules.values()) {
                clearTimeout(timeout);
            }
            this.backupSchedules.clear();

            // Clean up temp directory
            await fs.rm(this.tempPath, { recursive: true, force: true });
            await fs.mkdir(this.tempPath, { recursive: true });
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'BACKUP_SERVICE_CLEANUP_ERROR',
                'HIGH',
                {
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
            );
            throw error;
        }
    }
} 