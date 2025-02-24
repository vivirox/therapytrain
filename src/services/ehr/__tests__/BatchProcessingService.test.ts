import { BatchProcessingService } from '../BatchProcessingService';
import { HIPAACompliantAuditService } from '../../HIPAACompliantAuditService';
import { SecurityAuditService } from '../../SecurityAuditService';
import { QualityMetricsService } from '../../QualityMetricsService';
import { Resource } from '@/types/fhir';

jest.mock('../../HIPAACompliantAuditService');
jest.mock('../../SecurityAuditService');
jest.mock('../../QualityMetricsService');

describe('BatchProcessingService', () => {
  let service: BatchProcessingService;
  let mockHipaaAuditService: jest.Mocked<HIPAACompliantAuditService>;
  let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
  let mockQualityMetricsService: jest.Mocked<QualityMetricsService>;

  const mockJobId = 'test-job';
  const mockResources: Resource[] = [
    { resourceType: 'Patient', id: '1' },
    { resourceType: 'Patient', id: '2' },
    { resourceType: 'Patient', id: '3' },
  ];

  beforeEach(() => {
    mockHipaaAuditService = new HIPAACompliantAuditService() as jest.Mocked<HIPAACompliantAuditService>;
    mockSecurityAuditService = new SecurityAuditService() as jest.Mocked<SecurityAuditService>;
    mockQualityMetricsService = new QualityMetricsService() as jest.Mocked<QualityMetricsService>;

    mockHipaaAuditService.logEvent.mockResolvedValue();
    mockSecurityAuditService.recordAlert.mockResolvedValue();
    mockQualityMetricsService.recordMetric.mockResolvedValue();

    service = new BatchProcessingService(
      mockHipaaAuditService,
      mockSecurityAuditService,
      mockQualityMetricsService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submitJob', () => {
    it('should submit job with valid configuration', async () => {
      const jobSubmittedHandler = jest.fn();
      service.on('jobSubmitted', jobSubmittedHandler);

      const jobConfig = {
        type: 'import' as const,
        priority: 'high' as const,
        resources: mockResources,
      };

      const jobId = await service.submitJob(mockJobId, jobConfig);

      expect(jobId).toBe(mockJobId);
      expect(jobSubmittedHandler).toHaveBeenCalledWith({
        jobId: mockJobId,
        config: jobConfig,
      });

      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SYSTEM_OPERATION',
          action: expect.objectContaining({
            type: 'CREATE',
            status: 'SUCCESS',
            details: expect.objectContaining({
              operation: 'SUBMIT_BATCH_JOB',
              jobId: mockJobId,
            }),
          }),
        })
      );

      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'batch_job_submitted',
        expect.objectContaining({
          jobId: mockJobId,
          type: jobConfig.type,
          priority: jobConfig.priority,
          itemCount: mockResources.length,
        })
      );
    });

    it('should throw error when job ID already exists', async () => {
      const jobConfig = {
        type: 'import' as const,
        priority: 'high' as const,
        resources: mockResources,
      };

      await service.submitJob(mockJobId, jobConfig);

      await expect(service.submitJob(mockJobId, jobConfig))
        .rejects
        .toThrow(`Job ${mockJobId} already exists`);
    });
  });

  describe('job processing', () => {
    it('should process job and emit progress events', async () => {
      const jobStartedHandler = jest.fn();
      const jobProgressHandler = jest.fn();
      const jobCompletedHandler = jest.fn();

      service.on('jobStarted', jobStartedHandler);
      service.on('jobProgress', jobProgressHandler);
      service.on('jobCompleted', jobCompletedHandler);

      await service.submitJob(mockJobId, {
        type: 'import',
        priority: 'high',
        resources: mockResources,
      });

      // Wait for job processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(jobStartedHandler).toHaveBeenCalledWith({ jobId: mockJobId });
      expect(jobProgressHandler).toHaveBeenCalledTimes(mockResources.length);
      expect(jobCompletedHandler).toHaveBeenCalledWith({
        jobId: mockJobId,
        processedItems: mockResources.length,
        totalItems: mockResources.length,
      });
    });

    it('should handle job failures and retry', async () => {
      const jobFailedHandler = jest.fn();
      service.on('jobFailed', jobFailedHandler);

      // Mock processResource to fail
      jest.spyOn(service as any, 'processResource')
        .mockRejectedValue(new Error('Processing error'));

      await service.submitJob(mockJobId, {
        type: 'import',
        priority: 'high',
        resources: mockResources,
        maxRetries: 2,
      });

      // Wait for job processing and retries
      await new Promise(resolve => setTimeout(resolve, 5000));

      expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
        'BATCH_PROCESSING_ERROR',
        'HIGH',
        expect.any(Object)
      );

      expect(jobFailedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: mockJobId,
          errors: expect.arrayContaining([
            expect.objectContaining({
              message: 'Processing error',
            }),
          ]),
        })
      );
    });
  });

  describe('job status', () => {
    it('should track job progress correctly', async () => {
      await service.submitJob(mockJobId, {
        type: 'import',
        priority: 'high',
        resources: mockResources,
      });

      // Wait for job to start
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = service.getJobStatus(mockJobId);
      expect(status).toBeDefined();
      expect(status?.status).toBe('processing');
      expect(status?.progress).toBeGreaterThanOrEqual(0);
      expect(status?.progress).toBeLessThanOrEqual(100);
    });

    it('should return null for non-existent job', () => {
      const status = service.getJobStatus('non-existent');
      expect(status).toBeNull();
    });
  });

  describe('job cancellation', () => {
    it('should cancel running job', async () => {
      const jobCancelledHandler = jest.fn();
      service.on('jobCancelled', jobCancelledHandler);

      await service.submitJob(mockJobId, {
        type: 'import',
        priority: 'high',
        resources: mockResources,
      });

      // Wait for job to start
      await new Promise(resolve => setTimeout(resolve, 100));

      await service.cancelJob(mockJobId);

      expect(jobCancelledHandler).toHaveBeenCalledWith({ jobId: mockJobId });
      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SYSTEM_OPERATION',
          action: expect.objectContaining({
            type: 'UPDATE',
            status: 'SUCCESS',
            details: expect.objectContaining({
              operation: 'CANCEL_BATCH_JOB',
              jobId: mockJobId,
            }),
          }),
        })
      );
    });

    it('should throw error when cancelling non-existent job', async () => {
      await expect(service.cancelJob('non-existent'))
        .rejects
        .toThrow('Job non-existent not found');
    });

    it('should throw error when cancelling completed job', async () => {
      await service.submitJob(mockJobId, {
        type: 'import',
        priority: 'high',
        resources: mockResources,
      });

      // Wait for job to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      await expect(service.cancelJob(mockJobId))
        .rejects
        .toThrow(`Cannot cancel job ${mockJobId} in status completed`);
    });
  });

  describe('job prioritization', () => {
    it('should process high priority jobs before low priority jobs', async () => {
      const processOrder: string[] = [];
      const jobStartedHandler = (event: { jobId: string }) => {
        processOrder.push(event.jobId);
      };

      service.on('jobStarted', jobStartedHandler);

      await service.submitJob('low-priority', {
        type: 'import',
        priority: 'low',
        resources: mockResources,
      });

      await service.submitJob('high-priority', {
        type: 'import',
        priority: 'high',
        resources: mockResources,
      });

      // Wait for jobs to start processing
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(processOrder[0]).toBe('high-priority');
    });
  });

  describe('metrics and monitoring', () => {
    it('should record metrics for job lifecycle', async () => {
      await service.submitJob(mockJobId, {
        type: 'import',
        priority: 'high',
        resources: mockResources,
      });

      // Wait for job to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'batch_job_submitted',
        expect.any(Object)
      );

      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'batch_job_progress',
        expect.any(Object)
      );

      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'batch_job_completed',
        expect.objectContaining({
          jobId: mockJobId,
          processedItems: mockResources.length,
          totalItems: mockResources.length,
        })
      );
    });

    it('should record security alerts for failed jobs', async () => {
      // Mock processResource to fail
      jest.spyOn(service as any, 'processResource')
        .mockRejectedValue(new Error('Critical error'));

      await service.submitJob(mockJobId, {
        type: 'import',
        priority: 'high',
        resources: mockResources,
      });

      // Wait for job to fail
      await new Promise(resolve => setTimeout(resolve, 5000));

      expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
        'BATCH_JOB_FAILED',
        'HIGH',
        expect.objectContaining({
          jobId: mockJobId,
          errors: expect.arrayContaining(['Critical error']),
        })
      );
    });
  });
}); 