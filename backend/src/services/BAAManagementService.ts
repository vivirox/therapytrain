import { SecurityAuditService } from './SecurityAuditService';
import { HIPAACompliantAuditService } from './HIPAACompliantAuditService';
import * as fs from 'fs/promises';
import * as path from 'path';
import crypto from 'crypto';

interface BusinessAssociate {
    id: string;
    name: string;
    type: BAType;
    contact: {
        name: string;
        email: string;
        phone: string;
        address: string;
    };
    services: string[];
    dataAccess: DataAccessType[];
    status: BAStatus;
    createdAt: Date;
    updatedAt: Date;
}

interface BAA {
    id: string;
    businessAssociateId: string;
    version: string;
    status: BAAStatus;
    effectiveDate: Date;
    expirationDate: Date;
    reviewDate: Date;
    lastReviewedBy: string;
    documents: BAADocument[];
    signatures: BAASignature[];
    amendments: BAAAmendment[];
    dataHandlingRequirements: DataHandlingRequirement[];
    securityRequirements: SecurityRequirement[];
    breachNotificationRequirements: BreachNotificationRequirement[];
    terminationRequirements: TerminationRequirement[];
    createdAt: Date;
    updatedAt: Date;
}

interface BAADocument {
    id: string;
    type: BAADocumentType;
    filename: string;
    path: string;
    hash: string;
    uploadedBy: string;
    uploadedAt: Date;
    metadata: Record<string, any>;
}

interface BAASignature {
    id: string;
    signerId: string;
    signerRole: string;
    signatureDate: Date;
    signatureType: SignatureType;
    signatureData: string;
    ipAddress: string;
    metadata: Record<string, any>;
}

interface BAAAmendment {
    id: string;
    version: string;
    description: string;
    effectiveDate: Date;
    documents: BAADocument[];
    signatures: BAASignature[];
    createdAt: Date;
}

interface DataHandlingRequirement {
    id: string;
    dataType: string;
    accessLevel: DataAccessType;
    encryptionRequired: boolean;
    retentionPeriod: number;
    disposalMethod: string;
    specialHandlingNotes?: string;
}

interface SecurityRequirement {
    id: string;
    category: SecurityCategory;
    description: string;
    minimumStandard: string;
    verificationMethod: string;
    verificationFrequency: number;
    lastVerified?: Date;
    nextVerificationDue?: Date;
}

interface BreachNotificationRequirement {
    id: string;
    timeframe: number;
    notificationMethod: string[];
    requiredInformation: string[];
    escalationProcedure: string;
}

interface TerminationRequirement {
    id: string;
    condition: string;
    noticePeriod: number;
    dataReturnMethod: string;
    dataDestructionMethod: string;
    verificationRequired: boolean;
}

enum BAType {
    SERVICE_PROVIDER = 'SERVICE_PROVIDER',
    TECHNOLOGY_VENDOR = 'TECHNOLOGY_VENDOR',
    CONSULTANT = 'CONSULTANT',
    CONTRACTOR = 'CONTRACTOR',
    SUBCONTRACTOR = 'SUBCONTRACTOR'
}

enum BAStatus {
    ACTIVE = 'ACTIVE',
    PENDING_REVIEW = 'PENDING_REVIEW',
    UNDER_REVIEW = 'UNDER_REVIEW',
    INACTIVE = 'INACTIVE',
    TERMINATED = 'TERMINATED'
}

enum BAAStatus {
    DRAFT = 'DRAFT',
    PENDING_SIGNATURE = 'PENDING_SIGNATURE',
    ACTIVE = 'ACTIVE',
    EXPIRED = 'EXPIRED',
    TERMINATED = 'TERMINATED'
}

enum BAADocumentType {
    AGREEMENT = 'AGREEMENT',
    AMENDMENT = 'AMENDMENT',
    SECURITY_ASSESSMENT = 'SECURITY_ASSESSMENT',
    COMPLIANCE_CERTIFICATION = 'COMPLIANCE_CERTIFICATION',
    INSURANCE_CERTIFICATE = 'INSURANCE_CERTIFICATE',
    TERMINATION_NOTICE = 'TERMINATION_NOTICE'
}

