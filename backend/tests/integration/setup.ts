import { performance } from 'perf_hooks';

// Custom matchers for integration testing
expect.extend({
    toBeWithinTimeLimit(received: number, limit: number) {
        const pass = received <= limit;
        if (pass) {
            return {
                message: () =>
                    `expected ${received}ms to not be within time limit of ${limit}ms`,
                pass: true,
            };
        } else {
            return {
                message: () =>
                    `expected ${received}ms to be within time limit of ${limit}ms`,
                pass: false,
            };
        }
    },
    toHaveValidMetadata(received: any) {
        const hasMetadata = received && typeof received === 'object' && received.metadata;
        const hasRequiredFields = hasMetadata &&
            typeof received.metadata.sentiment === 'number' &&
            Array.isArray(received.metadata.topics) &&
            Array.isArray(received.metadata.followUpQuestions);

        if (hasRequiredFields) {
            return {
                message: () => 'expected response not to have valid metadata',
                pass: true,
            };
        } else {
            return {
                message: () => 'expected response to have valid metadata',
                pass: false,
            };
        }
    },
});

// Global test environment setup
beforeAll(() => {
    // Clear performance marks
    performance.clearMarks();
    performance.clearMeasures();

    // Set up global test environment
    process.env.NODE_ENV = 'test';
});

afterAll(() => {
    // Log performance measures
    const measures = performance.getEntriesByType('measure');
    if (measures.length > 0) {
        console.log('\nIntegration Test Performance:');
        measures.forEach(measure => {
            console.log(`${measure.name}: ${measure.duration.toFixed(2)}ms`);
        });
    }
});

// Helper functions for integration testing
global.measureIntegrationTest = async (name: string, fn: () => Promise<any> | any) => {
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
            toBeWithinTimeLimit(limit: number): R;
            toHaveValidMetadata(): R;
        }
    }

    var measureIntegrationTest: (name: string, fn: () => Promise<any> | any) => Promise<{
        result: any;
        duration: number;
    }>;
} 