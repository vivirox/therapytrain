import { kv } from '@vercel/kv';
import { cache } from 'react';
import { nanoid } from 'nanoid';
import { ZKChatMessage, ZKSession } from '@/lib/zk/types';
import { Logger } from '@/lib/logger';

const logger = new Logger('chat-cache');

// Cache configuration
const CACHE_CONFIG = {
  ttl: {
    message: 300, // 5 minutes
    thread: 600, // 10 minutes
    session: 1800, // 30 minutes
    presence: 60, // 1 minute
  },
  prefix: {
    message: 'chat:message:',
    thread: 'chat:thread:',
    session: 'chat:session:',
    presence: 'chat:presence:',
  },
  maxBatchSize: 50,
};

// Types
interface CacheOptions {
  ttl?: number;
  tags?: string[];
  coalesce?: boolean;
}

interface ThreadCache {
  id: string;
  messages: ZKChatMessage[];
  lastUpdated: string;
  participantIds: string[];
  metadata: Record<string, any>;
}

interface PresenceInfo {
  userId: string;
  threadId: string;
  lastSeen: string;
  isTyping: boolean;
}

// Message caching
export const cacheMessage = cache(async (
  message: ZKChatMessage,
  options: CacheOptions = {}
) => {
  const {
    ttl = CACHE_CONFIG.ttl.message,
    tags = [],
  } = options;

  try {
    // Cache individual message
    const messageKey = `${CACHE_CONFIG.prefix.message}${message.id}`;
    await kv.set(messageKey, message, { ex: ttl });

    // Update thread cache
    const threadKey = `${CACHE_CONFIG.prefix.thread}${message.threadId}`;
    const threadCache = await kv.get<ThreadCache>(threadKey);

    if (threadCache) {
      threadCache.messages.push(message);
      threadCache.lastUpdated = new Date().toISOString();
      await kv.set(threadKey, threadCache, { ex: CACHE_CONFIG.ttl.thread });
    }

    // Store tags if any
    if (tags.length > 0) {
      await kv.sadd(`${messageKey}:tags`, ...tags);
    }

    return message;
  } catch (error) {
    logger.error('Failed to cache message', error as Error);
    throw error;
  }
});

// Thread caching
export const cacheThread = cache(async (
  threadId: string,
  messages: ZKChatMessage[],
  metadata: Record<string, any> = {},
  options: CacheOptions = {}
) => {
  const {
    ttl = CACHE_CONFIG.ttl.thread,
    tags = [],
  } = options;

  try {
    const threadKey = `${CACHE_CONFIG.prefix.thread}${threadId}`;
    const threadCache: ThreadCache = {
      id: threadId,
      messages,
      lastUpdated: new Date().toISOString(),
      participantIds: [...new Set(messages.map(m => m.senderId))],
      metadata,
    };

    await kv.set(threadKey, threadCache, { ex: ttl });

    if (tags.length > 0) {
      await kv.sadd(`${threadKey}:tags`, ...tags);
    }

    return threadCache;
  } catch (error) {
    logger.error('Failed to cache thread', error as Error);
    throw error;
  }
});

// Presence tracking
export const updatePresence = cache(async (
  userId: string,
  threadId: string,
  isTyping: boolean = false
) => {
  try {
    const presenceKey = `${CACHE_CONFIG.prefix.presence}${threadId}:${userId}`;
    const presenceInfo: PresenceInfo = {
      userId,
      threadId,
      lastSeen: new Date().toISOString(),
      isTyping,
    };

    await kv.set(presenceKey, presenceInfo, { ex: CACHE_CONFIG.ttl.presence });
    return presenceInfo;
  } catch (error) {
    logger.error('Failed to update presence', error as Error);
    throw error;
  }
});

// Get thread participants' presence
export const getThreadPresence = cache(async (threadId: string): Promise<PresenceInfo[]> => {
  try {
    const pattern = `${CACHE_CONFIG.prefix.presence}${threadId}:*`;
    const keys = await kv.keys(pattern);
    
    if (keys.length === 0) {
      return [];
    }

    const presenceInfos = await kv.mget<PresenceInfo[]>(...keys);
    return presenceInfos.filter(Boolean);
  } catch (error) {
    logger.error('Failed to get thread presence', error as Error);
    return [];
  }
});

// Get cached thread
export const getCachedThread = cache(async (
  threadId: string
): Promise<ThreadCache | null> => {
  try {
    const threadKey = `${CACHE_CONFIG.prefix.thread}${threadId}`;
    return await kv.get<ThreadCache>(threadKey);
  } catch (error) {
    logger.error('Failed to get cached thread', error as Error);
    return null;
  }
});

// Get cached message
export const getCachedMessage = cache(async (
  messageId: string
): Promise<ZKChatMessage | null> => {
  try {
    const messageKey = `${CACHE_CONFIG.prefix.message}${messageId}`;
    return await kv.get<ZKChatMessage>(messageKey);
  } catch (error) {
    logger.error('Failed to get cached message', error as Error);
    return null;
  }
});

// Batch get messages
export const batchGetMessages = cache(async (
  messageIds: string[]
): Promise<(ZKChatMessage | null)[]> => {
  try {
    const messageKeys = messageIds.map(id => `${CACHE_CONFIG.prefix.message}${id}`);
    return await kv.mget<ZKChatMessage[]>(...messageKeys);
  } catch (error) {
    logger.error('Failed to batch get messages', error as Error);
    return messageIds.map(() => null);
  }
});

// Cache invalidation
export const invalidateMessage = cache(async (messageId: string): Promise<void> => {
  try {
    const messageKey = `${CACHE_CONFIG.prefix.message}${messageId}`;
    await kv.del(messageKey);
  } catch (error) {
    logger.error('Failed to invalidate message', error as Error);
  }
});

export const invalidateThread = cache(async (threadId: string): Promise<void> => {
  try {
    const threadKey = `${CACHE_CONFIG.prefix.thread}${threadId}`;
    await kv.del(threadKey);
  } catch (error) {
    logger.error('Failed to invalidate thread', error as Error);
  }
});

export const invalidatePresence = cache(async (
  userId: string,
  threadId: string
): Promise<void> => {
  try {
    const presenceKey = `${CACHE_CONFIG.prefix.presence}${threadId}:${userId}`;
    await kv.del(presenceKey);
  } catch (error) {
    logger.error('Failed to invalidate presence', error as Error);
  }
}); 