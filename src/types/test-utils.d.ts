/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

declare module 'vitest' {
    interface Suite {
        timeout(n: number | boolean): void;
    }
}

declare module '@testing-library/jest-dom' {
    export {};
} 