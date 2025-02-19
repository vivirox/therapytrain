import { vi, describe, it, expect, beforeEach } from 'vitest';
import { kv } from '@vercel/kv';
import { Ratelimit } from '@upstash/ratelimit';
import { getRateLimit, isTooManyRequests, createRateLimitResponse } from '../rate-limit';

// Mock dependencies
vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: vi.fn().mockImplementation(() => ({
    limit: vi.fn(),
  })),
}));

describe('Rate Limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRateLimit', () => {
    it('should return rate limit info for successful request', async () => {
      const mockLimitResponse = {
        success: true,
        limit: 10,
        remaining: 9,
        reset: 1234567890,
      };

      (Ratelimit.prototype.limit as jest.Mock).mockResolvedValueOnce(mockLimitResponse);

      const result = await getRateLimit('test-id');

      expect(result).toEqual({
        ...mockLimitResponse,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '9',
          'X-RateLimit-Reset': '1234567890',
        },
      });
    });

    it('should return rate limit info for exceeded limit', async () => {
      const mockLimitResponse = {
        success: false,
        limit: 10,
        remaining: 0,
        reset: 1234567890,
      };

      (Ratelimit.prototype.limit as jest.Mock).mockResolvedValueOnce(mockLimitResponse);

      const result = await getRateLimit('test-id');

      expect(result).toEqual({
        ...mockLimitResponse,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': '1234567890',
        },
      });
    });

    it('should handle rate limit errors', async () => {
      const mockError = new Error('Rate limit error');
      (Ratelimit.prototype.limit as jest.Mock).mockRejectedValueOnce(mockError);

      await expect(getRateLimit('test-id')).rejects.toThrow('Rate limit error');
    });
  });

  describe('isTooManyRequests', () => {
    it('should return true when rate limit is exceeded', () => {
      const mockLimitResponse = {
        success: false,
        limit: 10,
        remaining: 0,
        reset: 1234567890,
      };

      expect(isTooManyRequests(mockLimitResponse)).toBe(true);
    });

    it('should return false when rate limit is not exceeded', () => {
      const mockLimitResponse = {
        success: true,
        limit: 10,
        remaining: 5,
        reset: 1234567890,
      };

      expect(isTooManyRequests(mockLimitResponse)).toBe(false);
    });
  });

  describe('createRateLimitResponse', () => {
    it('should create response with rate limit headers', () => {
      const mockLimitResponse = {
        success: false,
        limit: 10,
        remaining: 0,
        reset: 1234567890,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': '1234567890',
        },
      };

      const response = createRateLimitResponse(mockLimitResponse);

      expect(response.status).toBe(429);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response.headers.get('X-RateLimit-Reset')).toBe('1234567890');
      expect(response.headers.get('Retry-After')).toBe('1234567890');
    });

    it('should include retry-after header', () => {
      const mockLimitResponse = {
        success: false,
        limit: 10,
        remaining: 0,
        reset: 60, // 60 seconds
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': '60',
        },
      };

      const response = createRateLimitResponse(mockLimitResponse);

      expect(response.headers.get('Retry-After')).toBe('60');
    });
  });
}); 