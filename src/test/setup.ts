import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { expect } from 'vitest';
import { AccessibilityProvider } from '../contexts/accessibility-context';
import { render } from '@testing-library/react';
import { ReactElement } from 'react';
// Mock TextEncoder/TextDecoder if they don't exist
if (typeof global.TextEncoder === 'undefined') {
    class TextEncoder {
        encode(text: string): Uint8Array {
            const arr = new Uint8Array(text.length);
            for (let i = 0; i < text.length; i++) {
                arr[i] = text.charCodeAt(i);
            }
            return arr;
        }
    }
    global.TextEncoder = TextEncoder as any;
}
if (typeof global.TextDecoder === 'undefined') {
    class TextDecoder {
        decode(arr: Uint8Array): string {
            return String.fromCharCode.apply(null, Array.from(arr));
        }
    }
    global.TextDecoder = TextDecoder as any;
}
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
// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));
// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));
// Clean up after each test
afterEach(() => {
    cleanup();
});
// Mock fetch
global.fetch = vi.fn();
// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    clear: vi.fn(),
    removeItem: vi.fn(),
    length: 0,
    key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
// Mock sessionStorage
const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    clear: vi.fn(),
    removeItem: vi.fn(),
    length: 0,
    key: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
    aside: ({ children, ...props }: any) => <aside {...props}>{children}</aside>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Custom render method that includes providers
const customRender = (ui: ReactElement) => {
  return render(ui, {
    wrapper: ({ children }) => (
      <AccessibilityProvider>{children}</AccessibilityProvider>
    ),
  });
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Extend Vitest's expect with testing-library matchers
expect.extend(matchers);

// Mock environment variables
process.env = {
  ...process.env,
  UPSTASH_REDIS_REST_URL: 'mock-url',
  UPSTASH_REDIS_REST_TOKEN: 'mock-token',
  NEXT_PUBLIC_SUPABASE_URL: 'mock-url',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'mock-key'
};

// Add any global test setup here
