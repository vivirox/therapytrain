import { performance } from 'perf_hooks';

// Custom matchers for performance testing
expect.extend({
    toBeUnderPerformanceThreshold(received: number, threshold: number) {
        const pass = received < threshold;
        if (pass) {
            return {
                message: () =>
                    `expected ${received}ms not to be under ${threshold}ms threshold`,
                pass: true,
            };
        } else {
            return {
                message: () =>
                    `expected ${received}ms to be under ${threshold}ms threshold`,
                pass: false,
            };
        }
    },
});

// Global performance monitoring
beforeAll(() => {
    // Clear any existing performance marks
    performance.clearMarks();
    performance.clearMeasures();
});

afterAll(() => {
    // Log any remaining performance measures
    const measures = performance.getEntriesByType('measure');
    if (measures.length > 0) {
        console.log('\nPerformance Measures:');
        measures.forEach((measure: any) => {
            console.log(`${measure.name}: ${measure.duration.toFixed(2)}ms`);
        });
    }
});

// Helper functions for performance testing
global.measurePerformance = async (name: string, fn: () => Promise<any> | any) => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    performance.mark(`${name}-end`);
    performance.measure(name, undefined, `${name}-end`);
    return { result, duration };
};

// Add custom matchers to TypeScript
declare global {
    namespace jest {
        interface Matchers<R> {
            toBeUnderPerformanceThreshold(threshold: number): R;
        }
    }
    
    var measurePerformance: (name: string, fn: () => Promise<any> | any) => Promise<{
        result: any;
        duration: number;
    }>;
} 