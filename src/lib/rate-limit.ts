import { kv } from '@vercel/kv';
import { Ratelimit } from '@upstash/ratelimit';

// Create a new ratelimiter that allows 10 requests per minute
const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: 'ratelimit',
});

export async function rateLimit(identifier: string) {
  const { success, limit, reset, remaining } = await ratelimit.limit(identifier);

  return {
    success,
    limit,
    reset,
    remaining,
  };
} 