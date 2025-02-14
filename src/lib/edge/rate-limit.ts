import { kv } from '@vercel/kv';
import { Ratelimit } from '@upstash/ratelimit';
import { cache } from 'react';

// Create a new ratelimiter that allows 10 requests per minute
const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: 'ratelimit:edge',
  ephemeralCache: new Map(), // In-memory cache for edge functions
});

// Cache the rate limit check for 1 second
export const getRateLimit = cache(async (identifier: string) => {
  const { success, limit, reset, remaining } = await ratelimit.limit(identifier);

  return {
    success,
    limit,
    reset,
    remaining,
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': reset.toString()
    }
  };
});

// Helper to check if rate limit response indicates too many requests
export function isTooManyRequests(rateLimitResponse: Awaited<ReturnType<typeof getRateLimit>>) {
  return !rateLimitResponse.success;
}

// Helper to create rate limit error response
export function createRateLimitResponse(rateLimitResponse: Awaited<ReturnType<typeof getRateLimit>>) {
  return new Response('Too Many Requests', {
    status: 429,
    headers: rateLimitResponse.headers
  });
} 