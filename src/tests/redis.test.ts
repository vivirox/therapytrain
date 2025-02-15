import { RedisService } from '../services/RedisService';
import { MonitoringService } from '../services/MonitoringService';
import { cacheConfig } from '../config/cache.config';

describe('Redis Service', () => {
    let redisService: RedisService;
    let monitoringService: MonitoringService;

    beforeEach(() => {
        redisService = RedisService.getInstance();
        monitoringService = MonitoringService.getInstance();
        redisService.resetMetrics();
    });

    afterEach(async () => {
        await redisService.invalidateByPattern('test-pattern');
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
            expect(metrics.recommendations).toBeDefined();
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

            // Wait for metrics collection
            await new Promise(resolve => setTimeout(resolve, 
                cacheConfig.monitoring.metrics.collection.interval + 100
            ));

            const history = monitoringService.getMetricsHistory();
            expect(history.length).toBeGreaterThan(0);
        });
    });
}); 