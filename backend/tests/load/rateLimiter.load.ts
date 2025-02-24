import { RateLimiterService } from "@/../src/services/RateLimiterService";
import cluster from 'cluster';
import { cpus } from 'os';
import { performance } from 'perf_hooks';
import { Request, Response, NextFunction } from 'express';
const NUM_WORKERS = cpus().length;
const DURATION = 60000; // 1 minute test
const REQUESTS_PER_SECOND = 1000;
interface TestResult {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    maxResponseTime: number;
    rps: number;
}
if (cluster.isPrimary) {
    const results: Array<TestResult> = [];
    // Fork workers
    for (const element of cpus()) {
        cluster.fork();
    }
    let completedWorkers = 0;
    // Collect results from workers
    cluster.on('message', (worker, message) => {
        if (message.type !== 'result') {
            return;
        }
        results.push(message.data);
        completedWorkers++;
        if (completedWorkers !== NUM_WORKERS) {
            return;
        }
        // Aggregate results
        const aggregateResult = aggregateResults(results);
        printResults(aggregateResult);
        process.exit(0);
    });
}
else {
    runWorker();
}
function aggregateResults(results: Array<TestResult>): TestResult {
    const totalRequests = results.reduce((sum: any, r: any) => sum + r.totalRequests, 0);
    const successfulRequests = results.reduce((sum: any, r: any) => sum + r.successfulRequests, 0);
    const failedRequests = results.reduce((sum: any, r: any) => sum + r.failedRequests, 0);
    // Combine response times from all workers
    const allTimes = results.flatMap(r => r.avgResponseTime);
    return {
        totalRequests,
        successfulRequests,
        failedRequests,
        avgResponseTime: allTimes.reduce((a: any, b: any) => a + b) / allTimes.length,
        p95ResponseTime: calculatePercentile(allTimes, 95),
        p99ResponseTime: calculatePercentile(allTimes, 99),
        maxResponseTime: Math.max(...results.map((r: any) => r.maxResponseTime)),
        rps: totalRequests / (DURATION / 1000)
    };
}
function calculatePercentile(times: Array<number>, percentile: number): number {
    const sorted = [...times].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
}
function printResults(results: TestResult) {
}
async function runWorker() {
    const rateLimiter = new RateLimiterService();
    const mockReq = { ip: '127.0.0.1' } as Request;
    const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    } as unknown as Response;
    const mockNext = jest.fn() as NextFunction;
    const requestsPerWorker = Math.floor(REQUESTS_PER_SECOND / NUM_WORKERS);
    const results: Array<number> = [];
    let successful = 0;
    let failed = 0;
    const startTime = performance.now();
    const endTime = startTime + DURATION;
    while (performance.now() < endTime) {
        const batchStart = performance.now();
        const promises: Array<Promise<number>> = [];
        // Create a batch of requests
        for (let i = 0; i < requestsPerWorker; i++) {
            promises.push((async () => {
                try {
                    const start = performance.now();
                    await rateLimiter.createRateLimiter()(mockReq, mockRes, mockNext);
                    const duration = performance.now() - start;
                    results.push(duration);
                    successful++;
                    return duration;
                }
                catch (error) {
                    failed++;
                    return 0;
                }
            })());
        }
        await Promise.all(promises);
        // Wait for next second if we completed too quickly
        const batchDuration = performance.now() - batchStart;
        if (batchDuration < 1000) {
            await new Promise(resolve => setTimeout(resolve, 1000 - batchDuration));
        }
    }
    // Send results back to primary
    process.send?.({
        type: 'result',
        data: {
            totalRequests: successful + failed,
            successfulRequests: successful,
            failedRequests: failed,
            avgResponseTime: results.reduce((a: any, b: any) => a + b) / results.length,
            p95ResponseTime: calculatePercentile(results, 95),
            p99ResponseTime: calculatePercentile(results, 99),
            maxResponseTime: Math.max(...results),
            rps: (successful + failed) / (DURATION / 1000)
        }
    });
}
