/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'
import { loadEnv } from 'vite'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'node',
    setupFiles: ['.env.test'],
    globals: true,
    deps: {
      inline: ['@testing-library/user-event']
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.idea', '.git', '.cache'],
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        'test/**',
        'vite.config.ts',
      ],
      reportsDirectory: './coverage',
    },
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})