export const cacheConfig = {
  redis: {
    ttl: {
      messages: 300, // 5 minutes
      sessions: 3600, // 1 hour
      sharedKeys: 3600 * 24, // 24 hours
    },
    patterns: {
      messages: 'chat:*',
      sessions: 'session:*',
      sharedKeys: 'shared:*',
    },
  },
  memory: {
    maxSize: 1000,
    ttl: 300, // 5 minutes
  },
}; 