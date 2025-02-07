import { HIPAAComplianceReportService } from "./HIPAAComplianceReportService";
import { SecurityAuditService } from "./SecurityAuditService";
import { HIPAACompliantAuditService } from "./HIPAACompliantAuditService";
import { DataRetentionService, DataType } from "./DataRetentionService";
import * as fs from 'fs/promises';
import * as path from 'path';
import os from 'os';
jest.mock('./SecurityAuditService');
jest.mock('./HIPAACompliantAuditService');
jest.mock('./DataRetentionService');
describe('HIPAAComplianceReportService', () => {
    let complianceReportService: HIPAAComplianceReportService;
    let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
    let mockHipaaAuditService: jest.Mocked<HIPAACompliantAuditService>;
    let mockDataRetentionService: jest.Mocked<DataRetentionService>;
    let tempDir: string;
    beforeEach(async () => {
        mockSecurityAuditService = {
            recordAlert: jest.fn().mockResolvedValue(undefined)
        } as any;
        mockHipaaAuditService = {
            queryEvents: jest.fn().mockResolvedValue([])
        } as any;
        mockDataRetentionService = {
            getRetentionStatus: jest.fn().mockResolvedValue({
                total: 100,
                active: 80,
                archived: 20,
                pendingArchival: 10,
                pendingDeletion: 5
            })
        } as any;
        // Create temporary directory for test reports
        tempDir = path.join(os.tmpdir(), 'hipaa-reports-test-' + Math.random().toString(36).slice(2));
        await fs.mkdir(tempDir, { recursive: true });
        complianceReportService = new HIPAAComplianceReportService(mockSecurityAuditService, mockHipaaAuditService, mockDataRetentionService, tempDir);
        await complianceReportService.initialize();
    });
    afterEach(async () => {
        // Clean up temporary directory
        await fs.rm(tempDir, { recursive: true, force: true });
    });
    describe('Report Generation', () => {
        it('should generate compliance report', async () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-03-31');
            const report = await complianceReportService.generateComplianceReport(startDate, endDate);
            expect(report).toBeDefined();
            expect(report.id).toBeDefined();
            expect(report.timestamp).toBeInstanceOf(Date);
            expect(report.period).toEqual({ startDate, endDate });
            expect(report.summary).toBeDefined();
            expect(report.auditTrails).toBeDefined();
            expect(report.dataRetention).toBeDefined();
            expect(report.accessControl).toBeDefined();
            expect(report.encryption).toBeDefined();
            expect(report.recommendations).toBeInstanceOf(Array);
            // Verify report was saved
            const reportFiles = await fs.readdir(tempDir);
            expect(reportFiles.length).toBe(1);
            expect(reportFiles[0]).toMatch(/^compliance-report-.*\.json$/);
        });
        it('should detect audit violations', async () => {
            mockHipaaAuditService.queryEvents.mockResolvedValueOnce([
                {
                    // Missing required fields
                    action: { type: 'READ' }
                },
                {
                    // Complete audit
                    actor: { id: 'user1', role: 'THERAPIST' },
                    action: { type: 'READ' },
                    resource: { type: 'PHI' },
                    timestamp: new Date()
                }
            ]);
            const report = await complianceReportService.generateComplianceReport(new Date(), new Date());
            expect(report.auditTrails.incompleteAudits).toBe(1);
            expect(report.auditTrails.auditViolations.length).toBe(1);
            expect(report.auditTrails.auditViolations[0].type).toBe('INCOMPLETE_AUDIT');
        });
        it('should detect retention violations', async () => {
            mockDataRetentionService.getRetentionStatus.mockResolvedValueOnce({
                total: 1000,
                active: 800,
                archived: 200,
                pendingArchival: 150, // Exceeds maxPendingArchival
                pendingDeletion: 75 // Exceeds maxPendingDeletion
            });
            const report = await complianceReportService.generateComplianceReport(new Date(), new Date());
            expect(report.dataRetention.retentionViolations.length).toBe(2);
            expect(report.dataRetention.retentionViolations[0].type).toBe('RETENTION_VIOLATION');
            expect(report.dataRetention.retentionViolations[0].severity).toBe('MEDIUM');
            expect(report.dataRetention.retentionViolations[1].severity).toBe('HIGH');
        });
        it('should detect access control violations', async () => {
            mockHipaaAuditService.queryEvents.mockResolvedValueOnce([
                {
                    actor: { id: 'user1' },
                    action: {
                        type: 'READ',
                        status: 'FAILURE',
                        details: { reason: 'UNAUTHORIZED' }
                    }
                },
                {
                    actor: { id: 'user2' },
                    action: { type: 'EMERGENCY_ACCESS' }
                }
            ]);
            const report = await complianceReportService.generateComplianceReport(new Date(), new Date());
            expect(report.accessControl.unauthorizedAccesses).toBe(1);
            expect(report.accessControl.emergencyAccesses).toBe(1);
            expect(report.accessControl.accessViolations.length).toBe(2);
        });
        it('should calculate compliance score correctly', async () => {
            mockHipaaAuditService.queryEvents.mockResolvedValueOnce([
                // No violations
                {
                    actor: { id: 'user1', role: 'THERAPIST' },
                    action: { type: 'READ', status: 'SUCCESS' },
                    resource: { type: 'PHI' },
                    timestamp: new Date()
                }
            ]);
            mockDataRetentionService.getRetentionStatus.mockResolvedValueOnce({
                total: 100,
                active: 90,
                archived: 10,
                pendingArchival: 5,
                pendingDeletion: 2
            });
            const report = await complianceReportService.generateComplianceReport(new Date(), new Date());
            expect(report.summary.complianceScore).toBeGreaterThanOrEqual(95);
            expect(report.summary.riskLevel).toBe('LOW');
        });
        it('should generate appropriate recommendations', async () => {
            mockHipaaAuditService.queryEvents.mockResolvedValueOnce([
                {
                    action: { type: 'READ' } // Incomplete audit
                }
            ]);
            mockDataRetentionService.getRetentionStatus.mockResolvedValueOnce({
                total: 100,
                active: 80,
                archived: 20,
                pendingArchival: 150, // Violation
                pendingDeletion: 0
            });
            const report = await complianceReportService.generateComplianceReport(new Date(), new Date());
            expect(report.recommendations).toContain('Review and complete all incomplete audit trails with required fields');
            expect(report.recommendations).toContain('Process pending archival records to maintain compliance with retention policies');
        });
        it('should handle report generation errors', async () => {
            mockHipaaAuditService.queryEvents.mockRejectedValueOnce(new Error('Failed to fetch audit events'));
            await expect(complianceReportService.generateComplianceReport(new Date(), new Date())).rejects.toThrow();
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('COMPLIANCE_REPORT_ERROR', 'HIGH', expect.any(Object));
        });
    });
    describe('High-Risk Violations', () => {
        it('should log high-risk violations', async () => {
            mockHipaaAuditService.queryEvents.mockResolvedValueOnce([
                {
                    actor: { id: 'user1' },
                    action: {
                        type: 'READ',
                        status: 'FAILURE',
                        details: { reason: 'UNAUTHORIZED' }
                    }
                }
            ]);
            await complianceReportService.generateComplianceReport(new Date(), new Date());
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('COMPLIANCE_VIOLATION', 'HIGH', expect.objectContaining({
                violationType: 'UNAUTHORIZED_ACCESS'
            }));
        });
    });
    describe('Compliance Scoring', () => {
        it('should assign appropriate risk levels', async () => {
            // Test different compliance scores
            const testCases = [
                { score: 100, level: 'LOW' },
                { score: 90, level: 'MEDIUM' },
                { score: 80, level: 'HIGH' },
                { score: 70, level: 'CRITICAL' }
            ];
            for (const { score, level } of testCases) {
                // Mock conditions that would result in the desired score
                mockHipaaAuditService.queryEvents.mockResolvedValueOnce([
                    {
                        actor: { id: 'user1', role: 'THERAPIST' },
                        action: { type: 'READ', status: 'SUCCESS' },
                        resource: { type: 'PHI' },
                        timestamp: new Date()
                    }
                ]);
                mockDataRetentionService.getRetentionStatus.mockResolvedValueOnce({
                    total: 100,
                    active: score,
                    archived: 100 - score,
                    pendingArchival: 100 - score,
                    pendingDeletion: Math.max(0, 100 - score - 10)
                });
                const report = await complianceReportService.generateComplianceReport(new Date(), new Date());
                expect(report.summary.riskLevel).toBe(level);
            }
        });
    });
});
