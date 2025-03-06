import { SecurityAuditService } from "./SecurityAuditService";
import * as fs from "fs/promises";
import * as path from "path";
import crypto from "crypto";
import { WebSocketServer } from "ws";
import { EventEmitter } from "events";

interface ZKOperation {
  id: string;
  type: "PROOF_GENERATION" | "PROOF_VERIFICATION" | "KEY_ROTATION";
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  status: "SUCCESS" | "FAILURE";
  details: Record<string, any>;
  proofHash?: string;
  keyId?: string;
  duration: number;
}

interface AuditReport {
  startDate: Date;
  endDate: Date;
  totalOperations: number;
  successRate: number;
  averageDuration: number;
  operationsByType: Record<string, number>;
  failureReasons: Record<string, number>;
  keyRotations: number;
}

interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: string;
  details: Record<string, any>;
}

export class ZKAuditService extends EventEmitter {
  private readonly auditLogPath: string;
  private readonly maxLogSize = 100 * 1024 * 1024; // 100MB
  private currentLogFile: string;
  private readonly clients: Set<WebSocketServer> = new Set();

  constructor(
    private readonly supabase: any,
    private readonly securityAuditService: SecurityAuditService,
    auditLogPath?: string,
  ) {
    super();
    this.auditLogPath =
      auditLogPath || path.join(__dirname, "../logs/zk-audit");
    this.currentLogFile = this.generateLogFileName();
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.auditLogPath, { recursive: true });
      await this.rotateLogIfNeeded();
    } catch (error) {
      await this.securityAuditService.recordAlert(
        "ZK_AUDIT_INIT_ERROR",
        "HIGH",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      );
      throw error;
    }
  }

  async logOperation(operation: Omit<ZKOperation, "id">): Promise<string> {
    try {
      const operationId = crypto.randomBytes(16).toString("hex");
      const logEntry: ZKOperation = {
        ...operation,
        id: operationId,
      };
      await this.rotateLogIfNeeded();
      await this.appendToLog(logEntry);
      if (operation.status === "FAILURE") {
        await this.securityAuditService.recordAlert(
          "ZK_OPERATION_FAILURE",
          "HIGH",
          {
            operationType: operation.type,
            details: operation.details,
          },
        );
      }
      return operationId;
    } catch (error) {
      await this.securityAuditService.recordAlert(
        "ZK_AUDIT_LOG_ERROR",
        "HIGH",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          operation: operation.type,
        },
      );
      throw error;
    }
  }

  async getOperationHistory(
    startDate: Date,
    endDate: Date,
    filters?: {
      type?: ZKOperation["type"];
      status?: ZKOperation["status"];
      userId?: string;
      sessionId?: string;
    },
  ): Promise<ZKOperation[]> {
    try {
      const operations: ZKOperation[] = [];
      const logFiles = await this.getLogFilesBetweenDates(startDate, endDate);
      for (const logFile of logFiles) {
        const content = await fs.readFile(
          path.join(this.auditLogPath, logFile),
          "utf-8",
        );
        const entries = content
          .trim()
          .split("\n")
          .map((line: any) => JSON.parse(line) as ZKOperation)
          .filter((entry: any) => {
            const timestamp = new Date(entry.timestamp);
            return timestamp >= startDate && timestamp <= endDate;
          });
        operations.push(...this.filterOperations(entries, filters));
      }
      return operations.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
    } catch (error) {
      await this.securityAuditService.recordAlert(
        "ZK_AUDIT_HISTORY_ERROR",
        "HIGH",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          dateRange: `${startDate.toISOString()} - ${endDate.toISOString()}`,
        },
      );
      throw error;
    }
  }

  async generateReport(startDate: Date, endDate: Date): Promise<AuditReport> {
    try {
      const operations = await this.getOperationHistory(startDate, endDate);
      const successfulOps = operations.filter(
        (op: any) => op.status === "SUCCESS",
      );
      const totalDuration = operations.reduce(
        (sum: any, op: any) => sum + op.duration,
        0,
      );
      const operationsByType = operations.reduce(
        (acc: any, op: any) => {
          acc[op.type] = (acc[op.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );
      const failureReasons = operations
        .filter((op: any) => op.status === "FAILURE")
        .reduce(
          (acc: any, op: any) => {
            const reason = op.details.error || "Unknown";
            acc[reason] = (acc[reason] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );
      const keyRotations = operations.filter(
        (op: any) => op.type === "KEY_ROTATION",
      ).length;
      const report: AuditReport = {
        startDate,
        endDate,
        totalOperations: operations.length,
        successRate:
          operations.length > 0
            ? (successfulOps.length / operations.length) * 100
            : 100,
        averageDuration:
          operations.length > 0 ? totalDuration / operations.length : 0,
        operationsByType,
        failureReasons,
        keyRotations,
      };
      await this.securityAuditService.recordAlert(
        "ZK_AUDIT_REPORT_GENERATED",
        "LOW",
        {
          dateRange: `${startDate.toISOString()} - ${endDate.toISOString()}`,
          totalOperations: report.totalOperations,
          successRate: report.successRate,
        },
      );
      return report;
    } catch (error) {
      await this.securityAuditService.recordAlert(
        "ZK_AUDIT_REPORT_ERROR",
        "HIGH",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          dateRange: `${startDate.toISOString()} - ${endDate.toISOString()}`,
        },
      );
      throw error;
    }
  }

  private generateLogFileName(): string {
    const date = new Date().toISOString().split("T")[0];
    return `zk-audit-${date}.log`;
  }

  private async rotateLogIfNeeded(): Promise<void> {
    try {
      const currentDate = new Date().toISOString().split("T")[0];
      const expectedLogFile = `zk-audit-${currentDate}.log`;
      if (this.currentLogFile !== expectedLogFile) {
        this.currentLogFile = expectedLogFile;
      }
      const logPath = path.join(this.auditLogPath, this.currentLogFile);
      try {
        const stats = await fs.stat(logPath);
        if (stats.size >= this.maxLogSize) {
          const timestamp = new Date().getTime();
          const newLogFile = `zk-audit-${currentDate}-${timestamp}.log`;
          await fs.rename(logPath, path.join(this.auditLogPath, newLogFile));
          this.currentLogFile = `zk-audit-${currentDate}.log`;
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
        "ZK_AUDIT_ROTATION_ERROR",
        "HIGH",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      );
      throw error;
    }
  }

  private async appendToLog(entry: ZKOperation): Promise<void> {
    const logPath = path.join(this.auditLogPath, this.currentLogFile);
    await fs.appendFile(logPath, JSON.stringify(entry) + "\n", "utf-8");
  }

  private async getLogFilesBetweenDates(
    startDate: Date,
    endDate: Date,
  ): Promise<string[]> {
    const files = await fs.readdir(this.auditLogPath);
    return files.filter((file: any) => {
      const match = file.match(/zk-audit-(\d{4}-\d{2}-\d{2})/);
      if (!match) return false;
      const fileDate = new Date(match[1]);
      return fileDate >= startDate && fileDate <= endDate;
    });
  }

  private filterOperations(
    operations: ZKOperation[],
    filters?: {
      type?: ZKOperation["type"];
      status?: ZKOperation["status"];
      userId?: string;
      sessionId?: string;
    },
  ): ZKOperation[] {
    if (!filters) return operations;
    return operations.filter((op: any) => {
      if (filters.type && op.type !== filters.type) return false;
      if (filters.status && op.status !== filters.status) return false;
      if (filters.userId && op.userId !== filters.userId) return false;
      if (filters.sessionId && op.sessionId !== filters.sessionId) return false;
      return true;
    });
  }

  async recordAuditEvent(event: AuditEvent): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from("zk_audit_events")
        .insert([event]);

      if (error) throw error;

      this.emit("metrics-update");
      return data[0].id;
    } catch (error) {
      await this.securityAuditService.recordAlert("ZK_AUDIT_ERROR", "HIGH", {
        error: error instanceof Error ? error.message : "Unknown error",
        eventType: event.eventType,
      });
      throw error;
    }
  }

  async getHistoricalMetrics(startTime: Date, endTime: Date): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from("zk_audit_events")
        .select("*")
        .gte("timestamp", startTime.toISOString())
        .lte("timestamp", endTime.toISOString())
        .orderBy("timestamp", { ascending: false });

      if (error) throw error;

      return this.calculateMetrics(data);
    } catch (error) {
      await this.securityAuditService.recordAlert("ZK_METRICS_ERROR", "HIGH", {
        error: error instanceof Error ? error.message : "Unknown error",
        timeRange: `${startTime.toISOString()} - ${endTime.toISOString()}`,
      });
      throw error;
    }
  }

  registerDashboardClient(ws: WebSocketServer): void {
    this.clients.add(ws);
    ws.on("close", () => {
      this.clients.delete(ws);
    });
  }

  private calculateMetrics(events: AuditEvent[]): any {
    return {
      totalEvents: events.length,
      eventsByType: this.groupEventsByType(events),
      timeDistribution: this.calculateTimeDistribution(events),
    };
  }

  private groupEventsByType(events: AuditEvent[]): Record<string, number> {
    return events.reduce(
      (acc: any, event: any) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private calculateTimeDistribution(
    events: AuditEvent[],
  ): Record<string, number> {
    const hourlyDistribution: Record<string, number> = {};
    events.forEach((event: any) => {
      const hour = new Date(event.timestamp).getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
    });
    return hourlyDistribution;
  }

  async cleanup(): Promise<void> {
    try {
      // Clear all WebSocket clients
      for (const client of this.clients) {
        client.close();
      }
      this.clients.clear();

      // Ensure any pending writes are completed
      if (this.currentLogFile) {
        const logPath = path.join(this.auditLogPath, this.currentLogFile);
        try {
          const fileHandle = await fs.open(logPath, "a");
          await fileHandle.sync();
          await fileHandle.close();
        } catch (error) {
          // Handle file not existing
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            throw error;
          }
        }
      }

      await this.securityAuditService.recordAlert("ZK_AUDIT_CLEANUP", "LOW", {
        timestamp: Date.now(),
      });
    } catch (error) {
      await this.securityAuditService.recordAlert(
        "ZK_AUDIT_CLEANUP_ERROR",
        "HIGH",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      );
      throw error;
    }
  }
}
