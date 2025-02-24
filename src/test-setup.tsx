/// <reference types="vitest" />
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, expect, vi } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { render } from '@testing-library/react';
import { ReactNode } from 'react';
import { AccessibilityProvider } from '@/contexts/accessibility-context';
import { KeyboardNavigationProvider } from '@/contexts/keyboard-navigation';
import { FormProvider, useForm } from 'react-hook-form';
import React from 'react';
import { redisMock, resetRedisMock } from './lib/test/mocks/redis-mock';
import { ThemeProvider } from '@/components/theme/theme-provider';

// Extend Vitest's expect with testing-library matchers
expect.extend(matchers);

// Mock environment variables
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.RESEND_API_KEY = 'test_key';
process.env.EMAIL_FROM = 'test@gemcity.xyz';

// Mock crypto for tests
const cryptoMock = {
  getRandomValues: vi.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
  subtle: {
    digest: vi.fn(),
    importKey: vi.fn(),
    deriveKey: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  }
};

Object.defineProperty(global, 'crypto', {
  value: cryptoMock,
  configurable: true,
  writable: true
});

// Mock TextEncoder/TextDecoder
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = class TextEncoder {
    encode(text: string): Uint8Array {
      const arr = new Uint8Array(text.length);
      for (let i = 0; i < text.length; i++) {
        arr[i] = text.charCodeAt(i);
      }
      return arr;
    }
  } as any;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = class TextDecoder {
    decode(arr: Uint8Array): string {
      return String.fromCharCode.apply(null, Array.from(arr));
    }
  } as any;
}

// Setup mocks
// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
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

// Mock storage implementation
const mockStorage = {
  getItem: vi.fn((key: string) => {
    // Return default values for accessibility settings
    if (key === 'high-contrast-mode') return 'false';
    if (key === 'reduced-motion') return 'false';
    if (key === 'test-theme') return 'light';
    return null;
  }),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

// Mock window.localStorage and window.sessionStorage
Object.defineProperty(window, 'localStorage', { value: mockStorage });
Object.defineProperty(window, 'sessionStorage', { value: mockStorage });

// Mock fetch
global.fetch = vi.fn();

// Mock analytics service
vi.mock('@/services/analytics', () => {
  const mockTrackEvent = vi.fn();
  const mockTrackTutorialProgress = vi.fn();
  const mockTrackQuizCompletion = vi.fn();
  const mockTrackResourceEngagement = vi.fn();
  const mockTrackPeerInteraction = vi.fn();

  class MockAnalyticsService {
    private static instance: MockAnalyticsService;

    private constructor() {}

    static getInstance() {
      if (!MockAnalyticsService.instance) {
        MockAnalyticsService.instance = new MockAnalyticsService();
      }
      return MockAnalyticsService.instance;
    }

    trackEvent = mockTrackEvent;
    trackTutorialProgress = mockTrackTutorialProgress;
    trackQuizCompletion = mockTrackQuizCompletion;
    trackResourceEngagement = mockTrackResourceEngagement;
    trackPeerInteraction = mockTrackPeerInteraction;
  }

  return {
    AnalyticsService: MockAnalyticsService,
    mockTrackEvent,
    mockTrackTutorialProgress,
    mockTrackQuizCompletion,
    mockTrackResourceEngagement,
    mockTrackPeerInteraction,
  };
});

// Mock edge cache
vi.mock('@/lib/edge-cache', () => ({
  edgeCache: {
    invalidateByTag: vi.fn().mockResolvedValue(undefined),
  }
}));

// Mock Redis
vi.mock('@/services/RedisService', () => ({
  RedisService: {
    getInstance: () => ({
      ...redisMock,
      getMetrics: vi.fn(() => ({
        hits: 0,
        misses: 0,
        hitRate: 0,
        averageLatency: 0,
        recommendations: [],
      })),
      resetMetrics: vi.fn(),
    }),
  },
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
    aside: ({ children, ...props }: any) => <aside {...props}>{children}</aside>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
    set: vi.fn(),
  }),
}));

// Suppress specific React warnings
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

// Reset all mocks after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockStorage.getItem.mockReset();
  mockStorage.setItem.mockReset();
  mockStorage.removeItem.mockReset();
  mockStorage.clear.mockReset();
  
  // Reset to default values
  mockStorage.getItem.mockImplementation((key: string) => {
    if (key === 'high-contrast-mode') return 'false';
    if (key === 'reduced-motion') return 'false';
    if (key === 'test-theme') return 'light';
    return null;
  });
  resetRedisMock();
});

// Custom render method that includes providers
const AllTheProviders = ({ children }: { children: ReactNode }) => {
  const form = useForm({
    defaultValues: {},
    mode: 'onSubmit'
  });

  return (
    <AccessibilityProvider>
      <KeyboardNavigationProvider>
        <ThemeProvider defaultTheme="light" storageKey="test-theme">
          <FormProvider {...form}>
            {children}
          </FormProvider>
        </ThemeProvider>
      </KeyboardNavigationProvider>
    </AccessibilityProvider>
  );
};

const customRender = (ui: React.ReactElement, options = {}) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render };