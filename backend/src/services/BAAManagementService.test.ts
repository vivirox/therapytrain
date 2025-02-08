import { SecurityAuditService } from '@services/SecurityAuditService';
import { HIPAACompliantAuditService } from '@services/HIPAACompliantAuditService';
import { BAAManagementService, BAType, BAStatus, BAAStatus, BAADocumentType, DataAccessType, SecurityCategory, SignatureType } from '@services/BAAManagementService';
import * as fs from 'fs/promises';
import * as path from 'path';
import os from 'os';
import { HIPAAEventType, HIPAAActionType } from '@types/hipaa';
jest.mock('@services/SecurityAuditService');
jest.mock('@services/HIPAACompliantAuditService');
describe('BAAManagementService', () => {
    let baaManagementService: BAAManagementService;
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
        tempDir = path.join(os.tmpdir(), 'baa-test-' + Math.random().toString(36).slice(2));
        await fs.mkdir(tempDir, { recursive: true });
        baaManagementService = new BAAManagementService(mockSecurityAuditService, mockHipaaAuditService, tempDir);
        await baaManagementService.initialize();
    });
    afterEach(async () => {
        // Clean up temporary directory
        await fs.rm(tempDir, { recursive: true, force: true });
    });
    describe('Business Associate Management', () => {
        it('should create business associate', async () => {
            const baData = {
                name: 'Test BA',
                type: BAType.SERVICE_PROVIDER,
                contact: {
                    name: 'John Doe',
                    email: 'john@example.com',
                    phone: '123-456-7890',
                    address: '123 Main St'
                },
                services: ['Service 1', 'Service 2'],
                dataAccess: [DataAccessType.VIEW, DataAccessType.CREATE],
                status: BAStatus.ACTIVE
            };
            const ba = await baaManagementService.createBusinessAssociate(baData);
            expect(ba.id).toBeDefined();
            expect(ba.name).toBe(baData.name);
            expect(ba.type).toBe(baData.type);
            expect(ba.createdAt).toBeInstanceOf(Date);
            expect(ba.updatedAt).toBeInstanceOf(Date);
            // Verify file was created
            const filePath = path.join(tempDir, `ba-${ba.id}.json`);
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const savedBA = JSON.parse(fileContent);
            expect(savedBA).toEqual(ba);
            expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(expect.objectContaining({
                eventType: 'ADMINISTRATIVE',
                action: {
                    type: 'CREATE',
                    status: 'SUCCESS'
                }
            }));
        });
        it('should handle business associate creation errors', async () => {
            jest.spyOn(fs, 'writeFile').mockRejectedValueOnce(new Error('Write error'));
            await expect(baaManagementService.createBusinessAssociate({
                name: 'Test BA',
                type: BAType.SERVICE_PROVIDER,
                contact: {
                    name: 'John Doe',
                    email: 'john@example.com',
                    phone: '123-456-7890',
                    address: '123 Main St'
                },
                services: [],
                dataAccess: [],
                status: BAStatus.ACTIVE
            })).rejects.toThrow();
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('BAA_CREATE_ERROR', 'HIGH', expect.any(Object));
        });
    });
    describe('BAA Management', () => {
        it('should create BAA', async () => {
            const baaData = {
                version: '1.0',
                status: BAAStatus.DRAFT,
                effectiveDate: new Date(),
                expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                reviewDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
                lastReviewedBy: 'admin',
                documents: [],
                signatures: [],
                amendments: [],
                dataHandlingRequirements: [],
                securityRequirements: [{
                    id: 'sec-1',
                    category: SecurityCategory.ENCRYPTION,
                    description: 'Data encryption at rest',
                    minimumStandard: 'AES-256',
                    verificationMethod: 'Audit',
                    verificationFrequency: '90'
                }],
                breachNotificationRequirements: [],
                terminationRequirements: []
            };
            const baa = await baaManagementService.createBAA('test-ba-id', baaData);
            expect(baa.id).toBeDefined();
            expect(baa.businessAssociateId).toBe('test-ba-id');
            expect(baa.version).toBe(baaData.version);
            expect(baa.createdAt).toBeInstanceOf(Date);
            expect(baa.updatedAt).toBeInstanceOf(Date);
            // Verify file was created
            const filePath = path.join(tempDir, `baa-${baa.id}.json`);
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const savedBAA = JSON.parse(fileContent);
            expect(savedBAA).toEqual(baa);
            expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(expect.objectContaining({
                eventType: 'ADMINISTRATIVE',
                action: {
                    type: 'CREATE',
                    status: 'SUCCESS'
                }
            }));
        });
        it('should upload BAA document', async () => {
            // Create test file
            const testFilePath = path.join(tempDir, 'test-document.pdf');
            await fs.writeFile(testFilePath, 'test content');
            const document = {
                type: BAADocumentType.AGREEMENT,
                filename: 'test.pdf',
                path: '/test/path',
                uploadedBy: 'admin',
                metadata: {}
            };
            // Create test BAA
            const baa = await baaManagementService.createBAA('test-ba-id', {
                version: '1.0',
                status: BAAStatus.DRAFT,
                effectiveDate: new Date(),
                expirationDate: new Date(),
                reviewDate: new Date(),
                lastReviewedBy: 'admin',
                documents: [],
                signatures: [],
                amendments: [],
                dataHandlingRequirements: [],
                securityRequirements: [],
                breachNotificationRequirements: [],
                terminationRequirements: []
            });
            const uploadedDoc = await baaManagementService.uploadBAADocument(baa.id, document);
            expect(uploadedDoc.id).toBeDefined();
            expect(uploadedDoc.hash).toBeDefined();
            expect(uploadedDoc.uploadedAt).toBeInstanceOf(Date);
            // Verify file was copied
            const documentPath = path.join(tempDir, BAADocumentType.AGREEMENT, `${uploadedDoc.id}-${document.filename}`);
            const exists = await fs.stat(documentPath).then(() => true).catch(() => false);
            expect(exists).toBe(true);
            expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(expect.objectContaining({
                eventType: 'ADMINISTRATIVE',
                action: {
                    type: 'CREATE',
                    status: 'SUCCESS'
                }
            }));
        });
        it('should add BAA signature', async () => {
            // Create test BAA
            const baa = await baaManagementService.createBAA('test-ba-id', {
                version: '1.0',
                status: BAAStatus.PENDING_SIGNATURE,
                effectiveDate: new Date(),
                expirationDate: new Date(),
                reviewDate: new Date(),
                lastReviewedBy: 'admin',
                documents: [],
                signatures: [],
                amendments: [],
                dataHandlingRequirements: [],
                securityRequirements: [],
                breachNotificationRequirements: [],
                terminationRequirements: []
            });
            const signature = {
                signerId: 'user1',
                signerRole: 'Manager',
                signatureDate: new Date(),
                signatureType: SignatureType.ELECTRONIC,
                signatureData: 'test-signature',
                ipAddress: '127.0.0.1',
                metadata: {}
            };
            const addedSignature = await baaManagementService.addBAASignature(baa.id, signature);
            expect(addedSignature.id).toBeDefined();
            expect(addedSignature.signerId).toBe(signature.signerId);
            expect(addedSignature.signatureType).toBe(signature.signatureType);
            // Verify BAA was updated
            const filePath = path.join(tempDir, `baa-${baa.id}.json`);
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const savedBAA = JSON.parse(fileContent);
            expect(savedBAA.signatures).toHaveLength(1);
            expect(savedBAA.signatures[0]).toEqual(addedSignature);
            expect(savedBAA.status).toBe(BAAStatus.ACTIVE);
            expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(expect.objectContaining({
                eventType: 'ADMINISTRATIVE',
                action: {
                    type: 'UPDATE',
                    status: 'SUCCESS'
                }
            }));
        });
        it('should terminate BAA', async () => {
            // Create test BAA
            const baa = await baaManagementService.createBAA('test-ba-id', {
                version: '1.0',
                status: BAAStatus.ACTIVE,
                effectiveDate: new Date(),
                expirationDate: new Date(),
                reviewDate: new Date(),
                lastReviewedBy: 'admin',
                documents: [],
                signatures: [],
                amendments: [],
                dataHandlingRequirements: [],
                securityRequirements: [],
                breachNotificationRequirements: [],
                terminationRequirements: []
            });
            // Create test termination notice
            const testFilePath = path.join(tempDir, 'termination-notice.pdf');
            await fs.writeFile(testFilePath, 'termination notice');
            const terminationNotice = {
                type: BAADocumentType.TERMINATION_NOTICE,
                filename: 'termination-notice.pdf',
                path: testFilePath,
                uploadedBy: 'admin',
                metadata: {}
            };
            const effectiveDate = new Date();
            await baaManagementService.terminateBAA(baa.id, terminationNotice, effectiveDate);
            // Verify BAA was updated
            const filePath = path.join(tempDir, `baa-${baa.id}.json`);
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const savedBAA = JSON.parse(fileContent);
            expect(savedBAA.status).toBe(BAAStatus.TERMINATED);
            expect(savedBAA.expirationDate).toEqual(effectiveDate.toISOString());
            expect(savedBAA.documents).toHaveLength(1);
            expect(savedBAA.documents[0].type).toBe(BAADocumentType.TERMINATION_NOTICE);
            expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(expect.objectContaining({
                eventType: 'ADMINISTRATIVE',
                action: {
                    type: 'UPDATE',
                    status: 'SUCCESS'
                }
            }));
        });
        it('should verify security requirements', async () => {
            // Create test BAA with security requirements
            const baa = await baaManagementService.createBAA('test-ba-id', {
                version: '1.0',
                status: BAAStatus.ACTIVE,
                effectiveDate: new Date(),
                expirationDate: new Date(),
                reviewDate: new Date(),
                lastReviewedBy: 'admin',
                documents: [],
                signatures: [],
                amendments: [],
                dataHandlingRequirements: [],
                securityRequirements: [
                    {
                        id: 'req1',
                        category: SecurityCategory.ENCRYPTION,
                        description: 'Data encryption',
                        minimumStandard: 'AES-256',
                        verificationMethod: 'Technical Review',
                        verificationFrequency: 90
                    }
                ],
                breachNotificationRequirements: [],
                terminationRequirements: []
            });
            const verifications = [
                {
                    requirementId: 'req1',
                    verified: true,
                    verificationDate: new Date(),
                    verificationNotes: 'Encryption verified'
                }
            ];
            await baaManagementService.verifySecurityRequirements(baa.id, verifications);
            // Verify BAA was updated
            const filePath = path.join(tempDir, `baa-${baa.id}.json`);
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const savedBAA = JSON.parse(fileContent);
            expect(savedBAA.securityRequirements[0].lastVerified).toBeDefined();
            expect(savedBAA.securityRequirements[0].nextVerificationDue).toBeDefined();
            expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(expect.objectContaining({
                eventType: 'ADMINISTRATIVE',
                action: {
                    type: 'UPDATE',
                    status: 'SUCCESS'
                }
            }));
        });
        it('should handle failed security verifications', async () => {
            // Create test BAA with security requirements
            const baa = await baaManagementService.createBAA('test-ba-id', {
                version: '1.0',
                status: BAAStatus.ACTIVE,
                effectiveDate: new Date(),
                expirationDate: new Date(),
                reviewDate: new Date(),
                lastReviewedBy: 'admin',
                documents: [],
                signatures: [],
                amendments: [],
                dataHandlingRequirements: [],
                securityRequirements: [
                    {
                        id: 'req1',
                        category: SecurityCategory.ENCRYPTION,
                        description: 'Data encryption',
                        minimumStandard: 'AES-256',
                        verificationMethod: 'Technical Review',
                        verificationFrequency: 90
                    }
                ],
                breachNotificationRequirements: [],
                terminationRequirements: []
            });
            const verifications = [
                {
                    requirementId: 'req1',
                    verified: false,
                    verificationDate: new Date(),
                    verificationNotes: 'Encryption not implemented'
                }
            ];
            await baaManagementService.verifySecurityRequirements(baa.id, verifications);
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('BAA_SECURITY_VERIFICATION_FAILED', 'HIGH', expect.objectContaining({
                baaId: baa.id,
                requirementId: 'req1'
            }));
        });
    });
});
