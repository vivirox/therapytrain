import '@testing-library/jest-dom';

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

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
class IntersectionObserver {
  observe = jest.fn();
  disconnect = jest.fn();
  unobserve = jest.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserver,
});

// Mock ResizeObserver
class ResizeObserver {
  observe = jest.fn();
  disconnect = jest.fn();
  unobserve = jest.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: ResizeObserver,
});
