import { PerformanceMonitoringService } from '../PerformanceMonitoringService';
import { HIPAACompliantAuditService } from '../../HIPAACompliantAuditService';
import { SecurityAuditService } from '../../SecurityAuditService';
import { QualityMetricsService } from '../../QualityMetricsService';

jest.mock('../../HIPAACompliantAuditService');
jest.mock('../../SecurityAuditService');
jest.mock('../../QualityMetricsService');

describe('PerformanceMonitoringService', () => {
  let service: PerformanceMonitoringService;
  let mockHipaaAuditService: jest.Mocked<HIPAACompliantAuditService>;
  let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
  let mockQualityMetricsService: jest.Mocked<QualityMetricsService>;

  const mockMetricConfig = {
    name: 'test_metric',
    type: 'gauge' as const,
    description: 'Test metric',
    unit: 'ms',
  };

  const mockAlertConfig = {
    metric: 'test_metric',
    condition: 'gt' as const,
    threshold: 100,
    severity: 'high' as const,
  };

  beforeEach(() => {
    mockHipaaAuditService = new HIPAACompliantAuditService() as jest.Mocked<HIPAACompliantAuditService>;
    mockSecurityAuditService = new SecurityAuditService() as jest.Mocked<SecurityAuditService>;
    mockQualityMetricsService = new QualityMetricsService() as jest.Mocked<QualityMetricsService>;

    mockHipaaAuditService.logEvent.mockResolvedValue();
    mockSecurityAuditService.recordAlert.mockResolvedValue();
    mockQualityMetricsService.recordMetric.mockResolvedValue();

    service = new PerformanceMonitoringService(
      mockHipaaAuditService,
      mockSecurityAuditService,
      mockQualityMetricsService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerMetric', () => {
    it('should register metric with valid configuration', async () => {
      const metricRegisteredHandler = jest.fn();
      service.on('metricRegistered', metricRegisteredHandler);

      await service.registerMetric(mockMetricConfig);

      expect(metricRegisteredHandler).toHaveBeenCalledWith({
        config: mockMetricConfig,
      });

      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SYSTEM_OPERATION',
          action: expect.objectContaining({
            type: 'CREATE',
            status: 'SUCCESS',
            details: expect.objectContaining({
              operation: 'REGISTER_METRIC',
              metric: mockMetricConfig.name,
            }),
          }),
        })
      );

      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'metric_registered',
        expect.objectContaining({
          name: mockMetricConfig.name,
          type: mockMetricConfig.type,
        })
      );
    });

    it('should throw error when metric already exists', async () => {
      await service.registerMetric(mockMetricConfig);

      await expect(service.registerMetric(mockMetricConfig))
        .rejects
        .toThrow(`Metric ${mockMetricConfig.name} already exists`);
    });
  });

  describe('recordMetric', () => {
    beforeEach(async () => {
      await service.registerMetric(mockMetricConfig);
    });

    it('should record metric value', async () => {
      const metricRecordedHandler = jest.fn();
      service.on('metricRecorded', metricRecordedHandler);

      const value = 50;
      const labels = { service: 'test' };

      await service.recordMetric(mockMetricConfig.name, value, labels);

      expect(metricRecordedHandler).toHaveBeenCalledWith({
        name: mockMetricConfig.name,
        value: expect.objectContaining({
          value,
          labels,
        }),
      });

      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'metric_recorded',
        expect.objectContaining({
          name: mockMetricConfig.name,
          value,
          labels,
        })
      );
    });

    it('should throw error when metric does not exist', async () => {
      await expect(service.recordMetric('non-existent', 50))
        .rejects
        .toThrow('Metric non-existent not found');
    });

    it('should enforce sample limit', async () => {
      const MAX_SAMPLES = 10000;

      // Record more than MAX_SAMPLES values
      for (let i = 0; i < MAX_SAMPLES + 100; i++) {
        await service.recordMetric(mockMetricConfig.name, i);
      }

      const values = service.getMetricValues(mockMetricConfig.name);
      expect(values.length).toBe(MAX_SAMPLES);
      expect(values[0].value).toBe(100); // First value should be 100 (oldest values removed)
    });
  });

  describe('registerAlert', () => {
    beforeEach(async () => {
      await service.registerMetric(mockMetricConfig);
    });

    it('should register alert with valid configuration', async () => {
      const alertRegisteredHandler = jest.fn();
      service.on('alertRegistered', alertRegisteredHandler);

      const alertName = 'test_alert';
      await service.registerAlert(alertName, mockAlertConfig);

      expect(alertRegisteredHandler).toHaveBeenCalledWith({
        name: alertName,
        config: mockAlertConfig,
      });

      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SYSTEM_OPERATION',
          action: expect.objectContaining({
            type: 'CREATE',
            status: 'SUCCESS',
            details: expect.objectContaining({
              operation: 'REGISTER_ALERT',
              name: alertName,
            }),
          }),
        })
      );
    });

    it('should throw error when metric does not exist', async () => {
      const invalidConfig = {
        ...mockAlertConfig,
        metric: 'non-existent',
      };

      await expect(service.registerAlert('test_alert', invalidConfig))
        .rejects
        .toThrow('Metric non-existent not found');
    });
  });

  describe('alert triggering', () => {
    const alertName = 'test_alert';

    beforeEach(async () => {
      await service.registerMetric(mockMetricConfig);
      await service.registerAlert(alertName, mockAlertConfig);
    });

    it('should trigger alert when condition is met', async () => {
      const alertTriggeredHandler = jest.fn();
      service.on('alertTriggered', alertTriggeredHandler);

      await service.recordMetric(mockMetricConfig.name, 150); // Above threshold

      expect(alertTriggeredHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          alert: alertName,
          config: mockAlertConfig,
          value: expect.objectContaining({
            value: 150,
          }),
        })
      );

      expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
        'PERFORMANCE_ALERT',
        'high',
        expect.any(Object)
      );
    });

    it('should not trigger alert when condition is not met', async () => {
      const alertTriggeredHandler = jest.fn();
      service.on('alertTriggered', alertTriggeredHandler);

      await service.recordMetric(mockMetricConfig.name, 50); // Below threshold

      expect(alertTriggeredHandler).not.toHaveBeenCalled();
      expect(mockSecurityAuditService.recordAlert).not.toHaveBeenCalled();
    });

    it('should respect label matching', async () => {
      const labeledAlertName = 'labeled_alert';
      await service.registerAlert(labeledAlertName, {
        ...mockAlertConfig,
        labels: { service: 'test' },
      });

      const alertTriggeredHandler = jest.fn();
      service.on('alertTriggered', alertTriggeredHandler);

      // Should not trigger (wrong labels)
      await service.recordMetric(mockMetricConfig.name, 150, { service: 'other' });
      expect(alertTriggeredHandler).not.toHaveBeenCalled();

      // Should trigger (matching labels)
      await service.recordMetric(mockMetricConfig.name, 150, { service: 'test' });
      expect(alertTriggeredHandler).toHaveBeenCalled();
    });
  });

  describe('metric aggregation', () => {
    beforeEach(async () => {
      await service.registerMetric(mockMetricConfig);

      // Record some test values
      await service.recordMetric(mockMetricConfig.name, 10);
      await service.recordMetric(mockMetricConfig.name, 20);
      await service.recordMetric(mockMetricConfig.name, 30);
      await service.recordMetric(mockMetricConfig.name, 40);
      await service.recordMetric(mockMetricConfig.name, 50);
    });

    it('should calculate correct aggregations', () => {
      const aggregation = service.getMetricAggregation(mockMetricConfig.name);

      expect(aggregation).toEqual({
        min: 10,
        max: 50,
        avg: 30,
        sum: 150,
        count: 5,
        p95: 50,
        p99: 50,
      });
    });

    it('should filter by time range', async () => {
      const now = Date.now();
      const startTime = now - 1000;
      const endTime = now + 1000;

      await service.recordMetric(mockMetricConfig.name, 100);

      const aggregation = service.getMetricAggregation(
        mockMetricConfig.name,
        startTime,
        endTime
      );

      expect(aggregation.count).toBe(1);
      expect(aggregation.value).toBe(100);
    });

    it('should filter by labels', async () => {
      await service.recordMetric(mockMetricConfig.name, 100, { service: 'test' });

      const aggregation = service.getMetricAggregation(
        mockMetricConfig.name,
        undefined,
        undefined,
        { service: 'test' }
      );

      expect(aggregation.count).toBe(1);
      expect(aggregation.value).toBe(100);
    });

    it('should throw error when no values found', () => {
      expect(() =>
        service.getMetricAggregation(
          mockMetricConfig.name,
          Date.now() + 1000000
        )
      ).toThrow('No values found for metric test_metric');
    });
  });

  describe('maintenance', () => {
    beforeEach(async () => {
      await service.registerMetric(mockMetricConfig);
    });

    it('should clean up old metrics', async () => {
      const oldTimestamp = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago
      
      // Record an old value by mocking Date.now()
      const originalNow = Date.now;
      Date.now = jest.fn(() => oldTimestamp);
      await service.recordMetric(mockMetricConfig.name, 100);
      Date.now = originalNow;

      // Record a new value
      await service.recordMetric(mockMetricConfig.name, 200);

      // Wait for maintenance cycle
      await new Promise(resolve => setTimeout(resolve, 100));

      const values = service.getMetricValues(mockMetricConfig.name);
      expect(values.length).toBe(1);
      expect(values[0].value).toBe(200);
    });
  });

  describe('stop', () => {
    it('should stop maintenance and log event', async () => {
      await service.stop();

      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SYSTEM_OPERATION',
          action: expect.objectContaining({
            type: 'UPDATE',
            status: 'SUCCESS',
            details: expect.objectContaining({
              operation: 'STOP_PERFORMANCE_MONITORING',
            }),
          }),
        })
      );
    });
  });
}); 