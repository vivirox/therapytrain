import { RateLimiterService } from '../../src/services/RateLimiterService';
import { performance } from 'perf_hooks';
import { Request, Response, NextFunction } from 'express';

describe('RateLimiter Performance Tests', () => {
    let rateLimiter: RateLimiterService;
    const mockReq = {
        ip: '127.0.0.1'
    } as Request;
    const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    } as unknown as Response;
    const mockNext = jest.fn() as NextFunction;

    beforeEach(() => {
        rateLimiter = new RateLimiterService();
        jest.clearAllMocks();
    });

    describe('Rate Limit Check Performance', () => {
        it('should handle high-frequency requests efficiently', async () => {
            const iterations = 10_000;
            const results: Array<number> = [];

            // Warm up
            for (let i = 0; i < 100; i++) {
                rateLimiter.isRateLimited('test-key');
            }

            // Test performance
            for (let i = 0; i < iterations; i++) {
                const start = performance.now();
                rateLimiter.isRateLimited('test-key');
                const end = performance.now();
                results.push(end - start);
            }

            const avgTime = results.reduce((a, b) => a + b) / results.length;
            const p95Time = results.sort((a, b) => a - b)[Math.floor(iterations * 0.95)];

            console.log(`Average check time: ${avgTime.toFixed(3)}ms`);
            console.log(`95th percentile check time: ${p95Time.toFixed(3)}ms`);

            // Performance assertions
            expect(avgTime).toBeLessThan(1); // Should take less than 1ms on average
            expect(p95Time).toBeLessThan(2); // 95% of requests should be under 2ms
        });

        it('should handle concurrent requests efficiently', async () => {
            const concurrentRequests = 100;
            const requests = Array(concurrentRequests).fill(null).map((_, index) => {
                return async () => {
                    const start = performance.now();
                    await rateLimiter.createRateLimiter()(mockReq, mockRes, mockNext);
                    return performance.now() - start;
                };
            });

            const results = await Promise.all(requests.map(req => req()));
            const avgTime = results.reduce((a, b) => a + b, 0) / results.length;
            const sortedResults = [...results].sort((a, b) => Number(a) - Number(b));
            const p95Time = sortedResults[Math.floor(concurrentRequests * 0.95)];

            console.log(`Average concurrent request time: ${avgTime.toFixed(3)}ms`);
            console.log(`95th percentile concurrent time: ${p95Time.toFixed(3)}ms`);

            expect(avgTime).toBeLessThan(5); // Should handle concurrent requests in under 5ms avg
            expect(p95Time).toBeLessThan(10); // 95% of concurrent requests under 10ms
        });

        it('should maintain performance with suspicious list checks', async () => {
            const iterations = 1000;
            const results: Array<number> = [];

            // Add some IPs to suspicious list
            for (let i = 0; i < 1000; i++) {
                rateLimiter.addToSuspiciousList(`192.168.1.${i % 255}`);
            }

            // Test performance with suspicious list checks
            for (let i = 0; i < iterations; i++) {
                const start = performance.now();
                rateLimiter.handleSuspiciousActivity(mockReq, mockRes, mockNext);
                const end = performance.now();
                results.push(end - start);
            }

            const avgTime = results.reduce((a, b) => a + b) / results.length;
            const p95Time = results.sort((a, b) => a - b)[Math.floor(iterations * 0.95)];

            console.log(`Average suspicious check time: ${avgTime.toFixed(3)}ms`);
            console.log(`95th percentile suspicious check time: ${p95Time.toFixed(3)}ms`);

            expect(avgTime).toBeLessThan(2); // Should process suspicious checks under 2ms avg
            expect(p95Time).toBeLessThan(5); // 95% of suspicious checks under 5ms
        });

        it('should handle memory usage efficiently', () => {
            const initialMemory = process.memoryUsage().heapUsed;

            // Create many rate limit entries
            for (let i = 0; i < 10_000; i++) {
                rateLimiter.isRateLimited(`key-${i}`);
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // Convert to MB

            console.log(`Memory increase: ${memoryIncrease.toFixed(2)}MB`);
            expect(memoryIncrease).toBeLessThan(10); // Should use less than 10MB for 10k entries
        });
    });
}); 