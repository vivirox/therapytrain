/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    deps: {
      inline: ['@testing-library/user-event']
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.idea', '.git', '.cache'],
    testTimeout: 20000,
    coverage: {
      reporter: ['text', 'json', 'html', 'junit'],
      reportsDirectory: './coverage',
    },
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})