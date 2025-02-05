module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/tests/performance/**/*.test.ts'],
    verbose: true,
    testTimeout: 30_000, // 30 seconds timeout for performance tests
    reporters: [
        'default',
        ['jest-junit', {
            outputDirectory: './test-results/performance',
            outputName: 'results.xml',
            classNameTemplate: '{classname}',
            titleTemplate: '{title}',
            ancestorSeparator: ' › ',
            usePathForSuiteName: true
        }]
    ],
    setupFilesAfterEnv: ['./tests/performance/setup.ts']
}; 