enum DataAccessType {
    VIEW = 'VIEW',
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    EXPORT = 'EXPORT',
    FULL = 'FULL'
}

enum SecurityCategory {
    ENCRYPTION = 'ENCRYPTION',
    ACCESS_CONTROL = 'ACCESS_CONTROL',
    AUDIT_LOGGING = 'AUDIT_LOGGING',
    INCIDENT_RESPONSE = 'INCIDENT_RESPONSE',
    BACKUP = 'BACKUP',
    NETWORK = 'NETWORK',
    PHYSICAL = 'PHYSICAL'
}

enum SignatureType {
    ELECTRONIC = 'ELECTRONIC',
    DIGITAL = 'DIGITAL',
    WET = 'WET'
}

export class BAAManagementService {
    private readonly documentsPath: string;
    private readonly templatesPath: string;

    constructor(
        private readonly securityAuditService: SecurityAuditService,
        private readonly hipaaAuditService: HIPAACompliantAuditService,
        documentsPath?: string
    ) {
        this.documentsPath = documentsPath || path.join(__dirname, '../data/baa');
        this.templatesPath = path.join(this.documentsPath, 'templates');
    }

    async initialize(): Promise<void> {
        try {
            // Create required directories
            await fs.mkdir(this.documentsPath, { recursive: true });
            await fs.mkdir(this.templatesPath, { recursive: true });

            // Create subdirectories for different document types
            for (const type of Object.values(BAADocumentType)) {
                await fs.mkdir(path.join(this.documentsPath, type), { recursive: true });
            }
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'BAA_INIT_ERROR',
                'HIGH',
                {
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
            );
            throw error;
        }
    }

    async createBusinessAssociate(
        data: Omit<BusinessAssociate, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<BusinessAssociate> {
        try {
            const businessAssociate: BusinessAssociate = {
                ...data,
                id: crypto.randomBytes(16).toString('hex'),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await this.saveBusinessAssociate(businessAssociate);

            await this.hipaaAuditService.logEvent({
                eventType: 'ADMINISTRATIVE',
                actor: {
                    id: 'SYSTEM',
                    role: 'SYSTEM',
                    ipAddress: '127.0.0.1'
                },
                action: {
                    type: 'CREATE',
                    status: 'SUCCESS',
                    details: {
                        businessAssociateId: businessAssociate.id,
                        businessAssociateName: businessAssociate.name
                    }
                },
                resource: {
                    type: 'SYSTEM',
                    id: businessAssociate.id,
                    description: 'Business Associate'
                }
            });

            return businessAssociate;
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'BAA_CREATE_ERROR',
                'HIGH',
                {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    businessAssociateName: data.name
                }
            );
            throw error;
        }
    }

    async createBAA(
        businessAssociateId: string,
        data: Omit<BAA, 'id' | 'businessAssociateId' | 'createdAt' | 'updatedAt'>
    ): Promise<BAA> {
        try {
            const baa: BAA = {
                ...data,
                id: crypto.randomBytes(16).toString('hex'),
                businessAssociateId,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await this.saveBAA(baa);

            await this.hipaaAuditService.logEvent({
                eventType: 'ADMINISTRATIVE',
                actor: {
                    id: 'SYSTEM',
                    role: 'SYSTEM',
                    ipAddress: '127.0.0.1'
                },
                action: {
                    type: 'CREATE',
                    status: 'SUCCESS',
                    details: {
                        baaId: baa.id,
                        businessAssociateId
                    }
                },
                resource: {
                    type: 'SYSTEM',
                    id: baa.id,
                    description: 'Business Associate Agreement'
                }
            });

            return baa;
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'BAA_CREATE_ERROR',
                'HIGH',
                {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    businessAssociateId
                }
            );
            throw error;
        }
    }

    async uploadBAADocument(
        baaId: string,
        document: Omit<BAADocument, 'id' | 'hash' | 'uploadedAt'>
    ): Promise<BAADocument> {
        try {
            const documentId = crypto.randomBytes(16).toString('hex');
            const documentPath = path.join(
                this.documentsPath,
                document.type,
                `${documentId}-${document.filename}`
            );

            // Copy file to documents directory
            await fs.copyFile(document.path, documentPath);

            // Calculate file hash
            const fileContent = await fs.readFile(documentPath);
            const hash = crypto.createHash('sha256').update(fileContent).digest('hex');

            const baaDocument: BAADocument = {
                ...document,
                id: documentId,
                path: documentPath,
                hash,
                uploadedAt: new Date()
            };

            // Update BAA with new document
            const baa = await this.getBAA(baaId);
            baa.documents.push(baaDocument);
            baa.updatedAt = new Date();
            await this.saveBAA(baa);

            await this.hipaaAuditService.logEvent({
                eventType: 'ADMINISTRATIVE',
                actor: {
                    id: document.uploadedBy,
                    role: 'USER',
                    ipAddress: '127.0.0.1'
                },
                action: {
                    type: 'CREATE',
                    status: 'SUCCESS',
                    details: {
                        baaId,
                        documentId,
                        documentType: document.type,
                        filename: document.filename
                    }
                },
                resource: {
                    type: 'SYSTEM',
                    id: documentId,
                    description: 'BAA Document'
                }
            });

            return baaDocument;
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'BAA_DOCUMENT_UPLOAD_ERROR',
                'HIGH',
                {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    baaId,
                    filename: document.filename
                }
            );
            throw error;
        }
    }

