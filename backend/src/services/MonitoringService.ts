import { SecurityAuditService } from './SecurityAuditService';

export class MonitoringService {
  private securityAudit: SecurityAuditService;

  constructor(securityAudit: SecurityAuditService) {
    this.securityAudit = securityAudit;
  }

  async logPerformanceMetrics(metrics: { [key: string]: any }): Promise<void> {
    await this.securityAudit.recordEvent('performance_metrics', {
      timestamp: Date.now(),
      ...metrics
    });
  }

  async logError(error: Error): Promise<void> {
    await this.securityAudit.recordEvent('system_error', {
      timestamp: Date.now(),
      error: error.message
    });
  }

  async logUsageStatistics(stats: { [key: string]: any }): Promise<void> {
    await this.securityAudit.recordEvent('usage_statistics', {
      timestamp: Date.now(),
      ...stats
    });
  }
}
