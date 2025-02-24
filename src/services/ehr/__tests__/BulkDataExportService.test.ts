import { BulkDataExportService } from '../BulkDataExportService';
import { HIPAACompliantAuditService } from '../../HIPAACompliantAuditService';
import { SecurityAuditService } from '../../SecurityAuditService';
import { QualityMetricsService } from '../../QualityMetricsService';
import { Resource } from '@/types/fhir';

jest.mock('../../HIPAACompliantAuditService');
jest.mock('../../SecurityAuditService');
jest.mock('../../QualityMetricsService');

describe('BulkDataExportService', () => {
  let service: BulkDataExportService;
  let mockHipaaAuditService: jest.Mocked<HIPAACompliantAuditService>;
  let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
  let mockQualityMetricsService: jest.Mocked<QualityMetricsService>;

  const mockJobId = 'test-export';
  const mockConfig = {
    resourceTypes: ['Patient', 'Observation'],
    format: 'json' as const,
    chunkSize: 100,
  };

  beforeEach(() => {
    mockHipaaAuditService = new HIPAACompliantAuditService() as jest.Mocked<HIPAACompliantAuditService>;
    mockSecurityAuditService = new SecurityAuditService() as jest.Mocked<SecurityAuditService>;
    mockQualityMetricsService = new QualityMetricsService() as jest.Mocked<QualityMetricsService>;

    mockHipaaAuditService.logEvent.mockResolvedValue();
    mockSecurityAuditService.recordAlert.mockResolvedValue();
    mockQualityMetricsService.recordMetric.mockResolvedValue();

    service = new BulkDataExportService(
      mockHipaaAuditService,
      mockSecurityAuditService,
      mockQualityMetricsService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startExport', () => {
    it('should start export with valid configuration', async () => {
      const exportStartedHandler = jest.fn();
      service.on('exportStarted', exportStartedHandler);

      const jobId = await service.startExport(mockJobId, mockConfig);

      expect(jobId).toBe(mockJobId);
      expect(exportStartedHandler).toHaveBeenCalledWith({
        jobId: mockJobId,
        config: expect.objectContaining(mockConfig),
      });

      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SYSTEM_OPERATION',
          action: expect.objectContaining({
            type: 'CREATE',
            status: 'SUCCESS',
            details: expect.objectContaining({
              operation: 'START_BULK_EXPORT',
              jobId: mockJobId,
            }),
          }),
        })
      );

      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'bulk_export_started',
        expect.objectContaining({
          jobId: mockJobId,
          resourceTypes: mockConfig.resourceTypes,
          format: mockConfig.format,
        })
      );
    });

    it('should throw error when job ID already exists', async () => {
      await service.startExport(mockJobId, mockConfig);

      await expect(service.startExport(mockJobId, mockConfig))
        .rejects
        .toThrow(`Export job ${mockJobId} already exists`);
    });
  });

  describe('export processing', () => {
    it('should process export and emit progress events', async () => {
      const exportProcessingHandler = jest.fn();
      const exportProgressHandler = jest.fn();
      const exportCompletedHandler = jest.fn();

      service.on('exportProcessing', exportProcessingHandler);
      service.on('exportProgress', exportProgressHandler);
      service.on('exportCompleted', exportCompletedHandler);

      await service.startExport(mockJobId, mockConfig);

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(exportProcessingHandler).toHaveBeenCalledWith({
        jobId: mockJobId,
      });

      expect(exportProgressHandler).toHaveBeenCalled();
      expect(exportCompletedHandler).toHaveBeenCalled();

      const status = service.getJobStatus(mockJobId);
      expect(status).toBeDefined();
      expect(status?.status).toBe('completed');
    });

    it('should handle processing errors and retry', async () => {
      const exportFailedHandler = jest.fn();
      service.on('exportFailed', exportFailedHandler);

      // Mock processChunk to fail
      jest.spyOn(service as any, 'processChunk')
        .mockRejectedValue(new Error('Processing error'));

      await service.startExport(mockJobId, {
        ...mockConfig,
        maxRetries: 2,
      });

      // Wait for processing and retries
      await new Promise(resolve => setTimeout(resolve, 5000));

      expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
        'BULK_EXPORT_FAILED',
        'HIGH',
        expect.any(Object)
      );

      expect(exportFailedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: mockJobId,
          error: expect.objectContaining({
            message: 'Processing error',
          }),
        })
      );

      const status = service.getJobStatus(mockJobId);
      expect(status?.status).toBe('failed');
    });
  });

  describe('getJobStatus', () => {
    it('should return null for non-existent job', () => {
      const status = service.getJobStatus('non-existent');
      expect(status).toBeNull();
    });

    it('should return correct status for existing job', async () => {
      await service.startExport(mockJobId, mockConfig);

      const status = service.getJobStatus(mockJobId);
      expect(status).toBeDefined();
      expect(status?.id).toBe(mockJobId);
      expect(status?.config).toEqual(expect.objectContaining(mockConfig));
    });
  });

  describe('cancelExport', () => {
    beforeEach(async () => {
      await service.startExport(mockJobId, mockConfig);
    });

    it('should cancel running export', async () => {
      const exportCancelledHandler = jest.fn();
      service.on('exportCancelled', exportCancelledHandler);

      await service.cancelExport(mockJobId);

      expect(exportCancelledHandler).toHaveBeenCalledWith({
        jobId: mockJobId,
      });

      const status = service.getJobStatus(mockJobId);
      expect(status?.status).toBe('failed');
      expect(status?.errors[0].message).toBe('Export cancelled by user');

      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SYSTEM_OPERATION',
          action: expect.objectContaining({
            type: 'UPDATE',
            status: 'SUCCESS',
            details: expect.objectContaining({
              operation: 'CANCEL_BULK_EXPORT',
              jobId: mockJobId,
            }),
          }),
        })
      );
    });

    it('should throw error when cancelling non-existent job', async () => {
      await expect(service.cancelExport('non-existent'))
        .rejects
        .toThrow('Export job non-existent not found');
    });

    it('should throw error when cancelling completed job', async () => {
      // Wait for job to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      await expect(service.cancelExport(mockJobId))
        .rejects
        .toThrow(`Cannot cancel job ${mockJobId} in status completed`);
    });
  });

  describe('output formats', () => {
    it('should handle JSON format', async () => {
      await service.startExport(mockJobId, {
        ...mockConfig,
        format: 'json',
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      const status = service.getJobStatus(mockJobId);
      expect(status?.outputFiles.some(file => file.endsWith('.json'))).toBe(true);
    });

    it('should handle NDJSON format', async () => {
      await service.startExport(mockJobId, {
        ...mockConfig,
        format: 'ndjson',
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      const status = service.getJobStatus(mockJobId);
      expect(status?.outputFiles.some(file => file.endsWith('.ndjson'))).toBe(true);
    });
  });

  describe('metrics and monitoring', () => {
    beforeEach(async () => {
      await service.startExport(mockJobId, mockConfig);
    });

    it('should record metrics for export progress', async () => {
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'bulk_export_progress',
        expect.any(Object)
      );
    });

    it('should record metrics for export completion', async () => {
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'bulk_export_completed',
        expect.objectContaining({
          jobId: mockJobId,
          processedResources: expect.any(Number),
          outputFiles: expect.any(Number),
        })
      );
    });

    it('should record security alerts for export failures', async () => {
      // Mock processChunk to fail
      jest.spyOn(service as any, 'processChunk')
        .mockRejectedValue(new Error('Critical error'));

      await service.startExport('failed-job', mockConfig);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
        'BULK_EXPORT_FAILED',
        'HIGH',
        expect.objectContaining({
          jobId: 'failed-job',
          error: 'Critical error',
        })
      );
    });
  });
}); 