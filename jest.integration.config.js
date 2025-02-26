/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__integration_tests__/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/lib/mpc/mp-spdz-bindings/__integration_tests__/setup.ts'],
  verbose: true,
  testTimeout: 120000,
  maxWorkers: 1, // Run tests sequentially
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
      isolatedModules: true
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/__mocks__/',
    '/dist/'
  ],
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'reports',
      outputName: 'integration-test-results.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}'
    }]
  ]
}; 