import { EventEmitter } from 'events';
import { HIPAACompliantAuditService } from '../HIPAACompliantAuditService';
import { SecurityAuditService } from '../SecurityAuditService';
import { QualityMetricsService } from '../QualityMetricsService';
import { Resource } from '@/types/fhir';

interface BatchJob {
  id: string;
  type: 'import' | 'export' | 'sync';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high';
  resources: Resource[];
  totalItems: number;
  processedItems: number;
  errors: Error[];
  startTime?: Date;
  endTime?: Date;
  retryCount: number;
  maxRetries: number;
}

interface BatchJobConfig {
  type: BatchJob['type'];
  priority: BatchJob['priority'];
  resources: Resource[];
  maxRetries?: number;
}

interface BatchJobStatus {
  id: string;
  status: BatchJob['status'];
  progress: number;
  errors: Error[];
  startTime?: Date;
  endTime?: Date;
}

export class BatchProcessingService extends EventEmitter {
  private jobs: Map<string, BatchJob>;
  private processingQueue: string[];
  private readonly MAX_CONCURRENT_JOBS = 5;
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 5000, 15000]; // Exponential backoff

  constructor(
    private readonly hipaaAuditService: HIPAACompliantAuditService,
    private readonly securityAuditService: SecurityAuditService,
    private readonly qualityMetricsService: QualityMetricsService
  ) {
    super();
    this.jobs = new Map();
    this.processingQueue = [];

    // Start processing loop
    this.processNextJob();
  }

  async submitJob(jobId: string, config: BatchJobConfig): Promise<string> {
    if (this.jobs.has(jobId)) {
      throw new Error(`Job ${jobId} already exists`);
    }

    const job: BatchJob = {
      id: jobId,
      type: config.type,
      status: 'queued',
      priority: config.priority,
      resources: config.resources,
      totalItems: config.resources.length,
      processedItems: 0,
      errors: [],
      retryCount: 0,
      maxRetries: config.maxRetries ?? this.DEFAULT_MAX_RETRIES,
    };

    this.jobs.set(jobId, job);
    this.processingQueue.push(jobId);
    this.sortQueueByPriority();

    await this.hipaaAuditService.logEvent({
      eventType: 'SYSTEM_OPERATION',
      action: {
        type: 'CREATE',
        status: 'SUCCESS',
        details: {
          operation: 'SUBMIT_BATCH_JOB',
          jobId,
          jobType: config.type,
        },
      },
    });

    await this.qualityMetricsService.recordMetric('batch_job_submitted', {
      jobId,
      type: config.type,
      priority: config.priority,
      itemCount: config.resources.length,
    });

    this.emit('jobSubmitted', { jobId, config });
    return jobId;
  }

  getJobStatus(jobId: string): BatchJobStatus | null {
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      status: job.status,
      progress: (job.processedItems / job.totalItems) * 100,
      errors: job.errors,
      startTime: job.startTime,
      endTime: job.endTime,
    };
  }

  async cancelJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status === 'completed' || job.status === 'failed') {
      throw new Error(`Cannot cancel job ${jobId} in status ${job.status}`);
    }

    job.status = 'failed';
    job.errors.push(new Error('Job cancelled by user'));
    job.endTime = new Date();

    await this.hipaaAuditService.logEvent({
      eventType: 'SYSTEM_OPERATION',
      action: {
        type: 'UPDATE',
        status: 'SUCCESS',
        details: {
          operation: 'CANCEL_BATCH_JOB',
          jobId,
        },
      },
    });

    await this.qualityMetricsService.recordMetric('batch_job_cancelled', {
      jobId,
      type: job.type,
      processedItems: job.processedItems,
      totalItems: job.totalItems,
    });

    this.emit('jobCancelled', { jobId });
  }

  private sortQueueByPriority(): void {
    this.processingQueue.sort((a, b) => {
      const jobA = this.jobs.get(a)!;
      const jobB = this.jobs.get(b)!;
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[jobA.priority] - priorityOrder[jobB.priority];
    });
  }

  private async processNextJob(): Promise<void> {
    while (true) {
      const activeJobs = Array.from(this.jobs.values()).filter(
        job => job.status === 'processing'
      );

      if (
        activeJobs.length < this.MAX_CONCURRENT_JOBS &&
        this.processingQueue.length > 0
      ) {
        const jobId = this.processingQueue.shift()!;
        const job = this.jobs.get(jobId)!;

        if (job.status === 'queued') {
          await this.processJob(job);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 100)); // Prevent CPU spinning
    }
  }

  private async processJob(job: BatchJob): Promise<void> {
    job.status = 'processing';
    job.startTime = new Date();

    this.emit('jobStarted', { jobId: job.id });

    try {
      for (const resource of job.resources) {
        try {
          await this.processResource(job, resource);
          job.processedItems++;

          await this.qualityMetricsService.recordMetric('batch_job_progress', {
            jobId: job.id,
            progress: (job.processedItems / job.totalItems) * 100,
          });

          this.emit('jobProgress', {
            jobId: job.id,
            progress: (job.processedItems / job.totalItems) * 100,
          });
        } catch (error) {
          job.errors.push(error as Error);
          await this.handleResourceError(job, resource, error as Error);
        }
      }

      if (job.errors.length === 0) {
        job.status = 'completed';
        await this.handleJobCompletion(job);
      } else {
        job.status = 'failed';
        await this.handleJobFailure(job);
      }
    } catch (error) {
      job.status = 'failed';
      job.errors.push(error as Error);
      await this.handleJobFailure(job);
    } finally {
      job.endTime = new Date();
    }
  }

  private async processResource(job: BatchJob, resource: Resource): Promise<void> {
    switch (job.type) {
      case 'import':
        // Implementation for import
        break;
      case 'export':
        // Implementation for export
        break;
      case 'sync':
        // Implementation for sync
        break;
      default:
        throw new Error(`Unsupported job type: ${job.type}`);
    }
  }

  private async handleResourceError(
    job: BatchJob,
    resource: Resource,
    error: Error
  ): Promise<void> {
    if (job.retryCount < job.maxRetries) {
      job.retryCount++;
      const delay = this.RETRY_DELAYS[job.retryCount - 1] || this.RETRY_DELAYS[this.RETRY_DELAYS.length - 1];
      
      await this.qualityMetricsService.recordMetric('batch_job_retry', {
        jobId: job.id,
        resourceId: resource.id,
        retryCount: job.retryCount,
        error: error.message,
      });

      await new Promise(resolve => setTimeout(resolve, delay));
      await this.processResource(job, resource);
    } else {
      await this.securityAuditService.recordAlert(
        'BATCH_PROCESSING_ERROR',
        'HIGH',
        {
          jobId: job.id,
          resourceId: resource.id,
          error: error.message,
        }
      );
    }
  }

  private async handleJobCompletion(job: BatchJob): Promise<void> {
    await this.hipaaAuditService.logEvent({
      eventType: 'SYSTEM_OPERATION',
      action: {
        type: 'UPDATE',
        status: 'SUCCESS',
        details: {
          operation: 'COMPLETE_BATCH_JOB',
          jobId: job.id,
          processedItems: job.processedItems,
        },
      },
    });

    await this.qualityMetricsService.recordMetric('batch_job_completed', {
      jobId: job.id,
      type: job.type,
      processedItems: job.processedItems,
      totalItems: job.totalItems,
      duration: job.endTime!.getTime() - job.startTime!.getTime(),
    });

    this.emit('jobCompleted', {
      jobId: job.id,
      processedItems: job.processedItems,
      totalItems: job.totalItems,
    });
  }

  private async handleJobFailure(job: BatchJob): Promise<void> {
    await this.hipaaAuditService.logEvent({
      eventType: 'SYSTEM_OPERATION',
      action: {
        type: 'UPDATE',
        status: 'FAILURE',
        details: {
          operation: 'FAIL_BATCH_JOB',
          jobId: job.id,
          errors: job.errors.map(e => e.message),
        },
      },
    });

    await this.securityAuditService.recordAlert(
      'BATCH_JOB_FAILED',
      'HIGH',
      {
        jobId: job.id,
        type: job.type,
        errors: job.errors.map(e => e.message),
      }
    );

    await this.qualityMetricsService.recordMetric('batch_job_failed', {
      jobId: job.id,
      type: job.type,
      processedItems: job.processedItems,
      totalItems: job.totalItems,
      errors: job.errors.map(e => e.message),
      duration: job.endTime!.getTime() - job.startTime!.getTime(),
    });

    this.emit('jobFailed', {
      jobId: job.id,
      errors: job.errors,
      processedItems: job.processedItems,
      totalItems: job.totalItems,
    });
  }
}