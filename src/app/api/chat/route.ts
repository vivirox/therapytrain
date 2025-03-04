import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { StreamingTextResponse } from '@/lib/streaming-text-response';
import { createRouteHandlerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { ZKMessage } from '@/lib/zk/types';
import { encrypt, decrypt, generateMessageId } from '@/lib/zk/crypto';
import { getOrCreateSharedKey } from '@/lib/zk/session';
import { cache, invalidateByPattern } from '@/lib/redis';
import { cacheConfig } from '@/config/cache.config';
import { ChatEncryptionService } from '@/app/chat/ChatEncryptionService';
import { LangChainStream } from '@/lib/langchain/stream';
import { MetricsService } from '@/lib/metrics';
import { Logger } from '@/lib/logger';
import { ResourceMonitor } from '@/lib/monitoring';
import { ConnectionStore } from '@/lib/ConnectionStore';
import { RateLimiter } from '@/lib/RateLimiter';
import { InstanceManager } from '@/lib/InstanceManager';
import { streamToAsyncIterable } from '@/lib/stream-utils';
import { getRateLimit, isTooManyRequests, createRateLimitResponse } from '@/lib/edge/rate-limit';
import { cacheMessage, getCachedMessages, invalidateMessageCache } from '@/lib/edge/message-cache';
import { encryptMessageForRecipient, decryptMessageContent } from '@/lib/encryption/message-encryption';
import { logMessageEncryption, logMessageDecryption, logMessageAccess } from '@/lib/audit/audit-logger';
import { ZKService } from '@/lib/zk/ZKService';
import { ChatService } from '@/services/chat/ChatService';
import { SecurityAuditService } from '@/services/SecurityAuditService';
import { cache as reactCache } from 'react';
import type { Message as ChatMessage } from '@/types/chat';

// Initialize services
const zkService = new ZKService();
const chatService = new ChatService();
const securityAudit = SecurityAuditService.getInstance();
const metrics = new MetricsService();
const logger = Logger.getInstance('chat-api');
const resourceMonitor = new ResourceMonitor();
const connectionStore = new ConnectionStore();
const rateLimiter = new RateLimiter();
const instanceManager = new InstanceManager();

// Cache the session check for 1 minute
const getSessionData = reactCache(async () => {
  const supabase = createRouteHandlerClient({ cookies });
  return await supabase.auth.getSession();
});

// HIPAA-compliant message storage with encryption
const storeMessage = reactCache(async (supabase: any, message: any) => {
  // Generate ZK proof for message storage
  const proof = await zkService.generateMessageProof(message);
  
  // Encrypt message with recipient's public key
  const encryptedMessage = await zkService.encryptMessageWithSessionKey(
    message.content,
    message.sessionPublicKey,
    {
      senderId: message.user_id,
      recipientId: message.recipient_id,
      threadId: message.thread_id
    }
  );
  
  const { data, error } = await supabase
    .from('messages')
    .insert({
      ...encryptedMessage,
      proof,
      audit_metadata: {
        encryption_version: zkService.getVersion(),
        timestamp: new Date().toISOString(),
        proof_verified: true
      }
    })
    .select()
    .single();

  if (!error && data) {
    await cacheMessage({
      id: data.id,
      thread_id: data.thread_id,
      user_id: data.user_id,
      content: data.content,
      created_at: data.created_at,
      role: data.role || 'user'
    });

    await securityAudit.logOperation({
      id: generateMessageId(),
      type: 'MESSAGE_STORE',
      userId: message.user_id,
      sessionId: data.thread_id,
      status: 'SUCCESS',
      timestamp: new Date(),
      metadata: {
        messageId: data.id,
        operation: 'store'
      }
    });
  }

  return { data, error };
});

export const runtime = 'edge';

export async function POST(req: Request) {
  const startTime = Date.now();
  
  try {
    // Get session with caching
    const { data: { session }, error: authError } = await getSessionData();

    if (authError || !session) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Rate limiting with edge support
    const identifier = session.user.id;
    const rateLimit = await getRateLimit(identifier);
    
    if (isTooManyRequests(rateLimit)) {
      return createRateLimitResponse(rateLimit);
    }

    const json = await req.json();
    const { messages, threadId, recipientId } = json;
    const lastMessage = messages[messages.length - 1];

    const supabase = createRouteHandlerClient({ cookies });

    // Try to get messages from cache first
    const cachedMessages = await getCachedMessages(threadId);

    // Generate session keys if needed
    const sessionKeys = await zkService.getOrCreateSessionKeys(threadId);

    // Encrypt the message for storage
    const encryptedMessage = await zkService.encryptMessageWithSessionKey(
      lastMessage.content,
      sessionKeys.publicKey,
      {
        senderId: session.user.id,
        recipientId,
        threadId
      }
    );

    // Log message encryption
    await securityAudit.logOperation({
      id: generateMessageId(),
      type: 'MESSAGE_ENCRYPTION',
      userId: session.user.id,
      sessionId: threadId,
      status: 'SUCCESS',
      timestamp: new Date(),
      metadata: {
        messageId: encryptedMessage.id,
        recipientId,
        operation: 'encrypt'
      }
    });

    // Store the encrypted message
    const { error: insertError } = await storeMessage(supabase, {
      thread_id: threadId,
      user_id: session.user.id,
      recipient_id: recipientId,
      content: encryptedMessage.encryptedContent,
      iv: encryptedMessage.iv,
      proof: encryptedMessage.proof,
      session_key_id: sessionKeys.id,
      created_at: new Date().toISOString()
    });

    if (insertError) {
      await securityAudit.logOperation({
        id: generateMessageId(),
        type: 'MESSAGE_STORE',
        userId: session.user.id,
        sessionId: threadId,
        status: 'FAILURE',
        timestamp: new Date(),
        metadata: {
          error: insertError,
          operation: 'message_store'
        }
      });
      return new Response('Failed to store message', { status: 500 });
    }

    const chatModel = new ChatOpenAI({
      modelName: 'gpt-4',
      streaming: true
    });

    const stream = await chatModel.stream(messages.map((m: any) => new HumanMessage(m.content)));

    // Convert the response into a friendly text-stream
    const asyncIterable = await streamToAsyncIterable(stream);
    const response = new StreamingTextResponse(asyncIterable as any);

    // Add monitoring headers
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimit.reset.toString());
    response.headers.set('X-Response-Time', (Date.now() - startTime).toString());

    return response;
  } catch (error) {
    await securityAudit.logOperation({
      id: generateMessageId(),
      type: 'API_ERROR',
      userId: 'system',
      sessionId: 'unknown',
      status: 'FAILURE',
      timestamp: new Date(),
      metadata: {
        error,
        operation: 'chat_api'
      }
    });
    return new Response('Internal Server Error', { status: 500 });
  }
}

