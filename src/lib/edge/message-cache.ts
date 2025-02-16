import { kv } from '@vercel/kv';
import { cache } from 'react';

const MESSAGE_CACHE_PREFIX = 'chat:messages:';
const THREAD_CACHE_PREFIX = 'chat:threads:';
const CACHE_TTL = 60 * 60; // 1 hour

interface CachedMessage {
  id: string;
  thread_id: string;
  user_id: string;
  content: string;
  role: string;
  created_at: string;
}

// Cache message retrieval
export const getCachedMessages = cache(async (threadId: string): Promise<CachedMessage[]> => {
  const cacheKey = `${THREAD_CACHE_PREFIX}${threadId}`;
  const cachedMessages = await kv.get<CachedMessage[]>(cacheKey);
  
  if (cachedMessages) {
    return cachedMessages;
  }
  
  return [];
});

// Store message in cache
export const cacheMessage = cache(async (message: CachedMessage) => {
  const messageKey = `${MESSAGE_CACHE_PREFIX}${message.id}`;
  const threadKey = `${THREAD_CACHE_PREFIX}${message.thread_id}`;
  
  // Store individual message
  await kv.set(messageKey, message, { ex: CACHE_TTL });
  
  // Update thread cache
  const threadMessages = await getCachedMessages(message.thread_id);
  await kv.set(threadKey, [...threadMessages, message], { ex: CACHE_TTL });
  
  return message;
});

// Invalidate message cache
export const invalidateMessageCache = cache(async (threadId: string) => {
  const threadKey = `${THREAD_CACHE_PREFIX}${threadId}`;
  await kv.del(threadKey);
});

// Get cached message by ID
export const getCachedMessage = cache(async (messageId: string): Promise<CachedMessage | null> => {
  const messageKey = `${MESSAGE_CACHE_PREFIX}${messageId}`;
  return await kv.get<CachedMessage>(messageKey);
});

// Update cached message
export const updateCachedMessage = cache(async (messageId: string, updates: Partial<CachedMessage>) => {
  const message = await getCachedMessage(messageId);
  
  if (!message) {
    return null;
  }
  
  const updatedMessage = { ...message, ...updates };
  await cacheMessage(updatedMessage);
  
  return updatedMessage;
}); 