import { HIPAAComplianceReportService } from "../HIPAAComplianceReportService";
import { SecurityAuditService } from "../SecurityAuditService";
import { HIPAACompliantAuditService } from "../HIPAACompliantAuditService";
import { DataRetentionService } from "../DataRetentionService";
import * as fs from "fs/promises";
import * as path from "path";
import os from "os";
import { HIPAAEventType, HIPAAActionType } from "@/types/hipaa";
import { HIPAAAuditEvent } from "../HIPAACompliantAuditService";
jest.mock("./SecurityAuditService");
jest.mock("./HIPAACompliantAuditService");
jest.mock("./DataRetentionService");
describe("HIPAAComplianceReportService", () => {
  let complianceReportService: HIPAAComplianceReportService;
  let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
  let mockHipaaAuditService: jest.Mocked<HIPAACompliantAuditService>;
  let mockDataRetentionService: jest.Mocked<DataRetentionService>;
  let tempDir: string;
  beforeEach(async () => {
    mockSecurityAuditService = {
      recordAlert: jest.fn().mockResolvedValue(undefined),
    } as any;
    mockHipaaAuditService = {
      queryEvents: jest.fn().mockResolvedValue([]),
    } as any;
    mockDataRetentionService = {
      getRetentionStatus: jest.fn().mockResolvedValue({
        total: 100,
        active: 80,
        archived: 20,
        pendingArchival: 10,
        pendingDeletion: 5,
      }),
    } as any;
    // Create temporary directory for test reports
    tempDir = path.join(
      os.tmpdir(),
      "hipaa-reports-test-" + Math.random().toString(36).slice(2),
    );
    await fs.mkdir(tempDir, { recursive: true });
    complianceReportService = new HIPAAComplianceReportService(
      mockSecurityAuditService,
      mockHipaaAuditService,
      mockDataRetentionService,
      tempDir,
    );
    await complianceReportService.initialize();
  });
  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });
  describe("Report Generation", () => {
    it("should generate compliance report", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-03-31");
      const report = await complianceReportService.generateComplianceReport(
        startDate,
        endDate,
      );
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
    it("should detect audit violations", async () => {
      mockHipaaAuditService.queryEvents.mockResolvedValueOnce([
        {
          // Missing required fields
          action: {
            type: HIPAAActionType.READ,
            status: "SUCCESS",
            details: {},
          },
          id: "",
          timestamp: new Date(),
          eventType: HIPAAEventType.SYSTEM,
          resource: {
            type: "PHI",
            id: "",
            description: "",
          },
          metadata: {
            encryptedAt: new Date(),
            hashValue: "",
            previousEventHash: "",
          },
        } as any,
        {
          // Complete audit
          actor: {
            id: "user1",
            role: "THERAPIST",
            ipAddress: "",
          },
          action: {
            type: HIPAAActionType.READ,
            status: "SUCCESS",
            details: {},
          },
          resource: {
            type: "PHI",
            id: "",
            description: "",
          },
          timestamp: new Date(),
          id: "",
          eventType: HIPAAEventType.SYSTEM,
          metadata: {
            encryptedAt: new Date(),
            hashValue: "",
            previousEventHash: "",
          },
        },
      ]);
      const report = await complianceReportService.generateComplianceReport(
        new Date(),
        new Date(),
      );
      expect(report.auditTrails.incompleteAudits).toBe(1);
      expect(report.auditTrails.auditViolations.length).toBe(1);
      expect(report.auditTrails.auditViolations[0].type).toBe(
        "INCOMPLETE_AUDIT",
      );
    });
    it("should detect retention violations", async () => {
      mockDataRetentionService.getRetentionStatus.mockResolvedValueOnce({
        total: 1000,
        active: 800,
        archived: 200,
        pendingArchival: 150, // Exceeds maxPendingArchival
        pendingDeletion: 75, // Exceeds maxPendingDeletion
      });
      const report = await complianceReportService.generateComplianceReport(
        new Date(),
        new Date(),
      );
      expect(report.dataRetention.retentionViolations.length).toBe(2);
      expect(report.dataRetention.retentionViolations[0].type).toBe(
        "RETENTION_VIOLATION",
      );
      expect(report.dataRetention.retentionViolations[0].severity).toBe(
        "MEDIUM",
      );
      expect(report.dataRetention.retentionViolations[1].severity).toBe("HIGH");
    });
    it("should detect access control violations", async () => {
      mockHipaaAuditService.queryEvents.mockResolvedValueOnce([
        {
          id: "test-event-3",
          eventType: HIPAAEventType.PHI_ACCESS,
          timestamp: new Date(),
          action: {
            type: HIPAAActionType.READ,
            status: "FAILURE",
            details: { reason: "UNAUTHORIZED" },
          },
          resource: {
            type: "PHI",
            id: "record123",
            description: "Patient Record",
          },
          metadata: {
            encryptedAt: new Date(),
            hashValue: "test-hash-3",
            previousEventHash: "test-hash-2",
          },
        },
        {
          action: {
            type: HIPAAActionType.EMERGENCY_ACCESS,
            status: "SUCCESS",
            details: {},
          },
          id: "",
          timestamp: new Date(),
          eventType: HIPAAEventType.SYSTEM,
          resource: {
            type: "USER",
            id: "",
            description: "",
          },
          metadata: {
            encryptedAt: new Date(),
            hashValue: "",
            previousEventHash: "",
          },
        },
      ]);
      const report = await complianceReportService.generateComplianceReport(
        new Date(),
        new Date(),
      );
      expect(report.accessControl.unauthorizedAccesses).toBe(1);
      expect(report.accessControl.emergencyAccesses).toBe(1);
      expect(report.accessControl.accessViolations.length).toBe(2);
    });
    it("should calculate compliance score correctly", async () => {
      mockHipaaAuditService.queryEvents.mockResolvedValueOnce([
        // No violations
        {
          action: {
            type: HIPAAActionType.READ,
            status: "SUCCESS",
            details: {},
          },
          resource: {
            type: "PHI",
            id: "",
            description: "",
          },
          timestamp: new Date(),
          id: "",
          eventType: HIPAAEventType.SYSTEM,
          metadata: {
            encryptedAt: new Date(),
            hashValue: "",
            previousEventHash: "",
          },
        },
      ]);
      mockDataRetentionService.getRetentionStatus.mockResolvedValueOnce({
        total: 100,
        active: 90,
        archived: 10,
        pendingArchival: 5,
        pendingDeletion: 2,
      });
      const report = await complianceReportService.generateComplianceReport(
        new Date(),
        new Date(),
      );
      expect(report.summary.complianceScore).toBeGreaterThanOrEqual(95);
      expect(report.summary.riskLevel).toBe("LOW");
    });
    it("should generate appropriate recommendations", async () => {
      mockHipaaAuditService.queryEvents.mockResolvedValueOnce([
        {
          action: {
            type: HIPAAActionType.READ,
            status: "SUCCESS",
            details: {},
          },
          id: "",
          timestamp: new Date(),
          eventType: HIPAAEventType.SYSTEM,
          resource: {
            type: "PHI",
            id: "",
            description: "",
          },
          metadata: {
            encryptedAt: new Date(),
            hashValue: "",
            previousEventHash: "",
          },
        },
      ]);
      mockDataRetentionService.getRetentionStatus.mockResolvedValueOnce({
        total: 100,
        active: 80,
        archived: 20,
        pendingArchival: 150, // Violation
        pendingDeletion: 0,
      });
      const report = await complianceReportService.generateComplianceReport(
        new Date(),
        new Date(),
      );
      expect(report.recommendations).toContain(
        "Review and complete all incomplete audit trails with required fields",
      );
      expect(report.recommendations).toContain(
        "Process pending archival records to maintain compliance with retention policies",
      );
    });
    it("should handle report generation errors", async () => {
      mockHipaaAuditService.queryEvents.mockRejectedValueOnce(
        new Error("Failed to fetch audit events"),
      );
      await expect(
        complianceReportService.generateComplianceReport(
          new Date(),
          new Date(),
        ),
      ).rejects.toThrow();
      expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
        "COMPLIANCE_REPORT_ERROR",
        "HIGH",
        expect.any(Object),
      );
    });
  });
  describe("High-Risk Violations", () => {
    it("should log high-risk violations", async () => {
      mockHipaaAuditService.queryEvents.mockResolvedValueOnce([
        {
          action: {
            type: HIPAAActionType.READ,
            status: "FAILURE",
            details: { reason: "UNAUTHORIZED" },
          },
          id: "",
          timestamp: new Date(),
          eventType: HIPAAEventType.SYSTEM,
          resource: {
            type: "PHI",
            id: "",
            description: "",
          },
          metadata: {
            encryptedAt: new Date(),
            hashValue: "",
            previousEventHash: "",
          },
        },
      ]);
      await complianceReportService.generateComplianceReport(
        new Date(),
        new Date(),
      );
      expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
        "COMPLIANCE_VIOLATION",
        "HIGH",
        expect.objectContaining({
          violationType: "UNAUTHORIZED_ACCESS",
        }),
      );
    });
  });
  describe("Compliance Scoring", () => {
    it("should assign appropriate risk levels", async () => {
      // Test different compliance scores
      const testCases = [
        { score: 100, level: "LOW" },
        { score: 90, level: "MEDIUM" },
        { score: 80, level: "HIGH" },
        { score: 70, level: "CRITICAL" },
      ];
      for (const { score, level } of testCases) {
        // Mock conditions that would result in the desired score
        mockHipaaAuditService.queryEvents.mockResolvedValueOnce([
          {
            action: {
              type: HIPAAActionType.READ,
              status: "SUCCESS",
              details: {},
            },
            resource: {
              type: "PHI",
              id: "",
              description: "",
            },
            timestamp: new Date(),
            id: "",
            eventType: HIPAAEventType.SYSTEM,
            metadata: {
              encryptedAt: new Date(),
              hashValue: "",
              previousEventHash: "",
            },
          },
        ]);
        mockDataRetentionService.getRetentionStatus.mockResolvedValueOnce({
          total: 100,
          active: score,
          archived: 100 - score,
          pendingArchival: 100 - score,
          pendingDeletion: Math.max(0, 100 - score - 10),
        });
        const report = await complianceReportService.generateComplianceReport(
          new Date(),
          new Date(),
        );
        expect(report.summary.riskLevel).toBe(level);
      }
    });
  });
  describe("generateComplianceReport", () => {
    it("should generate a compliance report for a given time period", async () => {
      const startTime = new Date("2024-01-01");
      const endTime = new Date("2024-01-31");

      // Mock audit events
      const events: HIPAAAuditEvent[] = [
        {
          id: "test-event-1",
          eventType: HIPAAEventType.PHI_ACCESS,
          timestamp: new Date(),
          action: {
            type: HIPAAActionType.READ,
            status: "SUCCESS",
            details: {},
          },
          resource: {
            type: "PHI",
            id: "record1",
            description: "Patient Record",
          },
          metadata: {
            encryptedAt: new Date(),
            hashValue: "test-hash-1",
            previousEventHash: "",
          },
        },
        {
          id: "test-event-2",
          eventType: HIPAAEventType.PHI_ACCESS,
          timestamp: new Date(),
          action: {
            type: HIPAAActionType.READ,
            status: "FAILURE",
            details: { reason: "UNAUTHORIZED" },
          },
          resource: {
            type: "PHI",
            id: "record2",
            description: "Patient Record",
          },
          metadata: {
            encryptedAt: new Date(),
            hashValue: "test-hash-2",
            previousEventHash: "test-hash-1",
          },
        },
        {
          id: "test-event-3",
          eventType: HIPAAEventType.PHI_ACCESS,
          timestamp: new Date(),
          action: {
            type: HIPAAActionType.READ,
            status: "SUCCESS",
            details: {},
          },
          resource: {
            type: "PHI",
            id: "record1",
            description: "Patient Record",
          },
          metadata: {
            encryptedAt: new Date(),
            hashValue: "test-hash-3",
            previousEventHash: "test-hash-2",
          },
        },
      ];

      // Mock the audit service to return these events
      jest
        .spyOn(mockHipaaAuditService, "queryEvents")
        .mockResolvedValue(events);

      const report = await complianceReportService.generateComplianceReport(
        startTime,
        endTime,
      );

      expect(report).toBeDefined();
      expect(report.summary.totalEvents).toBe(3);
      expect(report.summary.phiAccessEvents).toBe(1);
      expect(report.summary.phiModificationEvents).toBe(1);
      expect(report.summary.authenticationEvents).toBe(1);
    });

    it("should handle empty audit logs", async () => {
      const startTime = new Date("2024-01-01");
      const endTime = new Date("2024-01-31");

      jest.spyOn(mockHipaaAuditService, "queryEvents").mockResolvedValue([]);

      const report = await complianceReportService.generateComplianceReport(
        startTime,
        endTime,
      );

      expect(report).toBeDefined();
      expect(report.summary.totalEvents).toBe(0);
      expect(report.summary.phiAccessEvents).toBe(0);
      expect(report.summary.phiModificationEvents).toBe(0);
      expect(report.summary.authenticationEvents).toBe(0);
    });

    it("should handle audit service errors", async () => {
      const startTime = new Date("2024-01-01");
      const endTime = new Date("2024-01-31");

      jest
        .spyOn(mockHipaaAuditService, "queryEvents")
        .mockRejectedValue(new Error("Database error"));

      await expect(
        complianceReportService.generateComplianceReport(startTime, endTime),
      ).rejects.toThrow("Failed to generate compliance report");
    });

    it("should generate a compliance report for a given time period with multiple events", async () => {
      const startTime = new Date("2024-01-01");
      const endTime = new Date("2024-01-31");

      // Mock audit events
      const events: HIPAAAuditEvent[] = [
        {
          id: "test-event-1",
          eventType: HIPAAEventType.PHI_ACCESS,
          timestamp: new Date(),
          action: {
            type: HIPAAActionType.READ,
            status: "SUCCESS",
            details: {},
          },
          resource: {
            type: "PHI",
            id: "record1",
            description: "Patient Record",
          },
          metadata: {
            encryptedAt: new Date(),
            hashValue: "test-hash-1",
            previousEventHash: "",
          },
        },
        {
          id: "test-event-2",
          eventType: HIPAAEventType.PHI_ACCESS,
          timestamp: new Date(),
          action: {
            type: HIPAAActionType.READ,
            status: "FAILURE",
            details: { reason: "UNAUTHORIZED" },
          },
          resource: {
            type: "PHI",
            id: "record2",
            description: "Patient Record",
          },
          metadata: {
            encryptedAt: new Date(),
            hashValue: "test-hash-2",
            previousEventHash: "test-hash-1",
          },
        },
        {
          id: "test-event-3",
          eventType: HIPAAEventType.PHI_ACCESS,
          timestamp: new Date(),
          action: {
            type: HIPAAActionType.READ,
            status: "SUCCESS",
            details: {},
          },
          resource: {
            type: "PHI",
            id: "record1",
            description: "Patient Record",
          },
          metadata: {
            encryptedAt: new Date(),
            hashValue: "test-hash-3",
            previousEventHash: "test-hash-2",
          },
        },
        {
          id: "test-event-4",
          eventType: HIPAAEventType.PHI_ACCESS,
          timestamp: new Date(),
          action: {
            type: HIPAAActionType.READ,
            status: "FAILURE",
            details: { reason: "UNAUTHORIZED" },
          },
          resource: {
            type: "PHI",
            id: "record1",
            description: "Patient Record",
          },
          metadata: {
            encryptedAt: new Date(),
            hashValue: "test-hash-4",
            previousEventHash: "test-hash-3",
          },
        },
        {
          id: "test-event-5",
          eventType: HIPAAEventType.PHI_ACCESS,
          timestamp: new Date(),
          action: {
            type: HIPAAActionType.READ,
            status: "SUCCESS",
            details: { emergency: true },
          },
          resource: {
            type: "PHI",
            id: "record2",
            description: "Patient Record",
          },
          metadata: {
            encryptedAt: new Date(),
            hashValue: "test-hash-5",
            previousEventHash: "test-hash-4",
          },
        },
      ];

      // Mock the audit service to return these events
      jest
        .spyOn(mockHipaaAuditService, "queryEvents")
        .mockResolvedValue(events);

      const report = await complianceReportService.generateComplianceReport(
        startTime,
        endTime,
      );

      expect(report).toBeDefined();
      expect(report.summary.totalEvents).toBe(5);
      expect(report.summary.phiAccessEvents).toBe(2);
      expect(report.summary.phiModificationEvents).toBe(1);
      expect(report.summary.authenticationEvents).toBe(2);
    });
  });
});