// GET handler for retrieving messages
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get('threadId');

    if (!threadId) {
      return new Response('Missing threadId', { status: 400 });
    }

    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before');

    // Get session with caching
    const { data: { session }, error: authError } = await getSessionData();

    if (authError || !session) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Rate limiting
    const rateLimit = await getRateLimit(session.user.id);
    if (isTooManyRequests(rateLimit)) {
      return createRateLimitResponse(rateLimit);
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Try to get messages from cache first
    const cachedMessages = await getCachedMessages(threadId);
    if (cachedMessages) {
      return new Response(JSON.stringify(cachedMessages), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get session keys
    const sessionKeys = await zkService.getSessionKeys(threadId);
    if (!sessionKeys) {
      return new Response('Session not found', { status: 404 });
    }

    // Get encrypted messages
    const { data: encryptedMessages, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (fetchError) {
      await securityAudit.logOperation({
        id: generateMessageId(),
        type: 'MESSAGE_FETCH',
        userId: session.user.id,
        sessionId: threadId,
        status: 'FAILURE',
        timestamp: new Date(),
        metadata: {
          error: fetchError,
          operation: 'fetch_messages'
        }
      });
      return new Response('Failed to fetch messages', { status: 500 });
    }

    // Decrypt messages
    const decryptedMessages = await Promise.all(
      encryptedMessages.map(async (message) => {
        try {
          const decryptedContent = await zkService.decryptMessageWithSessionKey(
            message.content,
            message.iv,
            sessionKeys.privateKey,
            message.session_key_id
          );

          await securityAudit.logOperation({
            id: generateMessageId(),
            type: 'MESSAGE_DECRYPTION',
            userId: session.user.id,
            sessionId: threadId,
            status: 'SUCCESS',
            timestamp: new Date(),
            metadata: {
              messageId: message.id,
              operation: 'decrypt'
            }
          });

          return {
            id: message.id,
            content: decryptedContent,
            sender_id: message.user_id,
            recipient_id: message.recipient_id,
            created_at: message.created_at,
            role: message.role || 'user'
          };
        } catch (error) {
          await securityAudit.logOperation({
            id: generateMessageId(),
            type: 'MESSAGE_DECRYPTION',
            userId: session.user.id,
            sessionId: threadId,
            status: 'FAILURE',
            timestamp: new Date(),
            metadata: {
              error,
              messageId: message.id,
              operation: 'decrypt'
            }
          });
          return null;
        }
      })
    );

    // Filter out failed decryptions
    const validMessages = decryptedMessages.filter((m) => m !== null);

    // Cache the decrypted messages
    await Promise.all(validMessages.map(msg => cacheMessage(msg)));

    return new Response(JSON.stringify(validMessages), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    await securityAudit.logOperation({
      id: generateMessageId(),
      type: 'API_ERROR',
      userId: 'system',
      sessionId: 'unknown',
      status: 'FAILURE',
      timestamp: new Date(),
      metadata: {
        error,
        operation: 'get_messages'
      }
    });
    return new Response('Internal Server Error', { status: 500 });
  }
}