    async addBAASignature(
        baaId: string,
        signature: Omit<BAASignature, 'id'>
    ): Promise<BAASignature> {
        try {
            const signatureId = crypto.randomBytes(16).toString('hex');
            const baaSignature: BAASignature = {
                ...signature,
                id: signatureId
            };

            // Update BAA with new signature
            const baa = await this.getBAA(baaId);
            baa.signatures.push(baaSignature);
            baa.updatedAt = new Date();

            // Check if all required signatures are present
            if (this.hasAllRequiredSignatures(baa)) {
                baa.status = BAAStatus.ACTIVE;
            }

            await this.saveBAA(baa);

            await this.hipaaAuditService.logEvent({
                eventType: 'ADMINISTRATIVE',
                actor: {
                    id: signature.signerId,
                    role: signature.signerRole,
                    ipAddress: signature.ipAddress
                },
                action: {
                    type: 'UPDATE',
                    status: 'SUCCESS',
                    details: {
                        baaId,
                        signatureId,
                        signatureType: signature.signatureType
                    }
                },
                resource: {
                    type: 'SYSTEM',
                    id: signatureId,
                    description: 'BAA Signature'
                }
            });

            return baaSignature;
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'BAA_SIGNATURE_ERROR',
                'HIGH',
                {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    baaId,
                    signerId: signature.signerId
                }
            );
            throw error;
        }
    }

    async addBAAAmendment(
        baaId: string,
        amendment: Omit<BAAAmendment, 'id' | 'createdAt'>
    ): Promise<BAAAmendment> {
        try {
            const amendmentId = crypto.randomBytes(16).toString('hex');
            const baaAmendment: BAAAmendment = {
                ...amendment,
                id: amendmentId,
                createdAt: new Date()
            };

            // Update BAA with new amendment
            const baa = await this.getBAA(baaId);
            baa.amendments.push(baaAmendment);
            baa.updatedAt = new Date();
            await this.saveBAA(baa);

            await this.hipaaAuditService.logEvent({
                eventType: 'ADMINISTRATIVE',
                actor: {
                    id: 'SYSTEM',
                    role: 'SYSTEM',
                    ipAddress: '127.0.0.1'
                },
                action: {
                    type: 'UPDATE',
                    status: 'SUCCESS',
                    details: {
                        baaId,
                        amendmentId,
                        version: amendment.version
                    }
                },
                resource: {
                    type: 'SYSTEM',
                    id: amendmentId,
                    description: 'BAA Amendment'
                }
            });

            return baaAmendment;
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'BAA_AMENDMENT_ERROR',
                'HIGH',
                {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    baaId
                }
            );
            throw error;
        }
    }

    async terminateBAA(
        baaId: string,
        terminationNotice: BAADocument,
        effectiveDate: Date
    ): Promise<void> {
        try {
            const baa = await this.getBAA(baaId);

            // Upload termination notice
            const document = await this.uploadBAADocument(baaId, {
                ...terminationNotice,
                type: BAADocumentType.TERMINATION_NOTICE
            });

            // Update BAA status
            baa.status = BAAStatus.TERMINATED;
            baa.expirationDate = effectiveDate;
            baa.updatedAt = new Date();
            await this.saveBAA(baa);

            await this.hipaaAuditService.logEvent({
                eventType: 'ADMINISTRATIVE',
                actor: {
                    id: terminationNotice.uploadedBy,
                    role: 'USER',
                    ipAddress: '127.0.0.1'
                },
                action: {
                    type: 'UPDATE',
                    status: 'SUCCESS',
                    details: {
                        baaId,
                        status: BAAStatus.TERMINATED,
                        effectiveDate,
                        terminationDocumentId: document.id
                    }
                },
                resource: {
                    type: 'SYSTEM',
                    id: baaId,
                    description: 'Business Associate Agreement'
                }
            });
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'BAA_TERMINATION_ERROR',
                'HIGH',
                {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    baaId
                }
            );
            throw error;
        }
    }

    async verifySecurityRequirements(
        baaId: string,
        verifications: Array<{
            requirementId: string;
            verified: boolean;
            verificationDate: Date;
            verificationNotes?: string;
        }>
    ): Promise<void> {
        try {
            const baa = await this.getBAA(baaId);

            for (const verification of verifications) {
                const requirement = baa.securityRequirements.find(
                    r => r.id === verification.requirementId
                );

                if (!requirement) {
                    throw new Error(`Security requirement ${verification.requirementId} not found`);
                }

                requirement.lastVerified = verification.verificationDate;
                requirement.nextVerificationDue = new Date(
                    verification.verificationDate.getTime() +
                    requirement.verificationFrequency * 24 * 60 * 60 * 1000
                );

                await this.hipaaAuditService.logEvent({
                    eventType: 'ADMINISTRATIVE',
                    actor: {
                        id: 'SYSTEM',
                        role: 'SYSTEM',
                        ipAddress: '127.0.0.1'
                    },
                    action: {
                        type: 'UPDATE',
                        status: verification.verified ? 'SUCCESS' : 'FAILURE',
                        details: {
                            baaId,
                            requirementId: requirement.id,
                            category: requirement.category,
                            verificationDate: verification.verificationDate,
                            nextVerificationDue: requirement.nextVerificationDue,
                            notes: verification.verificationNotes
                        }
                    },
                    resource: {
                        type: 'SYSTEM',
                        id: requirement.id,
                        description: 'Security Requirement Verification'
                    }
                });

                if (!verification.verified) {
                    await this.securityAuditService.recordAlert(
                        'BAA_SECURITY_VERIFICATION_FAILED',
                        'HIGH',
                        {
                            baaId,
                            requirementId: requirement.id,
                            category: requirement.category,
                            notes: verification.verificationNotes
                        }
                    );
                }
            }

            baa.updatedAt = new Date();
            await this.saveBAA(baa);
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'BAA_SECURITY_VERIFICATION_ERROR',
                'HIGH',
                {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    baaId
                }
            );
            throw error;
        }
    }

    private async saveBusinessAssociate(businessAssociate: BusinessAssociate): Promise<void> {
        const filePath = path.join(this.documentsPath, `ba-${businessAssociate.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(businessAssociate, null, 2));
    }

    private async saveBAA(baa: BAA): Promise<void> {
        const filePath = path.join(this.documentsPath, `baa-${baa.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(baa, null, 2));
    }

    private async getBAA(baaId: string): Promise<BAA> {
        const filePath = path.join(this.documentsPath, `baa-${baaId}.json`);
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    }

    private hasAllRequiredSignatures(baa: BAA): boolean {
        // In a real implementation, this would check against a list of required signers
        // For now, just check if we have at least one signature
        return baa.signatures.length > 0;
    }
} 