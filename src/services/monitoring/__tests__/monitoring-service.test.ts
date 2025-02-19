import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MonitoringService } from '../MonitoringService';
import {
  setupMonitoringMocks,
  resetMonitoringMocks,
  generateTestMetrics,
  generateTestSessionMetrics,
  generateTestNodeMetrics,
  generateMetricsHistory,
  generateSessionMetricsData,
  generateNodeMetricsData,
  expectMetricsToBeValid,
  expectSessionMetricsToBeValid,
  expectNodeMetricsToBeValid,
  simulateMetricsError,
  simulateHighLatency,
  simulateLowHitRate,
  simulateHighErrorRate,
} from '@/lib/test/monitoring-utils';

// Mock Redis service
vi.mock('@/services/RedisService', () => ({
  RedisService: {
    getInstance: vi.fn(() => ({
      getMetrics: vi.fn(() => generateTestMetrics()),
    })),
  },
}));

describe('MonitoringService', () => {
  let monitoringService: MonitoringService;

  beforeEach(() => {
    setupMonitoringMocks();
    vi.useFakeTimers();
    monitoringService = MonitoringService.getInstance();
  });

  afterEach(() => {
    resetMonitoringMocks();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Metrics Collection', () => {
    it('should collect current metrics', () => {
      const metrics = monitoringService.getCurrentMetrics();
      expectMetricsToBeValid(metrics);
    });

    it('should maintain metrics history', async () => {
      // Simulate metrics collection over time
      for (let i = 0; i < 10; i++) {
        await vi.advanceTimersByTimeAsync(60000); // 1 minute
      }

      const history = monitoringService.getMetricsHistory();
      expect(history.length).toBeGreaterThan(0);
      history.forEach(({ timestamp, metrics }) => {
        expect(timestamp).toBeGreaterThan(0);
        expectMetricsToBeValid(metrics);
      });
    });

    it('should limit metrics history length', async () => {
      // Generate more metrics than the history limit
      for (let i = 0; i < 2000; i++) {
        await vi.advanceTimersByTimeAsync(60000); // 1 minute
      }

      const history = monitoringService.getMetricsHistory();
      expect(history.length).toBeLessThanOrEqual(1000); // maxHistoryLength
    });
  });

  describe('Session Monitoring', () => {
    it('should track session metrics', () => {
      const sessionId = 'test-session';
      const nodeId = 'node-1';

      // Simulate session activity
      monitoringService.recordSessionOperation(sessionId, nodeId, 50); // 50ms latency
      monitoringService.recordSessionError(sessionId, new Error('Test error'));

      const metrics = monitoringService.getSessionMetrics(sessionId);
      expect(metrics).toBeDefined();
      expectSessionMetricsToBeValid(metrics!);
      expect(metrics!.operations).toBe(1);
      expect(metrics!.errors).toBe(1);
      expect(metrics!.latency).toContain(50);
    });

    it('should handle multiple sessions', () => {
      const sessions = generateSessionMetricsData(5);
      sessions.forEach((metrics, sessionId) => {
        const nodeId = metrics.nodeId;
        metrics.latency.forEach(latency => {
          monitoringService.recordSessionOperation(sessionId, nodeId, latency);
        });
        for (let i = 0; i < metrics.errors; i++) {
          monitoringService.recordSessionError(sessionId, new Error('Test error'));
        }
      });

      sessions.forEach((_, sessionId) => {
        const metrics = monitoringService.getSessionMetrics(sessionId);
        expect(metrics).toBeDefined();
        expectSessionMetricsToBeValid(metrics!);
      });
    });

    it('should cleanup inactive sessions', async () => {
      const sessionId = 'test-session';
      const nodeId = 'node-1';

      monitoringService.recordSessionOperation(sessionId, nodeId, 50);
      
      // Advance time beyond session timeout
      await vi.advanceTimersByTimeAsync(3600000); // 1 hour

      const metrics = monitoringService.getSessionMetrics(sessionId);
      expect(metrics).toBeNull();
    });
  });

  describe('Node Monitoring', () => {
    it('should track node metrics', () => {
      const nodeId = 'node-1';
      const sessions = generateSessionMetricsData(3);

      sessions.forEach((metrics, sessionId) => {
        metrics.latency.forEach(latency => {
          monitoringService.recordSessionOperation(sessionId, nodeId, latency);
        });
        for (let i = 0; i < metrics.errors; i++) {
          monitoringService.recordSessionError(sessionId, new Error('Test error'));
        }
      });

      const nodeMetrics = monitoringService.getNodeMetrics(nodeId);
      expect(nodeMetrics).toBeDefined();
      expectNodeMetricsToBeValid(nodeMetrics!);
    });

    it('should detect unhealthy nodes', () => {
      const nodeId = 'node-1';
      simulateHighErrorRate(nodeId);

      const nodeMetrics = monitoringService.getNodeMetrics(nodeId);
      expect(nodeMetrics?.health).toBe('unhealthy');
    });

    it('should aggregate metrics across nodes', () => {
      const nodes = generateNodeMetricsData(3);
      nodes.forEach((metrics, nodeId) => {
        const sessions = generateSessionMetricsData(metrics.sessions);
        sessions.forEach((sessionMetrics, sessionId) => {
          sessionMetrics.latency.forEach(latency => {
            monitoringService.recordSessionOperation(sessionId, nodeId, latency);
          });
          for (let i = 0; i < sessionMetrics.errors; i++) {
            monitoringService.recordSessionError(sessionId, new Error('Test error'));
          }
        });
      });

      const allNodeMetrics = Array.from(nodes.keys()).map(nodeId => 
        monitoringService.getNodeMetrics(nodeId)
      );

      allNodeMetrics.forEach(metrics => {
        expect(metrics).toBeDefined();
        expectNodeMetricsToBeValid(metrics!);
      });
    });
  });

  describe('Performance Analysis', () => {
    it('should analyze metrics for issues', () => {
      simulateHighLatency();
      simulateLowHitRate();

      const stats = monitoringService.getPerformanceStats();
      expect(stats.recommendations).toContain(expect.stringContaining('latency'));
      expect(stats.recommendations).toContain(expect.stringContaining('hit rate'));
    });

    it('should calculate performance trends', async () => {
      const history = generateMetricsHistory(24); // 24 hours of data
      history.forEach(({ metrics }) => {
        monitoringService['analyzeMetrics'](metrics);
      });

      const stats = monitoringService.getPerformanceStats();
      expect(stats.hourlyAverage).toBeDefined();
      expect(stats.hourlyAverage.hitRate).toBeGreaterThan(0);
      expect(stats.hourlyAverage.latency).toBeGreaterThan(0);
      expect(stats.hourlyAverage.invalidationRate).toBeGreaterThan(0);
    });

    it('should handle missing metrics gracefully', () => {
      simulateMetricsError();
      expect(() => monitoringService.getCurrentMetrics()).toThrow();
      
      const stats = monitoringService.getPerformanceStats();
      expect(stats).toBeDefined();
      expect(stats.recommendations).toContain(expect.stringContaining('error'));
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis service errors', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      simulateMetricsError();

      expect(() => monitoringService.getCurrentMetrics()).toThrow('Failed to get metrics');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle invalid session IDs', () => {
      const metrics = monitoringService.getSessionMetrics('non-existent-session');
      expect(metrics).toBeNull();
    });

    it('should handle invalid node IDs', () => {
      const metrics = monitoringService.getNodeMetrics('non-existent-node');
      expect(metrics).toBeNull();
    });
  });

  describe('Event Handling', () => {
    it('should emit metrics update events', () => {
      const updateSpy = vi.fn();
      monitoringService.on('metrics:update', updateSpy);

      monitoringService['startPeriodicMetricsCollection']();
      vi.advanceTimersByTime(60000); // 1 minute

      expect(updateSpy).toHaveBeenCalled();
    });

    it('should emit alert events for issues', () => {
      const alertSpy = vi.fn();
      monitoringService.on('alert', alertSpy);

      simulateHighLatency();
      monitoringService['analyzeMetrics'](monitoringService.getCurrentMetrics());

      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'performance',
          severity: 'warning',
          message: expect.stringContaining('latency'),
        })
      );
    });
  });
}); 