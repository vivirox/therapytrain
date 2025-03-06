import { SecurityAuditService } from "./SecurityAuditService";
import { HIPAACompliantAuditService } from "./HIPAACompliantAuditService";
import * as fs from "fs/promises";
import * as path from "path";
import crypto from "crypto";
interface RetentionRule {
  dataType: DataType;
  retentionPeriod: number; // in days
  archiveAfter: number; // in days
  deleteAfter: number; // in days
  requiresEncryption: boolean;
  requiresAudit: boolean;
}
export enum DataType {
  PATIENT_RECORD = "PATIENT_RECORD",
  THERAPY_NOTE = "THERAPY_NOTE",
  PRESCRIPTION = "PRESCRIPTION",
  LAB_RESULT = "LAB_RESULT",
  BILLING_RECORD = "BILLING_RECORD",
  AUDIT_LOG = "AUDIT_LOG",
  SYSTEM_BACKUP = "SYSTEM_BACKUP",
  COMMUNICATION = "COMMUNICATION",
}
interface DataLifecycleEvent {
  id: string;
  timestamp: Date;
  dataType: DataType;
  action: "ARCHIVE" | "DELETE" | "ENCRYPT" | "DECRYPT";
  status: "SUCCESS" | "FAILURE";
  details: {
    recordId: string;
    path: string;
    reason: string;
    [key: string]: any;
  };
}
export class DataRetentionService {
  private readonly dataPath: string;
  private readonly archivePath: string;
  private readonly retentionRules: RetentionRule[] = [
    {
      dataType: DataType.PATIENT_RECORD,
      retentionPeriod: 365 * 6, // 6 years
      archiveAfter: 365, // 1 year
      deleteAfter: 365 * 6, // 6 years
      requiresEncryption: true,
      requiresAudit: true,
    },
    {
      dataType: DataType.THERAPY_NOTE,
      retentionPeriod: 365 * 7, // 7 years
      archiveAfter: 365, // 1 year
      deleteAfter: 365 * 7, // 7 years
      requiresEncryption: true,
      requiresAudit: true,
    },
    {
      dataType: DataType.PRESCRIPTION,
      retentionPeriod: 365 * 10, // 10 years
      archiveAfter: 365 * 2, // 2 years
      deleteAfter: 365 * 10, // 10 years
      requiresEncryption: true,
      requiresAudit: true,
    },
    {
      dataType: DataType.LAB_RESULT,
      retentionPeriod: 365 * 7, // 7 years
      archiveAfter: 365, // 1 year
      deleteAfter: 365 * 7, // 7 years
      requiresEncryption: true,
      requiresAudit: true,
    },
    {
      dataType: DataType.BILLING_RECORD,
      retentionPeriod: 365 * 7, // 7 years
      archiveAfter: 365 * 2, // 2 years
      deleteAfter: 365 * 7, // 7 years
      requiresEncryption: true,
      requiresAudit: true,
    },
    {
      dataType: DataType.AUDIT_LOG,
      retentionPeriod: 365 * 6, // 6 years
      archiveAfter: 365, // 1 year
      deleteAfter: 365 * 6, // 6 years
      requiresEncryption: true,
      requiresAudit: true,
    },
    {
      dataType: DataType.SYSTEM_BACKUP,
      retentionPeriod: 365 * 2, // 2 years
      archiveAfter: 90, // 90 days
      deleteAfter: 365 * 2, // 2 years
      requiresEncryption: true,
      requiresAudit: true,
    },
    {
      dataType: DataType.COMMUNICATION,
      retentionPeriod: 365 * 3, // 3 years
      archiveAfter: 180, // 6 months
      deleteAfter: 365 * 3, // 3 years
      requiresEncryption: true,
      requiresAudit: true,
    },
  ];
  constructor(
    private readonly securityAuditService: SecurityAuditService,
    private readonly hipaaAuditService: HIPAACompliantAuditService,
    dataPath?: string,
  ) {
    this.dataPath = dataPath || path.join(__dirname, "../data");
    this.archivePath = path.join(this.dataPath, "archive");
  }
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.dataPath, { recursive: true });
      await fs.mkdir(this.archivePath, { recursive: true });
      // Create type-specific directories
      for (const rule of this.retentionRules) {
        await fs.mkdir(path.join(this.dataPath, rule.dataType), {
          recursive: true,
        });
        await fs.mkdir(path.join(this.archivePath, rule.dataType), {
          recursive: true,
        });
      }
    } catch (error) {
      await this.securityAuditService.recordAlert(
        "DATA_RETENTION_INIT_ERROR",
        "HIGH",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      );
      throw error;
    }
  }
  async processRetentionPolicies(): Promise<void> {
    try {
      for (const rule of this.retentionRules) {
        await this.processDataType(rule);
      }
    } catch (error) {
      await this.securityAuditService.recordAlert(
        "DATA_RETENTION_PROCESS_ERROR",
        "HIGH",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      );
      throw error;
    }
  }
  private async processDataType(rule: RetentionRule): Promise<void> {
    const dataTypePath = path.join(this.dataPath, rule.dataType);
    const files = await fs.readdir(dataTypePath);
    for (const file of files) {
      const filePath = path.join(dataTypePath, file);
      const stats = await fs.stat(filePath);
      const ageInDays =
        (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays >= rule.deleteAfter) {
        await this.deleteData(rule.dataType, file, filePath);
      } else if (ageInDays >= rule.archiveAfter) {
        await this.archiveData(rule.dataType, file, filePath);
      }
    }
  }
  private async archiveData(
    dataType: DataType,
    fileName: string,
    filePath: string,
  ): Promise<void> {
    try {
      // Create archive path with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const archivePath = path.join(
        this.archivePath,
        dataType,
        `${fileName}.${timestamp}.archive`,
      );
      // Encrypt if required
      const rule = this.retentionRules.find((r) => r.dataType === dataType);
      if (rule?.requiresEncryption) {
        await this.encryptFile(filePath, archivePath);
      } else {
        await fs.copyFile(filePath, archivePath);
      }
      // Remove original file
      await fs.unlink(filePath);
      // Log the event
      await this.logLifecycleEvent({
        id: crypto.randomBytes(16).toString("hex"),
        timestamp: new Date(),
        dataType,
        action: "ARCHIVE",
        status: "SUCCESS",
        details: {
          recordId: fileName,
          path: archivePath,
          reason: "Age-based archival",
        },
      });
    } catch (error) {
      await this.logLifecycleEvent({
        id: crypto.randomBytes(16).toString("hex"),
        timestamp: new Date(),
        dataType,
        action: "ARCHIVE",
        status: "FAILURE",
        details: {
          recordId: fileName,
          path: filePath,
          reason: "Age-based archival",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
      throw error;
    }
  }
  private async deleteData(
    dataType: DataType,
    fileName: string,
    filePath: string,
  ): Promise<void> {
    try {
      // Securely delete file
      await this.secureDelete(filePath);
      // Log the event
      await this.logLifecycleEvent({
        id: crypto.randomBytes(16).toString("hex"),
        timestamp: new Date(),
        dataType,
        action: "DELETE",
        status: "SUCCESS",
        details: {
          recordId: fileName,
          path: filePath,
          reason: "Retention period expired",
        },
      });
    } catch (error) {
      await this.logLifecycleEvent({
        id: crypto.randomBytes(16).toString("hex"),
        timestamp: new Date(),
        dataType,
        action: "DELETE",
        status: "FAILURE",
        details: {
          recordId: fileName,
          path: filePath,
          reason: "Retention period expired",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
      throw error;
    }
  }
  private async encryptFile(
    sourcePath: string,
    destinationPath: string,
  ): Promise<void> {
    // In a real implementation, this would use proper encryption
    // For now, we'll just copy the file
    await fs.copyFile(sourcePath, destinationPath);
  }
  private async secureDelete(filePath: string): Promise<void> {
    // In a real implementation, this would use secure deletion techniques
    // For now, we'll just unlink the file
    await fs.unlink(filePath);
  }
  private async logLifecycleEvent(event: DataLifecycleEvent): Promise<void> {
    // Log to HIPAA audit service
    await this.hipaaAuditService.logEvent({
      eventType: "SYSTEM_OPERATION",
      timestamp: event.timestamp,
      action: {
        type: event.action === "DELETE" ? "DELETE" : "UPDATE",
        status: event.status,
        details: event.details,
      },
      resource: {
        type: "PHI",
        id: event.details.recordId,
        description: `${event.dataType} record`,
      },
    });
    // Log to security audit service if it's a failure
    if (event.status === "FAILURE") {
      await this.securityAuditService.recordAlert(
        "DATA_LIFECYCLE_ERROR",
        "HIGH",
        {
          dataType: event.dataType,
          action: event.action,
          details: event.details,
        },
      );
    }
  }
  async getRetentionStatus(dataType: DataType): Promise<{
    total: number;
    active: number;
    archived: number;
    pendingArchival: number;
    pendingDeletion: number;
  }> {
    try {
      const rule = this.retentionRules.find((r) => r.dataType === dataType);
      if (!rule) {
        throw new Error(`No retention rule found for data type: ${dataType}`);
      }
      const activePath = path.join(this.dataPath, dataType);
      const archivePath = path.join(this.archivePath, dataType);
      const [activeFiles, archivedFiles] = await Promise.all([
        fs.readdir(activePath),
        fs.readdir(archivePath),
      ]);
      const now = Date.now();
      const activeStats = await Promise.all(
        activeFiles.map(async (file: any) => {
          const stats = await fs.stat(path.join(activePath, file));
          const ageInDays =
            (now - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
          return {
            pendingArchival: ageInDays >= rule.archiveAfter,
            pendingDeletion: ageInDays >= rule.deleteAfter,
          };
        }),
      );
      return {
        total: activeFiles.length + archivedFiles.length,
        active: activeFiles.length,
        archived: archivedFiles.length,
        pendingArchival: activeStats.filter((s: any) => s.pendingArchival)
          .length,
        pendingDeletion: activeStats.filter((s: any) => s.pendingDeletion)
          .length,
      };
    } catch (error) {
      await this.securityAuditService.recordAlert(
        "DATA_RETENTION_STATUS_ERROR",
        "HIGH",
        {
          dataType,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      );
      throw error;
    }
  }
}
