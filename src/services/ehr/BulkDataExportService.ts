import { EventEmitter } from 'events';
import { HIPAACompliantAuditService } from '../HIPAACompliantAuditService';
import { SecurityAuditService } from '../SecurityAuditService';
import { QualityMetricsService } from '../QualityMetricsService';
import { Resource } from '@/types/fhir';

interface ExportConfig {
  resourceTypes: string[];
  format: 'json' | 'ndjson';
  since?: Date;
  types?: string[];
  chunkSize?: number;
  maxRetries?: number;
}

interface ExportJob {
  id: string;
  config: ExportConfig;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    processed: number;
    failed: number;
    currentChunk: number;
    totalChunks: number;
  };
  errors: Error[];
  startTime?: Date;
  endTime?: Date;
  outputFiles: string[];
  retryCount: number;
}

interface ChunkResult {
  resources: Resource[];
  hasMore: boolean;
  nextCursor?: string;
}

export class BulkDataExportService extends EventEmitter {
  private jobs: Map<string, ExportJob>;
  private readonly DEFAULT_CHUNK_SIZE = 1000;
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 5000, 15000]; // Exponential backoff

  constructor(
    private readonly hipaaAuditService: HIPAACompliantAuditService,
    private readonly securityAuditService: SecurityAuditService,
    private readonly qualityMetricsService: QualityMetricsService
  ) {
    super();
    this.jobs = new Map();
  }

  async startExport(jobId: string, config: ExportConfig): Promise<string> {
    if (this.jobs.has(jobId)) {
      throw new Error(`Export job ${jobId} already exists`);
    }

    const job: ExportJob = {
      id: jobId,
      config: {
        ...config,
        chunkSize: config.chunkSize || this.DEFAULT_CHUNK_SIZE,
        maxRetries: config.maxRetries || this.DEFAULT_MAX_RETRIES,
      },
      status: 'queued',
      progress: {
        total: 0,
        processed: 0,
        failed: 0,
        currentChunk: 0,
        totalChunks: 0,
      },
      errors: [],
      outputFiles: [],
      retryCount: 0,
    };

    this.jobs.set(jobId, job);

    await this.hipaaAuditService.logEvent({
      eventType: 'SYSTEM_OPERATION',
      action: {
        type: 'CREATE',
        status: 'SUCCESS',
        details: {
          operation: 'START_BULK_EXPORT',
          jobId,
          config,
        },
      },
    });

    await this.qualityMetricsService.recordMetric('bulk_export_started', {
      jobId,
      resourceTypes: config.resourceTypes,
      format: config.format,
    });

    this.emit('exportStarted', { jobId, config });

    // Start processing in background
    this.processExport(job).catch(error => {
      this.handleExportError(job, error);
    });

    return jobId;
  }

  getJobStatus(jobId: string): ExportJob | null {
    return this.jobs.get(jobId) || null;
  }

  async cancelExport(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Export job ${jobId} not found`);
    }

    if (job.status === 'completed' || job.status === 'failed') {
      throw new Error(`Cannot cancel job ${jobId} in status ${job.status}`);
    }

    job.status = 'failed';
    job.errors.push(new Error('Export cancelled by user'));
    job.endTime = new Date();

    await this.hipaaAuditService.logEvent({
      eventType: 'SYSTEM_OPERATION',
      action: {
        type: 'UPDATE',
        status: 'SUCCESS',
        details: {
          operation: 'CANCEL_BULK_EXPORT',
          jobId,
        },
      },
    });

    await this.qualityMetricsService.recordMetric('bulk_export_cancelled', {
      jobId,
      processedResources: job.progress.processed,
      failedResources: job.progress.failed,
    });

    this.emit('exportCancelled', { jobId });
  }

  private async processExport(job: ExportJob): Promise<void> {
    try {
      job.status = 'processing';
      job.startTime = new Date();

      this.emit('exportProcessing', { jobId: job.id });

      // Calculate total resources and chunks
      job.progress.total = await this.countResources(job.config);
      job.progress.totalChunks = Math.ceil(
        job.progress.total / job.config.chunkSize!
      );

      let cursor: string | undefined;
      let hasMore = true;

      while (hasMore && job.status === 'processing') {
        job.progress.currentChunk++;

        const chunkResult = await this.processChunk(job, cursor);
        hasMore = chunkResult.hasMore;
        cursor = chunkResult.nextCursor;

        if (chunkResult.resources.length > 0) {
          const outputFile = await this.writeChunkToFile(
            job,
            chunkResult.resources
          );
          job.outputFiles.push(outputFile);
        }

        await this.updateProgress(job);
      }

      if (job.status === 'processing') {
        await this.completeExport(job);
      }
    } catch (error) {
      await this.handleExportError(job, error as Error);
    }
  }

  private async processChunk(
    job: ExportJob,
    cursor?: string
  ): Promise<ChunkResult> {
    try {
      // Implementation would depend on the specific FHIR server and client
      // This is a placeholder for the actual implementation
      const resources: Resource[] = [];
      const hasMore = false;
      const nextCursor = undefined;

      job.progress.processed += resources.length;

      return { resources, hasMore, nextCursor };
    } catch (error) {
      if (job.retryCount < job.config.maxRetries!) {
        job.retryCount++;
        const delay = this.RETRY_DELAYS[job.retryCount - 1] || this.RETRY_DELAYS[this.RETRY_DELAYS.length - 1];

        await this.qualityMetricsService.recordMetric('bulk_export_retry', {
          jobId: job.id,
          chunk: job.progress.currentChunk,
          retryCount: job.retryCount,
          error: (error as Error).message,
        });

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.processChunk(job, cursor);
      }

      throw error;
    }
  }

  private async writeChunkToFile(
    job: ExportJob,
    resources: Resource[]
  ): Promise<string> {
    try {
      // Implementation would depend on the storage system
      // This is a placeholder for the actual implementation
      const filename = `export_${job.id}_chunk_${job.progress.currentChunk}.${job.config.format}`;

      // Format and write resources to file
      if (job.config.format === 'ndjson') {
        // Write each resource as a newline-delimited JSON
        const content = resources
          .map(resource => JSON.stringify(resource))
          .join('\n');
        // await fs.writeFile(filename, content);
      } else {
        // Write as regular JSON array
        const content = JSON.stringify(resources, null, 2);
        // await fs.writeFile(filename, content);
      }

      return filename;
    } catch (error) {
      throw new Error(`Failed to write chunk to file: ${error.message}`);
    }
  }

  private async countResources(config: ExportConfig): Promise<number> {
    // Implementation would depend on the specific FHIR server and client
    // This is a placeholder for the actual implementation
    return 1000;
  }

  private async updateProgress(job: ExportJob): Promise<void> {
    await this.qualityMetricsService.recordMetric('bulk_export_progress', {
      jobId: job.id,
      processed: job.progress.processed,
      failed: job.progress.failed,
      currentChunk: job.progress.currentChunk,
      totalChunks: job.progress.totalChunks,
    });

    this.emit('exportProgress', {
      jobId: job.id,
      progress: job.progress,
    });
  }

  private async completeExport(job: ExportJob): Promise<void> {
    job.status = 'completed';
    job.endTime = new Date();

    await this.hipaaAuditService.logEvent({
      eventType: 'SYSTEM_OPERATION',
      action: {
        type: 'UPDATE',
        status: 'SUCCESS',
        details: {
          operation: 'COMPLETE_BULK_EXPORT',
          jobId: job.id,
          processedResources: job.progress.processed,
          outputFiles: job.outputFiles,
        },
      },
    });

    await this.qualityMetricsService.recordMetric('bulk_export_completed', {
      jobId: job.id,
      processedResources: job.progress.processed,
      failedResources: job.progress.failed,
      duration: job.endTime.getTime() - job.startTime!.getTime(),
      outputFiles: job.outputFiles.length,
    });

    this.emit('exportCompleted', {
      jobId: job.id,
      outputFiles: job.outputFiles,
      stats: {
        processed: job.progress.processed,
        failed: job.progress.failed,
        duration: job.endTime.getTime() - job.startTime!.getTime(),
      },
    });
  }

  private async handleExportError(job: ExportJob, error: Error): Promise<void> {
    job.status = 'failed';
    job.errors.push(error);
    job.endTime = new Date();

    await this.hipaaAuditService.logEvent({
      eventType: 'SYSTEM_OPERATION',
      action: {
        type: 'UPDATE',
        status: 'FAILURE',
        details: {
          operation: 'FAIL_BULK_EXPORT',
          jobId: job.id,
          error: error.message,
        },
      },
    });

    await this.securityAuditService.recordAlert(
      'BULK_EXPORT_FAILED',
      'HIGH',
      {
        jobId: job.id,
        error: error.message,
        processedResources: job.progress.processed,
        failedResources: job.progress.failed,
      }
    );

    await this.qualityMetricsService.recordMetric('bulk_export_failed', {
      jobId: job.id,
      error: error.message,
      processedResources: job.progress.processed,
      failedResources: job.progress.failed,
      duration: job.endTime.getTime() - job.startTime!.getTime(),
    });

    this.emit('exportFailed', {
      jobId: job.id,
      error,
      stats: {
        processed: job.progress.processed,
        failed: job.progress.failed,
        duration: job.endTime.getTime() - job.startTime!.getTime(),
      },
    });
  }
} 