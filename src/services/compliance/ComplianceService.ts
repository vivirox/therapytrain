import { singleton } from "tsyringe";
import { dataService } from "@/lib/data";
import { SecurityService } from "../security/SecurityService";
import { AuditService } from "../audit/AuditService";
import { HIPAAService } from "../hipaa/HIPAAService";

@singleton()
export class ComplianceService {
  private static instance: ComplianceService;
  private securityService: SecurityService;
  private auditService: AuditService;
  private hipaaService: HIPAAService;

  constructor() {
    this.securityService = SecurityService.getInstance();
    this.auditService = AuditService.getInstance();
    this.hipaaService = HIPAAService.getInstance();
  }

  public static getInstance(): ComplianceService {
    if (!ComplianceService.instance) {
      ComplianceService.instance = new ComplianceService();
    }
    return ComplianceService.instance;
  }

  public async checkRetentionPolicy(session: any): Promise<{
    isCompliant: boolean;
    issues?: string[];
    recommendations?: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check data retention settings
    const retentionSettings = await this.getRetentionSettings(session);
    if (!this.validateRetentionSettings(retentionSettings)) {
      issues.push("Invalid data retention settings");
      recommendations.push(
        "Update data retention settings to meet compliance requirements",
      );
    }

    // Check data lifecycle policies
    const lifecyclePolicies = await this.getLifecyclePolicies(session);
    if (!this.validateLifecyclePolicies(lifecyclePolicies)) {
      issues.push("Invalid data lifecycle policies");
      recommendations.push("Review and update data lifecycle policies");
    }

    // Check archival policies
    const archivalPolicies = await this.getArchivalPolicies(session);
    if (!this.validateArchivalPolicies(archivalPolicies)) {
      issues.push("Invalid archival policies");
      recommendations.push(
        "Update archival policies to meet compliance requirements",
      );
    }

    return {
      isCompliant: issues.length === 0,
      issues: issues.length > 0 ? issues : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
    };
  }

  public async calculateMedicationCompliance(medication: any): Promise<{
    takingRate: number;
    timing: number;
  }> {
    try {
      // Get medication schedule
      const schedule = await this.getMedicationSchedule(medication);

      // Get medication logs
      const logs = await this.getMedicationLogs(medication);

      // Calculate taking rate
      const takingRate = this.calculateTakingRate(schedule, logs);

      // Calculate timing compliance
      const timing = this.calculateTimingCompliance(schedule, logs);

      return {
        takingRate,
        timing,
      };
    } catch (error) {
      console.error("Error calculating medication compliance:", error);
      throw error;
    }
  }

  public async checkCompliance(session: any): Promise<{
    isCompliant: boolean;
    issues?: string[];
    recommendations?: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check HIPAA compliance
    const hipaaStatus = await this.hipaaService.checkCompliance(session);
    if (!hipaaStatus.isCompliant) {
      issues.push(...(hipaaStatus.issues || []));
      recommendations.push(...(hipaaStatus.recommendations || []));
    }

    // Check security compliance
    const securityStatus = await this.securityService.checkCompliance(session);
    if (!securityStatus.isCompliant) {
      issues.push("Security requirements not met");
      recommendations.push("Review and update security measures");
    }

    // Check audit compliance
    const auditStatus = await this.auditService.checkLogs(session);
    if (!auditStatus.isComplete) {
      issues.push(...(auditStatus.issues || []));
      recommendations.push(...(auditStatus.recommendations || []));
    }

    // Check data retention compliance
    const retentionStatus = await this.checkRetentionPolicy(session);
    if (!retentionStatus.isCompliant) {
      issues.push(...(retentionStatus.issues || []));
      recommendations.push(...(retentionStatus.recommendations || []));
    }

    return {
      isCompliant: issues.length === 0,
      issues: issues.length > 0 ? issues : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
    };
  }

  private async getRetentionSettings(session: any): Promise<any> {
    return await dataService.get("retention_settings", {
      where: {
        resourceType: session.type,
        status: "active",
      },
    });
  }

