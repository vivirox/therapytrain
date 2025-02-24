import { vi } from 'vitest'

// Mock environment variables for tests
vi.mock('../env', () => ({
  env: {
    UPSTASH_REDIS_REST_URL: 'http://test-redis-url',
    UPSTASH_REDIS_REST_TOKEN: 'test-token',
    // Add other required env vars here
  },
  validateEnv: vi.fn().mockReturnValue(true)
})) 