module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/tests/integration/**/*.test.ts'],
    verbose: true,
    testTimeout: 10_000, // 10 seconds timeout for integration tests
    reporters: [
        'default',
        ['jest-junit', {
            outputDirectory: './test-results/integration',
            outputName: 'results.xml',
            classNameTemplate: '{classname}',
            titleTemplate: '{title}',
            ancestorSeparator: ' › ',
            usePathForSuiteName: true
        }]
    ],
    setupFilesAfterEnv: ['./tests/integration/setup.ts']
}; 