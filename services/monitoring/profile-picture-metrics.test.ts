import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfilePictureMetrics } from './profile-picture-metrics';

describe('ProfilePictureMetrics', () => {
  const mockMetricsClient = {
    recordHistogram: vi.fn(),
    incrementCounter: vi.fn(),
    queryMetrics: vi.fn(),
  };

  const mockStorageMetrics = {
    trackUsage: vi.fn(),
    getUsageMetrics: vi.fn(),
  };

  const mockCDNMetrics = {
    trackDelivery: vi.fn(),
  };

  let metrics: ProfilePictureMetrics;

  beforeEach(() => {
    vi.clearAllMocks();
    metrics = new ProfilePictureMetrics(
      mockMetricsClient as any,
      mockStorageMetrics as any,
      mockCDNMetrics as any
    );
  });

  describe('trackUpload', () => {
    it('should track successful upload metrics', async () => {
      const uploadMetrics = {
        uploadStartTime: 1000,
        processingStartTime: 1100,
        processingEndTime: 1300,
        uploadEndTime: 1500,
        fileSize: 1024,
        success: true,
      };

      await metrics.trackUpload(uploadMetrics);

      // Check duration calculations
      expect(mockMetricsClient.recordHistogram).toHaveBeenCalledWith(
        'profile_picture.upload.duration',
        300, // (1500 - 1000) - (1300 - 1100) = 300
        { success: 'true', error_type: 'none' }
      );

      expect(mockMetricsClient.recordHistogram).toHaveBeenCalledWith(
        'profile_picture.processing.duration',
        200, // 1300 - 1100 = 200
        { success: 'true' }
      );

      expect(mockMetricsClient.recordHistogram).toHaveBeenCalledWith(
        'profile_picture.file.size',
        1024
      );

      expect(mockStorageMetrics.trackUsage).toHaveBeenCalledWith({
        operation: 'upload',
        sizeBytes: 1024,
        success: true,
      });
    });

    it('should track failed upload metrics', async () => {
      const uploadMetrics = {
        uploadStartTime: 1000,
        processingStartTime: 1100,
        processingEndTime: 1300,
        uploadEndTime: 1500,
        fileSize: 1024,
        success: false,
        errorType: 'validation_error',
      };

      await metrics.trackUpload(uploadMetrics);

      expect(mockMetricsClient.incrementCounter).toHaveBeenCalledWith(
        'profile_picture.upload.errors',
        { error_type: 'validation_error' }
      );
    });
  });

  describe('trackDelivery', () => {
    it('should track successful delivery metrics with cache hit', async () => {
      const deliveryMetrics = {
        requestTime: 1000,
        responseTime: 1100,
        cacheHit: true,
        cdnRegion: 'us-east-1',
        fileSize: 1024,
        statusCode: 200,
      };

      await metrics.trackDelivery(deliveryMetrics);

      expect(mockMetricsClient.recordHistogram).toHaveBeenCalledWith(
        'profile_picture.delivery.latency',
        100,
        {
          cache_hit: 'true',
          cdn_region: 'us-east-1',
          status_code: '200',
        }
      );

      expect(mockMetricsClient.incrementCounter).toHaveBeenCalledWith(
        'profile_picture.cdn.cache_hits',
        { cdn_region: 'us-east-1' }
      );

      expect(mockCDNMetrics.trackDelivery).toHaveBeenCalledWith({
        region: 'us-east-1',
        cacheHit: true,
        latency: 100,
        sizeBytes: 1024,
      });
    });

    it('should track delivery metrics with cache miss', async () => {
      const deliveryMetrics = {
        requestTime: 1000,
        responseTime: 1200,
        cacheHit: false,
        cdnRegion: 'us-east-1',
        fileSize: 1024,
        statusCode: 200,
      };

      await metrics.trackDelivery(deliveryMetrics);

      expect(mockMetricsClient.incrementCounter).toHaveBeenCalledWith(
        'profile_picture.cdn.cache_misses',
        { cdn_region: 'us-east-1' }
      );
    });
  });

  describe('getAggregatedMetrics', () => {
    it('should return aggregated metrics', async () => {
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-02'),
      };

      const mockUploadMetrics = {
        upload: {
          count: 100,
          duration: { avg: 150, p95: 300 },
          errors: { rate: 0.05 },
        },
        file: {
          size: { avg: 1024 },
        },
      };

      const mockDeliveryMetrics = {
        delivery: {
          count: 1000,
          latency: { avg: 50, p95: 100 },
          size: { sum: 102400 },
        },
        cdn: {
          cache_hits: { rate: 0.95 },
        },
      };

      const mockStorageStats = {
        totalSize: 102400,
        fileCount: 100,
        growthRate: 0.1,
      };

      mockMetricsClient.queryMetrics
        .mockResolvedValueOnce(mockUploadMetrics)
        .mockResolvedValueOnce(mockDeliveryMetrics);
      mockStorageMetrics.getUsageMetrics.mockResolvedValue(mockStorageStats);

      const result = await metrics.getAggregatedMetrics(timeRange);

      expect(result).toEqual({
        uploads: {
          total: 100,
          avgDuration: 150,
          p95Duration: 300,
          errorRate: 0.05,
          avgSize: 1024,
        },
        delivery: {
          totalRequests: 1000,
          avgLatency: 50,
          p95Latency: 100,
          cacheHitRate: 0.95,
          bandwidthUsage: 102400,
        },
        storage: {
          totalSize: 102400,
          fileCount: 100,
          growthRate: 0.1,
        },
      });
    });
  });
}); 