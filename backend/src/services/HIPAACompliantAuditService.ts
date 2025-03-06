import { SecurityAuditService } from "./SecurityAuditService";
import { VerificationKeyService } from "./VerificationKeyService";
import * as fs from "fs/promises";
import * as path from "path";
import crypto from "crypto";
import { SupabaseClient, User, Session } from "@supabase/supabase-js";
import {
  HIPAAEventType,
  HIPAAActionType,
  HIPAAQueryFilters,
  HIPAAComplianceReport,
  HIPAAAlertConfig,
  HIPAAAction,
  HIPAAActor,
  HIPAAResource,
} from "@/types/hipaa";

export { HIPAAEventType, HIPAAActionType };

export interface HIPAAAuditEvent {
  id: string;
  timestamp: Date;
  eventType: HIPAAEventType;
  action: {
    type: HIPAAActionType;
    status: "SUCCESS" | "FAILURE";
    details: Record<string, any>;
  };
  resource: {
    type: "PHI" | "USER" | "SYSTEM";
    id: string;
    description: string;
  };
  patient?: {
    id: string;
    mrn?: string; // Medical Record Number
  };
  location?: {
    facility: string;
    department?: string;
  };
  reason?: string;
  metadata: {
    encryptedAt: Date;
    hashValue: string;
    previousEventHash: string;
  };
}

interface RetentionPolicy {
  eventType: HIPAAEventType;
  retentionPeriod: number; // in days
  archiveAfter: number; // in days
  deleteAfter: number; // in days
}

