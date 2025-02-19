/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

declare module 'vitest' {
  interface Suite {
    timeout(n: number | boolean): void;
  }
}

declare global {
  namespace Vi {
    interface Assertion<T = any> extends jest.Matchers<void, T> {}
    interface AsymmetricMatchersContaining extends jest.Matchers<void, any> {}
  }
}

interface Window {
  matchMedia(query: string): MediaQueryList;
} 