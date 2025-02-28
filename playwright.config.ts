import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { TEST_CONFIG } from './e2e/test-config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: TEST_CONFIG.server.baseUrl,
    trace: 'on-first-retry',
    testIdAttribute: 'data-testid',
  },
  projects: [
    // Setup project that will set up authentication state
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      testDir: './e2e',
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: TEST_CONFIG.paths.authState,
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: TEST_CONFIG.paths.authState,
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: TEST_CONFIG.paths.authState,
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'NODE_ENV=test PORT=3001 pnpm dev',
    url: TEST_CONFIG.server.baseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes
  },
});