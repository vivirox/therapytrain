import { vi } from 'vitest';
import { webcrypto } from 'node:crypto';

// Mock crypto for tests
Object.defineProperty(globalThis, 'crypto', {
    value: {
        getRandomValues: (array: Uint8Array) => webcrypto.getRandomValues(array),
        subtle: webcrypto.subtle
    }
});
