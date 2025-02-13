/// <reference types="vitest/globals" />
import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { webcrypto } from 'node:crypto';

// Mock environment variables
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.RESEND_API_KEY = 'test_key';
process.env.EMAIL_FROM = 'test@therapytrain.ai';

// Delete existing crypto property if it exists
delete (global as any).crypto;

// Mock crypto for tests with webcrypto implementation
Object.defineProperty(global, 'crypto', {
    value: {
        getRandomValues: (array: Uint8Array) => webcrypto.getRandomValues(array),
        subtle: {
            digest: vi.fn(),
            importKey: vi.fn(),
            deriveKey: vi.fn(),
            encrypt: vi.fn(),
            decrypt: vi.fn(),
        }
    },
    configurable: true,
    writable: true
});

// Mock crypto for password hashing
global.crypto = {
  getRandomValues: vi.fn(),
  subtle: {
    digest: vi.fn(),
    importKey: vi.fn(),
    deriveKey: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  },
} as any;

// Mock matchMedia
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Global error handler for unhandled promises
beforeAll(() => {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    if (
      args[0]?.includes?.('Warning: ReactDOM.render is no longer supported') ||
      args[0]?.includes?.('Warning: useLayoutEffect does nothing on the server')
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Add any additional test setup here