import { createMocks } from 'node-mocks-http';
import trackClickHandler from '../email/track-click';
import { EmailTrackingService } from '@/lib/email/email-tracking';
import { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/email/email-tracking', () => ({
  EmailTrackingService: {
    trackClick: jest.fn(),
  },
}));

describe('Track Click API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 405 for non-GET requests', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      env: process.env,
    });

    await trackClickHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Method not allowed',
    });
  });

  it('should return 400 if required parameters are missing', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: {
        email_id: '123',
        recipient: 'test@example.com',
        // missing url
      },
      env: process.env,
    });

    await trackClickHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Missing required parameters',
    });
  });

  it('should track click event and redirect to original URL', async () => {
    const originalUrl = 'https://example.com';
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: {
        email_id: '123',
        recipient: 'test@example.com',
        url: originalUrl,
      },
      headers: {
        'user-agent': 'test-agent',
        'x-forwarded-for': '127.0.0.1',
      },
      env: process.env,
    });

    await trackClickHandler(req, res);

    expect(EmailTrackingService.trackClick).toHaveBeenCalledWith(
      '123',
      'test@example.com',
      originalUrl,
      'test-agent',
      '127.0.0.1'
    );

    expect(res._getStatusCode()).toBe(302);
    expect(res.getHeader('Location')).toBe(originalUrl);
    expect(res.getHeader('Cache-Control')).toBe(
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
  });

  it('should handle tracking errors gracefully', async () => {
    const originalUrl = 'https://example.com';
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: {
        email_id: '123',
        recipient: 'test@example.com',
        url: originalUrl,
      },
      env: process.env,
    });

    const mockError = new Error('Tracking failed');
    (EmailTrackingService.trackClick as jest.Mock).mockRejectedValueOnce(mockError);

    await trackClickHandler(req, res);

    // Should still redirect even if tracking fails
    expect(res._getStatusCode()).toBe(302);
    expect(res.getHeader('Location')).toBe(originalUrl);
  });

  it('should handle missing client information', async () => {
    const originalUrl = 'https://example.com';
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: {
        email_id: '123',
        recipient: 'test@example.com',
        url: originalUrl,
      },
      // No headers provided
      env: process.env,
    });

    await trackClickHandler(req, res);

    expect(EmailTrackingService.trackClick).toHaveBeenCalledWith(
      '123',
      'test@example.com',
      originalUrl,
      undefined,
      undefined
    );

    expect(res._getStatusCode()).toBe(302);
    expect(res.getHeader('Location')).toBe(originalUrl);
  });

  it('should handle encoded URLs correctly', async () => {
    const originalUrl = 'https://example.com/path?param=value&other=123';
    const encodedUrl = encodeURIComponent(originalUrl);
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: {
        email_id: '123',
        recipient: 'test@example.com',
        url: encodedUrl,
      },
      env: process.env,
    });

    await trackClickHandler(req, res);

    expect(EmailTrackingService.trackClick).toHaveBeenCalledWith(
      '123',
      'test@example.com',
      originalUrl,
      undefined,
      undefined
    );

    expect(res._getStatusCode()).toBe(302);
    expect(res.getHeader('Location')).toBe(originalUrl);
  });
}); 