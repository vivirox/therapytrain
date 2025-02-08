import { SecurityAuditService } from "./SecurityAuditService";
import { HIPAACompliantAuditService } from "./HIPAACompliantAuditService";
import { DataRetentionService, DataType } from "./DataRetentionService";
import * as fs from 'fs/promises';
import * as path from 'path';
import crypto from 'crypto';
type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
interface ComplianceReport {
    id: string;
    timestamp: Date;
    period: {
        start: Date;
        end: Date;
    };
    summary: {
        totalEvents: number;
        totalViolations: number;
        complianceScore: number;
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    };
    auditTrails: {
        totalAudits: number;
        missingAudits: number;
        incompleteAudits: number;
        auditViolations: Array<ComplianceViolation>;
    };
    dataRetention: {
        totalRecords: number;
        pendingArchival: number;
        pendingDeletion: number;
        retentionViolations: Array<ComplianceViolation>;
    };
    accessControl: {
        totalAccesses: number;
        unauthorizedAccesses: number;
        emergencyAccesses: number;
        accessViolations: Array<ComplianceViolation>;
    };
    encryption: {
        totalEncryptedRecords: number;
        unencryptedRecords: number;
        encryptionViolations: Array<ComplianceViolation>;
    };
    recommendations: Array<string>;
}
interface ComplianceViolation {
    id: string;
    timestamp: Date;
    type: ViolationType;
    severity: Severity;
    description: string;
    details: Record<string, any>;
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
    remediation?: {
        plan: string;
        assignedTo?: string;
        dueDate?: Date;
        completedDate?: Date;
    };
}
enum ViolationType {
    MISSING_AUDIT = 'MISSING_AUDIT',
    INCOMPLETE_AUDIT = 'INCOMPLETE_AUDIT',
    RETENTION_VIOLATION = 'RETENTION_VIOLATION',
    UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
    EMERGENCY_ACCESS = 'EMERGENCY_ACCESS',
    UNENCRYPTED_DATA = 'UNENCRYPTED_DATA',
    MISSING_BAA = 'MISSING_BAA',
    EXPIRED_BAA = 'EXPIRED_BAA',
    KEY_ROTATION_OVERDUE = 'KEY_ROTATION_OVERDUE',
    BACKUP_FAILURE = 'BACKUP_FAILURE'
}
interface AssessmentCriteria {
    auditTrails: {
        maxMissingAudits: number;
        maxIncompleteAudits: number;
        requiredFields: Array<string>;
    };
    dataRetention: {
        maxPendingArchival: number;
        maxPendingDeletion: number;
        retentionPeriods: Record<DataType, number>;
    };
    accessControl: {
        maxUnauthorizedAccesses: number;
        maxEmergencyAccesses: number;
        requiredApprovals: Array<string>;
    };
    encryption: {
        maxUnencryptedRecords: number;
        keyRotationPeriod: number;
        requiredEncryptionTypes: Array<string>;
    };
}
export class HIPAAComplianceReportService {
    private readonly reportsPath: string;
    private readonly assessmentCriteria: AssessmentCriteria = {
        auditTrails: {
            maxMissingAudits: 0,
            maxIncompleteAudits: 5,
            requiredFields: [
                'actor.id',
                'actor.role',
                'action.type',
                'resource.type',
                'timestamp'
            ]
        },
        dataRetention: {
            maxPendingArchival: 100,
            maxPendingDeletion: 50,
            retentionPeriods: {
                [DataType.PATIENT_RECORD]: 365 * 6,
                [DataType.THERAPY_NOTE]: 365 * 7,
                [DataType.PRESCRIPTION]: 365 * 10,
                [DataType.LAB_RESULT]: 365 * 7,
                [DataType.BILLING_RECORD]: 365 * 7,
                [DataType.AUDIT_LOG]: 365 * 6,
                [DataType.SYSTEM_BACKUP]: 365 * 2,
                [DataType.COMMUNICATION]: 365 * 3
            }
        },
        accessControl: {
            maxUnauthorizedAccesses: 0,
            maxEmergencyAccesses: 10,
            requiredApprovals: ['SUPERVISOR', 'PRIVACY_OFFICER']
        },
        encryption: {
            maxUnencryptedRecords: 0,
            keyRotationPeriod: 90, // days
            requiredEncryptionTypes: ['AES-256-GCM', 'RSA-4096']
        }
    };
    constructor(private readonly securityAuditService: SecurityAuditService, private readonly hipaaAuditService: HIPAACompliantAuditService, private readonly dataRetentionService: DataRetentionService, reportsPath?: string) {
        this.reportsPath = reportsPath || path.join(__dirname, '../reports/compliance');
    }
    async initialize(): Promise<void> {
        try {
            await fs.mkdir(this.reportsPath, { recursive: true });
        }
        catch (error) {
            await this.securityAuditService.recordAlert('COMPLIANCE_REPORT_INIT_ERROR', 'HIGH', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async generateComplianceReport(startDate: Date, endDate: Date): Promise<ComplianceReport> {
        try {
            // Get audit events for the period
            const auditEvents = await this.hipaaAuditService.queryEvents(startDate, endDate);
            // Get retention status for all data types
            const retentionStatus = await Promise.all(Object.values(DataType).map((dataType: any) => this.dataRetentionService.getRetentionStatus(dataType)));
            // Analyze audit trails
            const auditTrails = await this.analyzeAuditTrails(auditEvents);
            // Analyze data retention
            const dataRetention = this.analyzeDataRetention(retentionStatus);
            // Analyze access control
            const accessControl = this.analyzeAccessControl(auditEvents);
            // Analyze encryption
            const encryption = await this.analyzeEncryption();
            // Calculate overall compliance score and risk level
            const { complianceScore, riskLevel } = this.calculateCompliance({
                auditTrails,
                dataRetention,
                accessControl,
                encryption
            });
            // Generate recommendations
            const recommendations = this.generateRecommendations({
                auditTrails,
                dataRetention,
                accessControl,
                encryption
            });
            const report: ComplianceReport = {
                id: crypto.randomBytes(16).toString('hex'),
                timestamp: new Date(),
                period: { start: startDate, end: endDate },
                summary: {
                    totalEvents: auditEvents.length,
                    totalViolations: [
                        ...auditTrails.auditViolations,
                        ...dataRetention.retentionViolations,
                        ...accessControl.accessViolations,
                        ...encryption.encryptionViolations
                    ].length,
                    complianceScore,
                    riskLevel
                },
                auditTrails,
                dataRetention,
                accessControl,
                encryption,
                recommendations
            };
            // Save report
            await this.saveReport(report);
            // Log high-risk violations
            await this.logHighRiskViolations(report);
            return report;
        }
        catch (error) {
            await this.securityAuditService.recordAlert('COMPLIANCE_REPORT_ERROR', 'HIGH', {
                error: error instanceof Error ? error.message : 'Unknown error',
                period: `${startDate.toISOString()} - ${endDate.toISOString()}`
            });
            throw error;
        }
    }
    private async analyzeAuditTrails(auditEvents: Array<any>): Promise<ComplianceReport['auditTrails']> {
        const missingAudits = this.detectMissingAudits(auditEvents);
        const incompleteAudits = this.detectIncompleteAudits(auditEvents);
        const violations: Array<ComplianceViolation> = [
            ...missingAudits.map((details: any) => ({
                id: crypto.randomBytes(16).toString('hex'),
                timestamp: new Date(),
                type: ViolationType.MISSING_AUDIT,
                severity: 'HIGH' as Severity,
                description: 'Missing required audit trail',
                details,
                status: 'OPEN' as const
            })),
            ...incompleteAudits.map((details: any) => ({
                id: crypto.randomBytes(16).toString('hex'),
                timestamp: new Date(),
                type: ViolationType.INCOMPLETE_AUDIT,
                severity: 'MEDIUM' as Severity,
                description: 'Incomplete audit trail',
                details,
                status: 'OPEN' as const
            }))
        ];
        return {
            totalAudits: auditEvents.length,
            missingAudits: missingAudits.length,
            incompleteAudits: incompleteAudits.length,
            auditViolations: violations
        };
    }
    private analyzeDataRetention(retentionStatus: Array<Awaited<ReturnType<DataRetentionService['getRetentionStatus']>>>): ComplianceReport['dataRetention'] {
        const violations: Array<ComplianceViolation> = [];
        let totalRecords = 0;
        let pendingArchival = 0;
        let pendingDeletion = 0;
        retentionStatus.forEach((status: any, index: any) => {
            const dataType = Object.values(DataType)[index];
            totalRecords += status.total;
            pendingArchival += status.pendingArchival;
            pendingDeletion += status.pendingDeletion;
            if (status.pendingArchival > this.assessmentCriteria.dataRetention.maxPendingArchival) {
                violations.push({
                    id: crypto.randomBytes(16).toString('hex'),
                    timestamp: new Date(),
                    type: ViolationType.RETENTION_VIOLATION,
                    severity: 'MEDIUM' as Severity,
                    description: 'Excessive records pending archival',
                    details: {
                        dataType,
                        pendingArchival: status.pendingArchival,
                        threshold: this.assessmentCriteria.dataRetention.maxPendingArchival
                    },
                    status: 'OPEN' as const
                });
            }
            if (status.pendingDeletion > this.assessmentCriteria.dataRetention.maxPendingDeletion) {
                violations.push({
                    id: crypto.randomBytes(16).toString('hex'),
                    timestamp: new Date(),
                    type: ViolationType.RETENTION_VIOLATION,
                    severity: 'HIGH' as Severity,
                    description: 'Excessive records pending deletion',
                    details: {
                        dataType,
                        pendingDeletion: status.pendingDeletion,
                        threshold: this.assessmentCriteria.dataRetention.maxPendingDeletion
                    },
                    status: 'OPEN' as const
                });
            }
        });
        return {
            totalRecords,
            pendingArchival,
            pendingDeletion,
            retentionViolations: violations
        };
    }
    private analyzeAccessControl(auditEvents: Array<any>): ComplianceReport['accessControl'] {
        const unauthorizedAccesses = this.detectUnauthorizedAccesses(auditEvents);
        const emergencyAccesses = this.detectEmergencyAccesses(auditEvents);
        const violations: Array<ComplianceViolation> = [
            ...unauthorizedAccesses.map((details: any) => ({
                id: crypto.randomBytes(16).toString('hex'),
                timestamp: new Date(),
                type: ViolationType.UNAUTHORIZED_ACCESS,
                severity: 'HIGH' as Severity,
                description: 'Unauthorized access detected',
                details,
                status: 'OPEN' as const
            })),
            ...emergencyAccesses.map((details: any) => ({
                id: crypto.randomBytes(16).toString('hex'),
                timestamp: new Date(),
                type: ViolationType.EMERGENCY_ACCESS,
                severity: 'MEDIUM' as Severity,
                description: 'Emergency access detected',
                details,
                status: 'OPEN' as const
            }))
        ];
        return {
            totalAccesses: auditEvents.filter((e: any) => e?.action?.type === 'READ').length,
            unauthorizedAccesses: unauthorizedAccesses.length,
            emergencyAccesses: emergencyAccesses.length,
            accessViolations: violations
        };
    }
    private async analyzeEncryption(): Promise<ComplianceReport['encryption']> {
        // In a real implementation, this would check actual encryption status
        // For now, return placeholder data
        return {
            totalEncryptedRecords: 1000,
            unencryptedRecords: 0,
            encryptionViolations: []
        };
    }
    private calculateCompliance(report: {
        auditTrails: ComplianceReport['auditTrails'];
        dataRetention: ComplianceReport['dataRetention'];
        accessControl: ComplianceReport['accessControl'];
        encryption: ComplianceReport['encryption'];
    }): {
        complianceScore: number;
        riskLevel: ComplianceReport['summary']['riskLevel'];
    } {
        // Calculate weighted compliance score
        const weights = {
            auditTrails: 0.25,
            dataRetention: 0.25,
            accessControl: 0.3,
            encryption: 0.2
        };
        const scores = {
            auditTrails: this.calculateAuditScore(report.auditTrails),
            dataRetention: this.calculateRetentionScore(report.dataRetention),
            accessControl: this.calculateAccessScore(report.accessControl),
            encryption: this.calculateEncryptionScore(report.encryption)
        };
        const complianceScore = scores.auditTrails * weights.auditTrails +
            scores.dataRetention * weights.dataRetention +
            scores.accessControl * weights.accessControl +
            scores.encryption * weights.encryption;
        // Determine risk level
        let riskLevel: ComplianceReport['summary']['riskLevel'];
        if (complianceScore >= 95)
            riskLevel = 'LOW';
        else if (complianceScore >= 85)
            riskLevel = 'MEDIUM';
        else if (complianceScore >= 75)
            riskLevel = 'HIGH';
        else
            riskLevel = 'CRITICAL';
        return { complianceScore, riskLevel };
    }
    private generateRecommendations(report: {
        auditTrails: ComplianceReport['auditTrails'];
        dataRetention: ComplianceReport['dataRetention'];
        accessControl: ComplianceReport['accessControl'];
        encryption: ComplianceReport['encryption'];
    }): Array<string> {
        const recommendations: Array<string> = [];
        // Audit recommendations
        if (report.auditTrails.missingAudits > 0) {
            recommendations.push('Implement comprehensive audit logging for all missing audit points');
        }
        if (report.auditTrails.incompleteAudits > 0) {
            recommendations.push('Review and complete all incomplete audit trails with required fields');
        }
        // Retention recommendations
        if (report.dataRetention.pendingArchival > 0) {
            recommendations.push('Process pending archival records to maintain compliance with retention policies');
        }
        if (report.dataRetention.pendingDeletion > 0) {
            recommendations.push('Review and process records pending deletion according to retention policies');
        }
        // Access control recommendations
        if (report.accessControl.unauthorizedAccesses > 0) {
            recommendations.push('Investigate and address all unauthorized access attempts');
        }
        if (report.accessControl.emergencyAccesses > this.assessmentCriteria.accessControl.maxEmergencyAccesses) {
            recommendations.push('Review emergency access procedures and implement additional controls');
        }
        // Encryption recommendations
        if (report.encryption.unencryptedRecords > 0) {
            recommendations.push('Encrypt all unencrypted records and implement encryption verification');
        }
        return recommendations;
    }
    private async saveReport(report: ComplianceReport): Promise<void> {
        const filename = `compliance-report-${report.id}.json`;
        const filePath = path.join(this.reportsPath, filename);
        await fs.writeFile(filePath, JSON.stringify(report, null, 2));
    }
    private async logHighRiskViolations(report: ComplianceReport): Promise<void> {
        const highRiskViolations = [
            ...report.auditTrails.auditViolations,
            ...report.dataRetention.retentionViolations,
            ...report.accessControl.accessViolations,
            ...report.encryption.encryptionViolations
        ].filter((v: any) => v.severity === 'HIGH' || v.severity === 'CRITICAL');
        for (const violation of highRiskViolations) {
            await this.securityAuditService.recordAlert('COMPLIANCE_VIOLATION', 'HIGH', {
                violationType: violation.type,
                description: violation.description,
                details: violation.details
            });
        }
    }
    private detectMissingAudits(auditEvents: Array<any>): Array<any> {
        // In a real implementation, this would detect gaps in audit trails
        return [];
    }
    private detectIncompleteAudits(auditEvents: Array<any>): Array<any> {
        return auditEvents.filter((event: any) => {
            if (!event)
                return false;
            return !this.assessmentCriteria.auditTrails.requiredFields.every(field => {
                const parts = field.split('.');
                let value: any = event;
                for (const part of parts) {
                    value = value?.[part];
                    if (value === undefined)
                        return false;
                }
                return true;
            });
        });
    }
    private detectUnauthorizedAccesses(auditEvents: Array<any>): Array<any> {
        return auditEvents.filter((event: any) => {
            if (!event?.action)
                return false;
            return event.action.type === 'READ' &&
                event.action.status === 'FAILURE' &&
                event.action.details?.reason === 'UNAUTHORIZED';
        });
    }
    private detectEmergencyAccesses(auditEvents: Array<any>): Array<any> {
        return auditEvents.filter((event: any) => {
            if (!event?.action)
                return false;
            return event.action.type === 'EMERGENCY_ACCESS';
        });
    }
    private calculateAuditScore(auditTrails: ComplianceReport['auditTrails']): number {
        const maxScore = 100;
        const deductions = {
            missingAudit: 10,
            incompleteAudit: 5
        };
        let score = maxScore;
        score -= auditTrails.missingAudits * deductions.missingAudit;
        score -= auditTrails.incompleteAudits * deductions.incompleteAudit;
        return Math.max(0, score);
    }
    private calculateRetentionScore(dataRetention: ComplianceReport['dataRetention']): number {
        const maxScore = 100;
        const deductions = {
            pendingArchival: 0.1,
            pendingDeletion: 0.2
        };
        let score = maxScore;
        score -= dataRetention.pendingArchival * deductions.pendingArchival;
        score -= dataRetention.pendingDeletion * deductions.pendingDeletion;
        return Math.max(0, score);
    }
    private calculateAccessScore(accessControl: ComplianceReport['accessControl']): number {
        const maxScore = 100;
        const deductions = {
            unauthorizedAccess: 20,
            emergencyAccess: 5
        };
        let score = maxScore;
        score -= accessControl.unauthorizedAccesses * deductions.unauthorizedAccess;
        score -= Math.max(0, accessControl.emergencyAccesses - this.assessmentCriteria.accessControl.maxEmergencyAccesses) * deductions.emergencyAccess;
        return Math.max(0, score);
    }
    private calculateEncryptionScore(encryption: ComplianceReport['encryption']): number {
        const maxScore = 100;
        const deductions = {
            unencryptedRecord: 10
        };
        let score = maxScore;
        score -= encryption.unencryptedRecords * deductions.unencryptedRecord;
        return Math.max(0, score);
    }
}
