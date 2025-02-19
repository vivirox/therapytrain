import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import handler from '../health-check';

describe('Health Check API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle HEAD request', async () => {
    const { req, res } = createMocks({
      method: 'HEAD',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getData()).toBe('');
  });

  it('should handle GET request', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    const data = JSON.parse(res._getData());
    expect(res._getStatusCode()).toBe(200);
    expect(data).toEqual({
      uptime: expect.any(Number),
      timestamp: expect.any(Number),
      status: 'healthy',
    });
  });

  it('should return 405 for unsupported methods', async () => {
    const methods = ['POST', 'PUT', 'DELETE', 'PATCH'];

    for (const method of methods) {
      const { req, res } = createMocks({
        method,
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(res.getHeader('Allow')).toEqual(['HEAD', 'GET']);
    }
  });

  it('should handle errors gracefully', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    // Mock process.uptime to throw an error
    const originalUptime = process.uptime;
    process.uptime = () => { throw new Error('Uptime error'); };

    await handler(req, res);

    const data = JSON.parse(res._getData());
    expect(res._getStatusCode()).toBe(503);
    expect(data).toEqual({
      status: 'unhealthy',
      timestamp: expect.any(Number),
      error: 'Uptime error',
    });

    // Restore original uptime function
    process.uptime = originalUptime;
  });
}); 