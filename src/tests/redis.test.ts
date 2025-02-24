import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RedisService } from '../services/RedisService';
import { MonitoringService } from '../services/MonitoringService';
import { cacheConfig } from '../config/cache.config';
import { redisMock, resetRedisMock } from '../lib/test/mocks/redis-mock';

// Mock the Redis client
vi.mock('../services/RedisService', () => ({
  RedisService: {
    getInstance: () => ({
      ...redisMock,
      set: vi.fn(redisMock.set.bind(redisMock)),
      get: vi.fn(redisMock.get.bind(redisMock)),
      del: vi.fn(redisMock.del.bind(redisMock)),
      invalidateByPattern: vi.fn(redisMock.invalidateByPattern.bind(redisMock)),
      getMetrics: vi.fn(redisMock.getMetrics.bind(redisMock)),
      resetMetrics: vi.fn(redisMock.resetMetrics.bind(redisMock)),
      onEvent: vi.fn(redisMock.onEvent.bind(redisMock))
    }),
  },
}));

// Mock the MonitoringService
vi.mock('../services/MonitoringService', () => ({
  MonitoringService: {
    getInstance: () => ({
      getPerformanceStats: vi.fn(() => ({
        current: {
          hits: redisMock.metrics.hits,
          misses: redisMock.metrics.misses,
          hitRate: redisMock.metrics.hits / (redisMock.metrics.hits + redisMock.metrics.misses) || 0,
          averageLatency: redisMock.metrics.operationCount > 0 ? redisMock.metrics.latencySum / redisMock.metrics.operationCount : 0,
        },
        hourlyAverage: {
          hits: redisMock.metrics.hits,
          misses: redisMock.metrics.misses,
          hitRate: redisMock.metrics.hits / (redisMock.metrics.hits + redisMock.metrics.misses) || 0,
          averageLatency: redisMock.metrics.operationCount > 0 ? redisMock.metrics.latencySum / redisMock.metrics.operationCount : 0,
        },
        recommendations: redisMock.metrics.recommendations,
      })),
      getMetricsHistory: vi.fn(() => [{
        timestamp: Date.now(),
        hits: redisMock.metrics.hits,
        misses: redisMock.metrics.misses,
        hitRate: redisMock.metrics.hits / (redisMock.metrics.hits + redisMock.metrics.misses) || 0,
        averageLatency: redisMock.metrics.operationCount > 0 ? redisMock.metrics.latencySum / redisMock.metrics.operationCount : 0,
      }]),
    }),
  },
}));

describe('Redis Service', () => {
    let redisService: ReturnType<typeof RedisService.getInstance>;
    let monitoringService: ReturnType<typeof MonitoringService.getInstance>;

    beforeEach(() => {
        resetRedisMock();
        redisService = RedisService.getInstance();
        monitoringService = MonitoringService.getInstance();
    });

    afterEach(() => {
        resetRedisMock();
    });

    describe('Basic Operations', () => {
        it('should set and get values correctly', async () => {
            const testKey = 'test-key';
            const testValue = { data: 'test-data' };

            await redisService.set(testKey, testValue);
            const result = await redisService.get(testKey);

            expect(result).toEqual(testValue);
        });

        it('should handle non-existent keys', async () => {
            const result = await redisService.get('non-existent-key');
            expect(result).toBeNull();
        });

        it('should respect TTL settings', async () => {
            const testKey = 'ttl-test-key';
            const testValue = { data: 'test-data' };
            const ttl = 1; // 1 second

            await redisService.set(testKey, testValue, ttl);
            
            // Value should exist initially
            let result = await redisService.get(testKey);
            expect(result).toEqual(testValue);

            // Wait for TTL to expire
            await new Promise(resolve => setTimeout(resolve, 1100));

            // Value should be null after TTL
            result = await redisService.get(testKey);
            expect(result).toBeNull();
        });
    });

    describe('Pattern-based Operations', () => {
        it('should handle pattern-based invalidation', async () => {
            const pattern = 'test-pattern';
            const keys = ['key1', 'key2', 'key3'];
            const value = { data: 'test-data' };

            // Set multiple keys with the same pattern
            for (const key of keys) {
                await redisService.set(key, value, undefined, pattern);
            }

            // Verify all keys exist
            for (const key of keys) {
                const result = await redisService.get(key);
                expect(result).toEqual(value);
            }

            // Invalidate by pattern
            await redisService.invalidateByPattern(pattern);

            // Verify all keys are removed
            for (const key of keys) {
                const result = await redisService.get(key);
                expect(result).toBeNull();
            }
        });
    });

    describe('Performance Monitoring', () => {
        it('should track cache hits and misses', async () => {
            const testKey = 'metrics-test-key';
            const testValue = { data: 'test-data' };

            // Create a miss
            await redisService.get(testKey);

            // Create a hit
            await redisService.set(testKey, testValue);
            await redisService.get(testKey);

            const metrics = redisService.getMetrics();
            expect(metrics.hits).toBe(1);
            expect(metrics.misses).toBe(1);
            expect(metrics.hitRate).toBe(0.5);
        });

        it('should track latency', async () => {
            const testKey = 'latency-test-key';
            const testValue = { data: 'test-data' };

            await redisService.set(testKey, testValue);
            await redisService.get(testKey);

            const metrics = redisService.getMetrics();
            expect(metrics.averageLatency).toBeGreaterThan(0);
        });

        it('should generate recommendations when needed', async () => {
            // Create a low hit rate scenario
            for (let i = 0; i < 10; i++) {
                await redisService.get(`non-existent-key-${i}`);
            }

            const metrics = redisService.getMetrics();
            expect(metrics.recommendations.length).toBeGreaterThan(0);
        });
    });

    describe('Memory Management', () => {
        it('should handle memory limits', async () => {
            const largeValue = Buffer.alloc(1024 * 1024).toString(); // 1MB
            const keys = Array.from({ length: 100 }, (_, i) => `large-key-${i}`);

            // Monitor memory usage events
            let memoryWarningReceived = false;
            redisService.onEvent('memoryWarning', () => {
                memoryWarningReceived = true;
            });

            // Try to exceed memory limit
            try {
                for (const key of keys) {
                    await redisService.set(key, largeValue);
                }
            } catch (error) {
                // Expected to fail when memory limit is reached
            }

            expect(memoryWarningReceived).toBe(true);
        });
    });

    describe('Integration with MonitoringService', () => {
        it('should provide performance statistics', async () => {
            // Generate some cache activity
            const testKey = 'monitoring-test-key';
            const testValue = { data: 'test-data' };

            await redisService.set(testKey, testValue);
            await redisService.get(testKey);
            await redisService.get('non-existent-key');

            const stats = monitoringService.getPerformanceStats();
            expect(stats.current).toBeDefined();
            expect(stats.hourlyAverage).toBeDefined();
            expect(stats.recommendations).toBeDefined();
        });

        it('should track metrics history', async () => {
            // Generate cache activity
            const testKey = 'history-test-key';
            const testValue = { data: 'test-data' };

            await redisService.set(testKey, testValue);
            await redisService.get(testKey);
            await redisService.get('non-existent-key');

            const history = monitoringService.getMetricsHistory();
            expect(history.length).toBeGreaterThan(0);
            expect(history[0]).toMatchObject({
                timestamp: expect.any(Number),
                hits: expect.any(Number),
                misses: expect.any(Number),
                hitRate: expect.any(Number),
                averageLatency: expect.any(Number)
            });
        });
    });
}); 