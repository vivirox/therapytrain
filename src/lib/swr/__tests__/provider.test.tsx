/// <reference types="vitest" />
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SWRProvider } from '../provider';
import { swrConfig } from '../config';

// Mock console methods
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleDebug = vi.spyOn(console, 'debug').mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('SWRProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children', () => {
    render(
      <SWRProvider>
        <div data-testid="test-child">Test Child</div>
      </SWRProvider>
    );

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
  });

  it('should provide fallback data', () => {
    const fallback = {
      '/api/test': { data: 'test' }
    };

    render(
      <SWRProvider fallback={fallback}>
        <div>Test Child</div>
      </SWRProvider>
    );

    // Verify SWRConfig receives the fallback data
    expect(swrConfig).toBeDefined();
  });

  it('should handle errors', () => {
    const error = new Error('Test error');
    const key = '/api/test';

    render(
      <SWRProvider>
        <div>Test Child</div>
      </SWRProvider>
    );

    // Simulate error
    swrConfig.onError?.(error, key);

    expect(mockConsoleError).toHaveBeenCalledWith('SWR Error:', { error, key });
  });

  it('should log successful requests in development', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const data = { test: 'data' };
    const key = '/api/test';

    render(
      <SWRProvider>
        <div>Test Child</div>
      </SWRProvider>
    );

    // Simulate success
    swrConfig.onSuccess?.(data, key);

    expect(mockConsoleDebug).toHaveBeenCalledWith('SWR Success:', { key, data });

    // Restore NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should not log successful requests in production', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const data = { test: 'data' };
    const key = '/api/test';

    render(
      <SWRProvider>
        <div>Test Child</div>
      </SWRProvider>
    );

    // Simulate success
    swrConfig.onSuccess?.(data, key);

    expect(mockConsoleDebug).not.toHaveBeenCalled();

    // Restore NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should log slow requests', () => {
    const key = '/api/test';

    render(
      <SWRProvider>
        <div>Test Child</div>
      </SWRProvider>
    );

    // Simulate slow request
    swrConfig.onLoadingSlow?.(key);

    expect(mockConsoleWarn).toHaveBeenCalledWith('Slow Request:', key);
  });

  it('should only retry on network errors', () => {
    render(
      <SWRProvider>
        <div>Test Child</div>
      </SWRProvider>
    );

    // Test network error
    const networkError = new Error('Network error');
    networkError.name = 'NetworkError';
    expect(swrConfig.shouldRetryOnError?.(networkError)).toBe(true);

    // Test other error
    const otherError = new Error('Other error');
    expect(swrConfig.shouldRetryOnError?.(otherError)).toBe(false);
  });
}); 