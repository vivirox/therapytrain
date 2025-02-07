import { HIPAACompliantAuditService } from "./HIPAACompliantAuditService";
import { SecurityAuditService } from "./SecurityAuditService";
import { VerificationKeyService } from "./VerificationKeyService";
import * as fs from 'fs/promises';
import * as path from 'path';
import os from 'os';
jest.mock('./SecurityAuditService');
jest.mock('./VerificationKeyService');
describe('HIPAACompliantAuditService', () => {
    let hipaaAuditService: HIPAACompliantAuditService;
    let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
    let mockVerificationKeyService: jest.Mocked<VerificationKeyService>;
    let tempDir: string;
    beforeEach(async () => {
        mockSecurityAuditService = {
            recordAlert: jest.fn().mockResolvedValue(undefined)
        } as any;
        mockVerificationKeyService = {
            getCurrentKey: jest.fn().mockResolvedValue({
                key: 'test-key',
                id: 'test-id'
            })
        } as any;
        // Create temporary directory for test logs
        tempDir = path.join(os.tmpdir(), 'hipaa-audit-test-' + Math.random().toString(36).slice(2));
        await fs.mkdir(tempDir, { recursive: true });
        hipaaAuditService = new HIPAACompliantAuditService(mockSecurityAuditService, mockVerificationKeyService, tempDir);
        await hipaaAuditService.initialize();
    });
    afterEach(async () => {
        // Clean up temporary directory
        await fs.rm(tempDir, { recursive: true, force: true });
    });
    describe('Event Logging', () => {
        it('should log PHI access events', async () => {
            const event = {
                eventType: 'PHI_ACCESS' as const,
                timestamp: new Date(),
                actor: {
                    id: 'user123',
                    role: 'THERAPIST',
                    ipAddress: '127.0.0.1',
                    userAgent: 'test-agent'
                },
                action: {
                    type: 'READ' as const,
                    status: 'SUCCESS' as const,
                    details: { recordType: 'THERAPY_NOTE' }
                },
                resource: {
                    type: 'PHI' as const,
                    id: 'note123',
                    description: 'Therapy session notes'
                },
                patient: {
                    id: 'patient123',
                    mrn: 'MRN123'
                },
                location: {
                    facility: 'Main Clinic',
                    department: 'Mental Health'
                },
                reason: 'Routine care review'
            };
            const eventId = await hipaaAuditService.logEvent(event);
            expect(eventId).toBeDefined();
            expect(typeof eventId).toBe('string');
            // Verify log file content
            const files = await fs.readdir(tempDir);
            expect(files.length).toBe(1);
            const logContent = await fs.readFile(path.join(tempDir, files[0]), 'utf-8');
            const logEntry = JSON.parse(logContent.trim());
            expect(logEntry).toMatchObject({
                ...event,
                id: eventId,
                metadata: expect.any(Object)
            });
        });
        it('should log and alert on high-risk events', async () => {
            const event = {
                eventType: 'PHI_MODIFICATION' as const,
                timestamp: new Date(),
                actor: {
                    id: 'user123',
                    role: 'ADMIN',
                    ipAddress: '127.0.0.1'
                },
                action: {
                    type: 'DELETE' as const,
                    status: 'SUCCESS' as const,
                    details: { recordType: 'PATIENT_RECORD' }
                },
                resource: {
                    type: 'PHI' as const,
                    id: 'record123',
                    description: 'Patient record'
                }
            };
            await hipaaAuditService.logEvent(event);
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('HIPAA_HIGH_RISK_EVENT', 'HIGH', expect.objectContaining({
                eventType: event.eventType,
                actionType: event.action.type
            }));
        });
        it('should maintain event chain integrity', async () => {
            const events = [
                {
                    eventType: 'USER_AUTHENTICATION' as const,
                    timestamp: new Date(),
                    actor: {
                        id: 'user123',
                        role: 'THERAPIST',
                        ipAddress: '127.0.0.1'
                    },
                    action: {
                        type: 'LOGIN' as const,
                        status: 'SUCCESS' as const,
                        details: {}
                    },
                    resource: {
                        type: 'SYSTEM' as const,
                        id: 'auth',
                        description: 'Authentication system'
                    }
                },
                {
                    eventType: 'PHI_ACCESS' as const,
                    timestamp: new Date(),
                    actor: {
                        id: 'user123',
                        role: 'THERAPIST',
                        ipAddress: '127.0.0.1'
                    },
                    action: {
                        type: 'READ' as const,
                        status: 'SUCCESS' as const,
                        details: {}
                    },
                    resource: {
                        type: 'PHI' as const,
                        id: 'record123',
                        description: 'Patient record'
                    }
                }
            ];
            // Log events sequentially
            for (const event of events) {
                await hipaaAuditService.logEvent(event);
            }
            // Query events and verify chain
            const startDate = new Date(Date.now() - 3600000); // 1 hour ago
            const endDate = new Date();
            const retrievedEvents = await hipaaAuditService.queryEvents(startDate, endDate);
            expect(retrievedEvents.length).toBe(2);
            expect(retrievedEvents[1].metadata.previousEventHash)
                .toBe(retrievedEvents[0].metadata.hashValue);
        });
    });
    describe('Event Querying', () => {
        it('should retrieve filtered events', async () => {
            // Log multiple events
            const events = [
                {
                    eventType: 'PHI_ACCESS' as const,
                    actor: {
                        id: 'user1',
                        role: 'THERAPIST',
                        ipAddress: '127.0.0.1'
                    },
                    action: {
                        type: 'READ' as const,
                        status: 'SUCCESS' as const,
                        details: {}
                    },
                    resource: {
                        type: 'PHI' as const,
                        id: 'record1',
                        description: 'Record 1'
                    }
                },
                {
                    eventType: 'SYSTEM_OPERATION' as const,
                    actor: {
                        id: 'user2',
                        role: 'ADMIN',
                        ipAddress: '127.0.0.1'
                    },
                    action: {
                        type: 'UPDATE' as const,
                        status: 'SUCCESS' as const,
                        details: {}
                    },
                    resource: {
                        type: 'SYSTEM' as const,
                        id: 'config',
                        description: 'System config'
                    }
                }
            ];
            for (const event of events) {
                await hipaaAuditService.logEvent(event);
            }
            // Query with filters
            const startDate = new Date(Date.now() - 3600000);
            const endDate = new Date();
            const filteredEvents = await hipaaAuditService.queryEvents(startDate, endDate, {
                eventType: 'PHI_ACCESS',
                actorId: 'user1'
            });
            expect(filteredEvents.length).toBe(1);
            expect(filteredEvents[0].eventType).toBe('PHI_ACCESS');
            expect(filteredEvents[0].actor.id).toBe('user1');
        });
        it('should handle query errors gracefully', async () => {
            jest.spyOn(fs, 'readFile').mockRejectedValue(new Error('Read error'));
            await expect(hipaaAuditService.queryEvents(new Date(), new Date())).rejects.toThrow();
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('HIPAA_AUDIT_QUERY_ERROR', 'HIGH', expect.any(Object));
        });
    });
    describe('Event Archiving', () => {
        it('should archive old events based on retention policy', async () => {
            // Create old log file
            const oldDate = new Date();
            oldDate.setFullYear(oldDate.getFullYear() - 1);
            const oldFileName = `hipaa-audit-${oldDate.toISOString().split('T')[0]}.log`;
            const oldFilePath = path.join(tempDir, oldFileName);
            await fs.writeFile(oldFilePath, 'test log content', 'utf-8');
            await hipaaAuditService.archiveOldEvents();
            // Verify file was moved to archive
            const archivePath = path.join(tempDir, 'archive', oldFileName);
            const archiveExists = await fs.stat(archivePath)
                .then(() => true)
                .catch(() => false);
            expect(archiveExists).toBe(true);
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('HIPAA_AUDIT_ARCHIVED', 'LOW', expect.any(Object));
        });
        it('should handle archiving errors gracefully', async () => {
            jest.spyOn(fs, 'rename').mockRejectedValue(new Error('Rename error'));
            await expect(hipaaAuditService.archiveOldEvents()).rejects.toThrow();
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('HIPAA_AUDIT_ARCHIVE_ERROR', 'HIGH', expect.any(Object));
        });
    });
});
