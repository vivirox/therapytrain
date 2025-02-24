import { createMocks } from 'node-mocks-http';
import trackOpenHandler from '../email/track-open';
import { EmailTrackingService } from '@/lib/email/email-tracking';

jest.mock('@/lib/email/email-tracking', () => ({
  EmailTrackingService: {
    trackOpen: jest.fn(),
  },
}));

describe('Track Open API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 405 for non-GET requests', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    await trackOpenHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Method not allowed',
    });
  });

  it('should return 400 if required parameters are missing', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        email_id: '123', // missing recipient
      },
    });

    await trackOpenHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Missing required parameters',
    });
  });

  it('should track open event and return tracking pixel', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        email_id: '123',
        recipient: 'test@example.com',
      },
      headers: {
        'user-agent': 'test-agent',
        'x-forwarded-for': '127.0.0.1',
      },
    });

    await trackOpenHandler(req, res);

    expect(EmailTrackingService.trackOpen).toHaveBeenCalledWith(
      '123',
      'test@example.com',
      'test-agent',
      '127.0.0.1'
    );

    expect(res._getStatusCode()).toBe(200);
    expect(res.getHeader('Content-Type')).toBe('image/gif');
    expect(res.getHeader('Cache-Control')).toBe(
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
  });

  it('should handle tracking errors gracefully', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        email_id: '123',
        recipient: 'test@example.com',
      },
    });

    const mockError = new Error('Tracking failed');
    (EmailTrackingService.trackOpen as jest.Mock).mockRejectedValueOnce(mockError);

    await trackOpenHandler(req, res);

    // Should still return the tracking pixel even if tracking fails
    expect(res._getStatusCode()).toBe(200);
    expect(res.getHeader('Content-Type')).toBe('image/gif');
  });

  it('should handle missing client information', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        email_id: '123',
        recipient: 'test@example.com',
      },
      // No headers provided
    });

    await trackOpenHandler(req, res);

    expect(EmailTrackingService.trackOpen).toHaveBeenCalledWith(
      '123',
      'test@example.com',
      undefined,
      undefined
    );

    expect(res._getStatusCode()).toBe(200);
  });
}); 