  private validateRetentionSettings(settings: any): boolean {
    if (!settings) return false;

    // Check if retention period is defined
    if (
      !settings.retentionPeriod ||
      typeof settings.retentionPeriod !== "number"
    ) {
      return false;
    }

    // Check if retention actions are defined
    if (!settings.actions || !Array.isArray(settings.actions)) {
      return false;
    }

    // Check if required actions are present
    const requiredActions = ["archive", "delete"];
    return requiredActions.every((action) => settings.actions.includes(action));
  }

  private async getLifecyclePolicies(session: any): Promise<any[]> {
    return await dataService.list("lifecycle_policies", {
      where: {
        resourceType: session.type,
        status: "active",
      },
    });
  }

  private validateLifecyclePolicies(policies: any[]): boolean {
    return policies.every((policy) => {
      // Check if policy has required fields
      if (!policy.stages || !Array.isArray(policy.stages)) {
        return false;
      }

      // Check if stages are properly defined
      return policy.stages.every((stage: any) => {
        return (
          stage.name &&
          stage.duration &&
          stage.actions &&
          Array.isArray(stage.actions)
        );
      });
    });
  }

  private async getArchivalPolicies(session: any): Promise<any[]> {
    return await dataService.list("archival_policies", {
      where: {
        resourceType: session.type,
        status: "active",
      },
    });
  }

  private validateArchivalPolicies(policies: any[]): boolean {
    return policies.every((policy) => {
      // Check if policy has required fields
      if (!policy.criteria || !policy.storage || !policy.retention) {
        return false;
      }

      // Check if storage options are valid
      const validStorageOptions = ["cold_storage", "archive", "backup"];
      if (!validStorageOptions.includes(policy.storage)) {
        return false;
      }

      return true;
    });
  }

  private async getMedicationSchedule(medication: any): Promise<any> {
    return await dataService.get("medication_schedules", {
      where: {
        medicationId: medication.id,
        status: "active",
      },
    });
  }

  private async getMedicationLogs(medication: any): Promise<any[]> {
    return await dataService.list("medication_logs", {
      where: {
        medicationId: medication.id,
      },
      orderBy: {
        timestamp: "asc",
      },
    });
  }

  private calculateTakingRate(schedule: any, logs: any[]): number {
    const expectedDoses = this.calculateExpectedDoses(schedule);
    const takenDoses = logs.filter((log) => log.status === "taken").length;

    return takenDoses / expectedDoses;
  }

  private calculateTimingCompliance(schedule: any, logs: any[]): number {
    const takenLogs = logs.filter((log) => log.status === "taken");
    if (takenLogs.length === 0) return 0;

    const timingScores = takenLogs.map((log) => {
      const expectedTime = this.getExpectedTime(schedule, log.timestamp);
      const actualTime = new Date(log.timestamp);
      return this.calculateTimingScore(expectedTime, actualTime);
    });

    return (
      timingScores.reduce((sum, score) => sum + score, 0) / timingScores.length
    );
  }

  private calculateExpectedDoses(schedule: any): number {
    const startDate = new Date(schedule.startDate);
    const endDate = schedule.endDate ? new Date(schedule.endDate) : new Date();
    const daysElapsed = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    return daysElapsed * schedule.dosesPerDay;
  }

  private getExpectedTime(schedule: any, timestamp: string): Date {
    const date = new Date(timestamp);
    const scheduleTime = this.getNearestScheduleTime(schedule, date);

    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      scheduleTime.hours,
      scheduleTime.minutes,
    );
  }

  private getNearestScheduleTime(
    schedule: any,
    date: Date,
  ): {
    hours: number;
    minutes: number;
  } {
    const times = schedule.times.map((time: string) => {
      const [hours, minutes] = time.split(":").map(Number);
      return { hours, minutes };
    });

    let minDiff = Infinity;
    let nearestTime = times[0];

    times.forEach((time) => {
      const scheduleDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        time.hours,
        time.minutes,
      );

      const diff = Math.abs(date.getTime() - scheduleDate.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        nearestTime = time;
      }
    });

    return nearestTime;
  }

  private calculateTimingScore(expected: Date, actual: Date): number {
    const diffMinutes =
      Math.abs(actual.getTime() - expected.getTime()) / (1000 * 60);
    const maxAllowedDiff = 60; // 1 hour tolerance

    if (diffMinutes <= maxAllowedDiff) {
      return 1 - diffMinutes / maxAllowedDiff;
    }

    return 0;
  }
}
