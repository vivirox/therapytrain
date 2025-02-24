import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AdvancedAnalyticsService } from '../AdvancedAnalyticsService';
import {
  setupAnalyticsMocks,
  resetAnalyticsMocks,
  generateTestEvent,
  generateTestSummary,
} from '@/lib/test/analytics-utils';

// Mock dependencies
vi.mock('../analytics', () => ({
  AnalyticsService: {
    getInstance: vi.fn(() => ({
      getLearningMetrics: vi.fn().mockResolvedValue({
        engagementRate: 0.75,
        completionRate: 0.85,
        averageScore: 88,
        timeSpent: 3600,
      }),
    })),
  },
}));

vi.mock('../DashboardService', () => ({
  DashboardService: {
    getInstance: vi.fn(() => ({
      updateMetrics: vi.fn(),
      refreshDashboard: vi.fn(),
    })),
  },
}));

vi.mock('../MonitoringService', () => ({
  MonitoringService: {
    getInstance: vi.fn(() => ({
      recordMetric: vi.fn(),
      checkThresholds: vi.fn(),
    })),
  },
}));

vi.mock('../SmartCacheService', () => ({
  SmartCacheService: {
    getInstance: vi.fn(() => ({
      get: vi.fn(),
      set: vi.fn(),
      invalidate: vi.fn(),
    })),
  },
}));

