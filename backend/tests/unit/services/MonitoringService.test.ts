import { MonitoringService } from '../../../src/services/MonitoringService';
import { SecurityAuditService } from '../../../src/services/SecurityAuditService';

describe('MonitoringService', () => {
  let monitoringService: MonitoringService;
  let mockSecurityAudit: jest.Mocked<SecurityAuditService>;

  beforeEach(() => {
    mockSecurityAudit = {
      recordEvent: jest.fn().mockResolvedValue(undefined)
    } as any;

    monitoringService = new MonitoringService(mockSecurityAudit);
  });

  describe('logPerformanceMetrics', () => {
    it('should log performance metrics successfully', async () => {
      const metrics = { responseTime: 200, memoryUsage: 1500 };
      await monitoringService.logPerformanceMetrics(metrics);

      expect(mockSecurityAudit.recordEvent).toHaveBeenCalledWith(
        'performance_metrics',
        expect.objectContaining({
          timestamp: expect.any(Number),
          responseTime: 200,
          memoryUsage: 1500
        })
      );
    });
  });

  describe('logError', () => {
    it('should log errors successfully', async () => {
      const error = new Error('Test error');
      await monitoringService.logError(error);

      expect(mockSecurityAudit.recordEvent).toHaveBeenCalledWith(
        'system_error',
        expect.objectContaining({
          timestamp: expect.any(Number),
          error: 'Test error'
        })
      );
    });
  });

  describe('logUsageStatistics', () => {
    it('should log usage statistics successfully', async () => {
      const stats = { activeUsers: 100, totalSessions: 500 }; 
      await monitoringService.logUsageStatistics(stats);

      expect(mockSecurityAudit.recordEvent).toHaveBeenCalledWith(
        'usage_statistics',
        expect.objectContaining({
          timestamp: expect.any(Number),
          activeUsers: 100,
          totalSessions: 500
        })
      );
    });
  });
});