export class HIPAACompliantAuditService {
  private readonly auditLogPath: string;
  private readonly archivePath: string;
  private readonly maxLogSize = 100 * 1024 * 1024; // 100MB
  private currentLogFile: string;
  private lastEventHash: string;
  private readonly retentionPolicies: Array<RetentionPolicy> = [
    {
      eventType: HIPAAEventType.PHI_ACCESS,
      retentionPeriod: 365 * 6, // 6 years
      archiveAfter: 365, // 1 year
      deleteAfter: 365 * 6, // 6 years
    },
    {
      eventType: HIPAAEventType.PHI_MODIFICATION,
      retentionPeriod: 365 * 6,
      archiveAfter: 365,
      deleteAfter: 365 * 6,
    },
    {
      eventType: HIPAAEventType.SECURITY,
      retentionPeriod: 365 * 6,
      archiveAfter: 365,
      deleteAfter: 365 * 6,
    },
    {
      eventType: HIPAAEventType.AUTHENTICATION,
      retentionPeriod: 365 * 2,
      archiveAfter: 180,
      deleteAfter: 365 * 2,
    },
    {
      eventType: HIPAAEventType.SYSTEM_OPERATION,
      retentionPeriod: 365 * 2,
      archiveAfter: 180,
      deleteAfter: 365 * 2,
    },
  ];
  constructor(
    private readonly securityAuditService: SecurityAuditService,
    private readonly verificationKeyService: VerificationKeyService,
    auditLogPath?: string,
  ) {
    this.auditLogPath =
      auditLogPath || path.join(__dirname, "../logs/hipaa-audit");
    this.archivePath = path.join(this.auditLogPath, "archive");
    this.currentLogFile = this.generateLogFileName();
    this.lastEventHash = "";
  }
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.auditLogPath, { recursive: true });
      await fs.mkdir(this.archivePath, { recursive: true });
      await this.rotateLogIfNeeded();
      await this.initializeLastEventHash();
    } catch (error) {
      await this.securityAuditService.recordAlert(
        "HIPAA_AUDIT_INIT_ERROR",
        "HIGH",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      );
      throw error;
    }
  }
  async logEvent(
    event: Omit<HIPAAAuditEvent, "id" | "metadata">,
  ): Promise<string> {
    try {
      const eventId = crypto.randomBytes(16).toString("hex");
      const timestamp = new Date();
      // Create event with metadata
      const fullEvent: HIPAAAuditEvent = {
        ...event,
        id: eventId,
        timestamp,
        metadata: {
          encryptedAt: timestamp,
          hashValue: "",
          previousEventHash: this.lastEventHash,
        },
      };
      // Calculate hash before encryption
      fullEvent.metadata.hashValue = this.calculateEventHash(fullEvent);
      // Encrypt and store the event
      await this.rotateLogIfNeeded();
      await this.appendToLog(fullEvent);
      // Update last event hash
      this.lastEventHash = fullEvent.metadata.hashValue;
      // Record high-risk events
      if (this.isHighRiskEvent(fullEvent)) {
        await this.securityAuditService.recordAlert(
          "HIPAA_HIGH_RISK_EVENT",
          "HIGH",
          {
            eventId,
            eventType: fullEvent.eventType,
            actionType: fullEvent.action.type,
          },
        );
      }
      return eventId;
    } catch (error) {
      await this.securityAuditService.recordAlert(
        "HIPAA_AUDIT_LOG_ERROR",
        "HIGH",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          eventType: event.eventType,
        },
      );
      throw error;
    }
  }
  async queryEvents(
    startDate: Date,
    endDate: Date,
    filters: HIPAAQueryFilters,
  ): Promise<Array<HIPAAAuditEvent>> {
    try {
      const events: Array<HIPAAAuditEvent> = [];
      const logFiles = await this.getLogFilesBetweenDates(
        filters.startDate || new Date(0),
        filters.endDate || new Date(),
      );
      for (const logFile of logFiles) {
        const content = await fs.readFile(
          path.join(this.auditLogPath, logFile),
          "utf-8",
        );
        const entries = content
          .trim()
          .split("\n")
          .map((line) => this.decryptEvent(JSON.parse(line)))
          .filter((entry) => {
            const timestamp = new Date(entry.timestamp);
            return (
              (!filters.startDate || timestamp >= filters.startDate) &&
              (!filters.endDate || timestamp <= filters.endDate)
            );
          });
        events.push(...this.filterEvents(entries, filters));
      }
      // Verify event chain integrity
      await this.verifyEventChain(events);
      return events.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
    } catch (error) {
      await this.securityAuditService.recordAlert(
        "HIPAA_AUDIT_QUERY_ERROR",
        "HIGH",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          dateRange: `${filters.startDate?.toISOString() || "beginning"} - ${filters.endDate?.toISOString() || "now"}`,
        },
      );
      throw error;
    }
  }
  async archiveOldEvents(): Promise<void> {
    try {
      const now = new Date();
      const logFiles = await fs.readdir(this.auditLogPath);
      for (const file of logFiles) {
        if (!file.startsWith("hipaa-audit-")) continue;
        const filePath = path.join(this.auditLogPath, file);
        const stats = await fs.stat(filePath);
        const fileDate = new Date(file.split("-")[2].split(".")[0]);
        // Check each retention policy
        for (const policy of this.retentionPolicies) {
          const archiveDate = new Date(
            now.getTime() - policy.archiveAfter * 24 * 60 * 60 * 1000,
          );
          if (fileDate < archiveDate) {
            const archivePath = path.join(this.archivePath, file);
            await fs.rename(filePath, archivePath);
            await this.securityAuditService.recordAlert(
              "HIPAA_AUDIT_ARCHIVED",
              "LOW",
              {
                file,
                eventType: policy.eventType,
                fileDate: fileDate.toISOString(),
              },
            );
          }
        }
      }
    } catch (error) {
      await this.securityAuditService.recordAlert(
        "HIPAA_AUDIT_ARCHIVE_ERROR",
        "HIGH",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      );
      throw error;
    }
  }
  private generateLogFileName(): string {
    const date = new Date().toISOString().split("T")[0];
    return `hipaa-audit-${date}.log`;
  }
  private async rotateLogIfNeeded(): Promise<void> {
    try {
      const currentDate = new Date().toISOString().split("T")[0];
      const expectedLogFile = `hipaa-audit-${currentDate}.log`;
      if (this.currentLogFile !== expectedLogFile) {
        this.currentLogFile = expectedLogFile;
      }
      const logPath = path.join(this.auditLogPath, this.currentLogFile);
      try {
        const stats = await fs.stat(logPath);
        if (stats.size >= this.maxLogSize) {
          const timestamp = new Date().getTime();
          const newLogFile = `hipaa-audit-${currentDate}-${timestamp}.log`;
          await fs.rename(logPath, path.join(this.auditLogPath, newLogFile));
          this.currentLogFile = `hipaa-audit-${currentDate}.log`;
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          // File doesn't exist yet, that's fine
          return;
        }
        throw error;
      }
    } catch (error) {
      await this.securityAuditService.recordAlert(
        "HIPAA_AUDIT_ROTATION_ERROR",
        "HIGH",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      );
      throw error;
    }
  }
  private async appendToLog(event: HIPAAAuditEvent): Promise<void> {
    const encryptedEvent = this.encryptEvent(event);
    const logPath = path.join(this.auditLogPath, this.currentLogFile);
    await fs.appendFile(
      logPath,
      `${JSON.stringify(encryptedEvent)}\n`,
      "utf-8",
    );
  }
  private async getLogFilesBetweenDates(
    startDate: Date,
    endDate: Date,
  ): Promise<Array<string>> {
    const files = await fs.readdir(this.auditLogPath);
    return files.filter((file: any) => {
      const match = file.match(/hipaa-audit-(\d{4}-\d{2}-\d{2})/);
      if (!match) return false;
      const fileDate = new Date(match[1]);
      return fileDate >= startDate && fileDate <= endDate;
    });
  }
  private filterEvents(
    events: Array<HIPAAAuditEvent>,
    filters: HIPAAQueryFilters,
  ): Array<HIPAAAuditEvent> {
    return events.filter((event) => {
      // Filter by event type
      if (filters.eventType && event.eventType !== filters.eventType) {
        return false;
      }

      // Filter by resource type
      if (
        filters.resourceType &&
        event.resource.type !== filters.resourceType
      ) {
        return false;
      }

      // Filter by status
      if (filters.status && event.action.status !== filters.status) {
        return false;
      }

      return true;
    });
  }
  private async initializeLastEventHash(): Promise<void> {
    try {
      const files = await fs.readdir(this.auditLogPath);
      const logFiles = files
        .filter((f: any) => f.startsWith("hipaa-audit-"))
        .sort((a, b) => b.localeCompare(a));
      if (logFiles.length === 0) {
        this.lastEventHash = crypto
          .createHash("sha256")
          .update("initial")
          .digest("hex");
        return;
      }
      const lastFile = logFiles[0];
      const content = await fs.readFile(
        path.join(this.auditLogPath, lastFile),
        "utf-8",
      );
      const lines = content.trim().split("\n");
      if (lines.length > 0) {
        const lastEvent = this.decryptEvent(
          JSON.parse(lines[lines.length - 1]),
        );
        this.lastEventHash = lastEvent.metadata.hashValue;
      }
    } catch (error) {
      await this.securityAuditService.recordAlert(
        "HIPAA_AUDIT_HASH_INIT_ERROR",
        "HIGH",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      );
      throw error;
    }
  }
  private calculateEventHash(event: HIPAAAuditEvent): string {
    const { metadata, ...eventWithoutMetadata } = event;
    const dataToHash = JSON.stringify({
      ...eventWithoutMetadata,
      previousHash: metadata.previousEventHash,
    });
    return crypto.createHash("sha256").update(dataToHash).digest("hex");
  }
  private async verifyEventChain(
    events: Array<HIPAAAuditEvent>,
  ): Promise<void> {
    for (let i = 1; i < events.length; i++) {
      const currentEvent = events[i];
      const previousEvent = events[i - 1];
      if (
        currentEvent.metadata.previousEventHash !==
        previousEvent.metadata.hashValue
      ) {
        await this.securityAuditService.recordAlert(
          "HIPAA_AUDIT_CHAIN_BROKEN",
          "CRITICAL",
          {
            eventId: currentEvent.id,
            previousEventId: previousEvent.id,
          },
        );
        throw new Error("Audit log chain integrity violation detected");
      }
    }
  }
  private encryptEvent(event: HIPAAAuditEvent): string {
    // In a real implementation, this would use proper encryption
    // For now, we'll just return the stringified event
    return JSON.stringify(event);
  }
  private decryptEvent(encryptedEvent: string): HIPAAAuditEvent {
    // In a real implementation, this would decrypt the event
    // For now, we'll just parse the JSON
    return JSON.parse(encryptedEvent);
  }
  private isHighRiskEvent(event: HIPAAAuditEvent): boolean {
    const highRiskEventTypes = [
      HIPAAEventType.PHI_ACCESS,
      HIPAAEventType.PHI_MODIFICATION,
      HIPAAEventType.AUTHENTICATION,
      HIPAAEventType.SECURITY,
    ];
    const highRiskActions = [
      HIPAAActionType.CREATE,
      HIPAAActionType.UPDATE,
      HIPAAActionType.DELETE,
    ];

    // Check if it's a high-risk event type
    if (highRiskEventTypes.includes(event.eventType)) {
      return true;
    }

    // Check if it's a high-risk action
    if (highRiskActions.includes(event.action.type)) {
      return true;
    }

    // Check if it's a failed action
    if (event.action.status === "FAILURE") {
      return true;
    }

    // Check if it's an emergency access
    if (event.action.details?.emergency === true) {
      return true;
    }

    return false;
  }
}

export interface Database {
  public: { Tables: { [key: string]: any } };
}