describe('AdvancedAnalyticsService', () => {
  let advancedAnalytics: AdvancedAnalyticsService;

  beforeEach(() => {
    setupAnalyticsMocks();
    vi.useFakeTimers();
    advancedAnalytics = AdvancedAnalyticsService.getInstance();
  });

  afterEach(() => {
    resetAnalyticsMocks();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Analysis', () => {
    it('should perform periodic analysis', async () => {
      const analysisCompleteSpy = vi.fn();
      advancedAnalytics.on('analysis:complete', analysisCompleteSpy);

      // Advance timer by analysis interval
      await vi.advanceTimersByTimeAsync(300000); // 5 minutes

      expect(analysisCompleteSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          metrics: expect.any(Object),
          insights: expect.any(Array),
          trends: expect.any(Array),
        })
      );
    });

    it('should analyze learning patterns', async () => {
      await advancedAnalytics.analyzeLearningPatterns();

      expect(advancedAnalytics.getMetrics().learning).toEqual(
        expect.objectContaining({
          engagementScore: expect.any(Number),
          retentionRate: expect.any(Number),
          skillGrowthRate: expect.any(Number),
          learningEfficiency: expect.any(Number),
        })
      );
    });

    it('should detect trends', async () => {
      // Simulate metrics over time
      const metrics = [
        { value: 100, timestamp: new Date(Date.now() - 3600000 * 3) },
        { value: 110, timestamp: new Date(Date.now() - 3600000 * 2) },
        { value: 120, timestamp: new Date(Date.now() - 3600000) },
        { value: 130, timestamp: new Date() },
      ];

      for (const metric of metrics) {
        await advancedAnalytics.recordMetric('test_metric', metric.value, metric.timestamp);
      }

      const trends = advancedAnalytics.getTrends();
      expect(trends.get('test_metric')).toEqual(
        expect.objectContaining({
          trend: 'increasing',
          changeRate: expect.any(Number),
          confidence: expect.any(Number),
        })
      );
    });

    it('should generate insights', async () => {
      // Simulate anomalous metrics
      await advancedAnalytics.recordMetric('error_rate', 0.5); // High error rate
      await advancedAnalytics.recordMetric('response_time', 5000); // High response time

      const insights = advancedAnalytics.getInsights();
      expect(insights).toContainEqual(
        expect.objectContaining({
          type: 'performance_issue',
          severity: 'high',
          message: expect.any(String),
        })
      );
    });
  });

  describe('Metrics', () => {
    it('should track performance metrics', async () => {
      await advancedAnalytics.recordMetric('response_time', 100);
      await advancedAnalytics.recordMetric('error_rate', 0.01);
      await advancedAnalytics.recordMetric('cpu_usage', 0.45);

      const metrics = advancedAnalytics.getMetrics();
      expect(metrics.performance).toEqual(
        expect.objectContaining({
          responseTime: expect.any(Number),
          errorRate: expect.any(Number),
          cpuUsage: expect.any(Number),
        })
      );
    });

    it('should track user engagement metrics', async () => {
      await advancedAnalytics.recordMetric('active_users', 1000);
      await advancedAnalytics.recordMetric('session_duration', 1800);
      await advancedAnalytics.recordMetric('interaction_rate', 0.8);

      const metrics = advancedAnalytics.getMetrics();
      expect(metrics.engagement).toEqual(
        expect.objectContaining({
          activeUsers: expect.any(Number),
          sessionDuration: expect.any(Number),
          interactionRate: expect.any(Number),
        })
      );
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect performance anomalies', async () => {
      // Simulate normal metrics
      for (let i = 0; i < 10; i++) {
        await advancedAnalytics.recordMetric('response_time', 100 + Math.random() * 20);
      }

      // Simulate anomaly
      await advancedAnalytics.recordMetric('response_time', 500);

      const insights = advancedAnalytics.getInsights();
      expect(insights).toContainEqual(
        expect.objectContaining({
          type: 'anomaly_detected',
          severity: 'high',
          message: expect.stringContaining('response_time'),
        })
      );
    });

    it('should detect usage anomalies', async () => {
      // Simulate normal metrics
      for (let i = 0; i < 10; i++) {
        await advancedAnalytics.recordMetric('active_users', 1000 + Math.random() * 100);
      }

      // Simulate anomaly
      await advancedAnalytics.recordMetric('active_users', 100);

      const insights = advancedAnalytics.getInsights();
      expect(insights).toContainEqual(
        expect.objectContaining({
          type: 'anomaly_detected',
          severity: 'medium',
          message: expect.stringContaining('active_users'),
        })
      );
    });
  });

  describe('Trend Analysis', () => {
    it('should predict future metrics', async () => {
      // Simulate metrics over time
      const timestamps = Array.from({ length: 24 }, (_, i) => 
        new Date(Date.now() - (23 - i) * 3600000)
      );

      for (const timestamp of timestamps) {
        await advancedAnalytics.recordMetric(
          'active_users',
          1000 + Math.sin(timestamp.getHours() * Math.PI / 12) * 200,
          timestamp
        );
      }

      const trends = advancedAnalytics.getTrends();
      const activeUsersTrend = trends.get('active_users');

      expect(activeUsersTrend).toBeDefined();
      expect(activeUsersTrend?.prediction).toBeDefined();
      expect(typeof activeUsersTrend?.prediction).toBe('number');
    });

    it('should detect seasonal patterns', async () => {
      // Simulate daily pattern over a week
      const timestamps = Array.from({ length: 168 }, (_, i) => 
        new Date(Date.now() - (167 - i) * 3600000)
      );

      for (const timestamp of timestamps) {
        const hour = timestamp.getHours();
        const baseValue = 1000;
        const timeOfDay = Math.sin(hour * Math.PI / 12) * 200;
        const dayOfWeek = Math.sin(timestamp.getDay() * Math.PI / 3.5) * 100;

        await advancedAnalytics.recordMetric(
          'user_activity',
          baseValue + timeOfDay + dayOfWeek,
          timestamp
        );
      }

      const patterns = advancedAnalytics.getSeasonalPatterns();
      expect(patterns.get('user_activity')).toEqual(
        expect.objectContaining({
          daily: expect.any(Object),
          weekly: expect.any(Object),
        })
      );
    });
  });

  describe('Event Handling', () => {
    it('should emit events on significant changes', async () => {
      const changeDetectedSpy = vi.fn();
      advancedAnalytics.on('significant_change', changeDetectedSpy);

      // Simulate sudden change
      for (let i = 0; i < 10; i++) {
        await advancedAnalytics.recordMetric('conversion_rate', 0.2);
      }
      await advancedAnalytics.recordMetric('conversion_rate', 0.4);

      expect(changeDetectedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          metric: 'conversion_rate',
          change: expect.any(Number),
          significance: expect.any(Number),
        })
      );
    });

    it('should handle error conditions', async () => {
      const errorSpy = vi.fn();
      advancedAnalytics.on('error', errorSpy);

      // Simulate error condition
      await advancedAnalytics.recordMetric('invalid_metric', NaN);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'invalid_metric',
          message: expect.any(String),
        })
      );
    });
  });
}); 