import { MetricsClient } from '@/lib/metrics';
import { StorageMetrics } from '@/lib/storage';
import { CDNMetrics } from '@/lib/cdn';

interface UploadMetrics {
  uploadStartTime: number;
  processingStartTime: number;
  processingEndTime: number;
  uploadEndTime: number;
  fileSize: number;
  success: boolean;
  errorType?: string;
}

interface DeliveryMetrics {
  requestTime: number;
  responseTime: number;
  cacheHit: boolean;
  cdnRegion: string;
  fileSize: number;
  statusCode: number;
}

export class ProfilePictureMetrics {
  private metricsClient: MetricsClient;
  private storageMetrics: StorageMetrics;
  private cdnMetrics: CDNMetrics;

  constructor(
    metricsClient: MetricsClient,
    storageMetrics: StorageMetrics,
    cdnMetrics: CDNMetrics
  ) {
    this.metricsClient = metricsClient;
    this.storageMetrics = storageMetrics;
    this.cdnMetrics = cdnMetrics;
  }

  async trackUpload(metrics: UploadMetrics) {
    // Calculate durations
    const totalDuration = metrics.uploadEndTime - metrics.uploadStartTime;
    const processingDuration = metrics.processingEndTime - metrics.processingStartTime;
    const uploadDuration = totalDuration - processingDuration;

    // Track upload metrics
    await this.metricsClient.recordHistogram('profile_picture.upload.duration', uploadDuration, {
      success: String(metrics.success),
      error_type: metrics.errorType || 'none',
    });

    await this.metricsClient.recordHistogram('profile_picture.processing.duration', processingDuration, {
      success: String(metrics.success),
    });

    await this.metricsClient.recordHistogram('profile_picture.file.size', metrics.fileSize);

    if (!metrics.success) {
      await this.metricsClient.incrementCounter('profile_picture.upload.errors', {
        error_type: metrics.errorType || 'unknown',
      });
    }

    // Track storage metrics
    await this.storageMetrics.trackUsage({
      operation: 'upload',
      sizeBytes: metrics.fileSize,
      success: metrics.success,
    });
  }

  async trackDelivery(metrics: DeliveryMetrics) {
    const latency = metrics.responseTime - metrics.requestTime;

    // Track CDN metrics
    await this.metricsClient.recordHistogram('profile_picture.delivery.latency', latency, {
      cache_hit: String(metrics.cacheHit),
      cdn_region: metrics.cdnRegion,
      status_code: String(metrics.statusCode),
    });

    await this.metricsClient.recordHistogram('profile_picture.delivery.size', metrics.fileSize, {
      cdn_region: metrics.cdnRegion,
    });

    if (metrics.cacheHit) {
      await this.metricsClient.incrementCounter('profile_picture.cdn.cache_hits', {
        cdn_region: metrics.cdnRegion,
      });
    } else {
      await this.metricsClient.incrementCounter('profile_picture.cdn.cache_misses', {
        cdn_region: metrics.cdnRegion,
      });
    }

    // Track CDN-specific metrics
    await this.cdnMetrics.trackDelivery({
      region: metrics.cdnRegion,
      cacheHit: metrics.cacheHit,
      latency,
      sizeBytes: metrics.fileSize,
    });
  }

  async getAggregatedMetrics(timeRange: { start: Date; end: Date }) {
    const [uploadMetrics, deliveryMetrics, storageMetrics] = await Promise.all([
      this.metricsClient.queryMetrics('profile_picture.upload.*', timeRange),
      this.metricsClient.queryMetrics('profile_picture.delivery.*', timeRange),
      this.storageMetrics.getUsageMetrics(timeRange),
    ]);

    return {
      uploads: {
        total: uploadMetrics.upload.count,
        avgDuration: uploadMetrics.upload.duration.avg,
        p95Duration: uploadMetrics.upload.duration.p95,
        errorRate: uploadMetrics.upload.errors.rate,
        avgSize: uploadMetrics.file.size.avg,
      },
      delivery: {
        totalRequests: deliveryMetrics.delivery.count,
        avgLatency: deliveryMetrics.delivery.latency.avg,
        p95Latency: deliveryMetrics.delivery.latency.p95,
        cacheHitRate: deliveryMetrics.cdn.cache_hits.rate,
        bandwidthUsage: deliveryMetrics.delivery.size.sum,
      },
      storage: {
        totalSize: storageMetrics.totalSize,
        fileCount: storageMetrics.fileCount,
        growthRate: storageMetrics.growthRate,
      },
    };
  }
} 