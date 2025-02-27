import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ZKMessage } from '@/lib/zk/types';
import { encrypt, decrypt, generateMessageId } from '@/lib/zk/crypto';
import { getSession, getOrCreateSharedKey } from '@/lib/zk/session';
import { cache, invalidateByPattern } from '@/lib/redis';
import { cacheConfig } from '@/config/cache.config';
import { ChatEncryptionService } from '@/app/chat/ChatEncryptionService';
import { LangChainStream } from '@/lib/langchain/stream';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { StreamingTextResponse } from '@/lib/streaming-text-response';
import { MetricsService } from '@/lib/metrics';
import { Logger } from '@/lib/logger';
import { ResourceMonitor } from '@/lib/monitoring';

// Initialize services
const metrics = new MetricsService();
const logger = new Logger('chat-api');
const resourceMonitor = new ResourceMonitor();

// Resource limits
const MAX_MESSAGE_LENGTH = 4000;
const MAX_CONCURRENT_REQUESTS = 50;
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Enable edge runtime
export const runtime = 'edge';
export const preferredRegion = 'auto';
export const dynamic = 'force-dynamic';

// Cache configuration
const CACHE_REVALIDATION_TIME = 60; // 1 minute
const MESSAGE_CACHE_TIME = 300; // 5 minutes
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: fetch.bind(globalThis),
    },
  }
);

// Initialize encryption service
const encryptionService = new ChatEncryptionService();

// Helper function to generate cache key
function generateCacheKey(userId: string, threadId?: string) {
  return `chat:${userId}:${threadId || 'direct'}`;
}

// Update the sendSSEEvent function to use ConnectionStore
async function sendSSEEvent(clientId: string, event: any) {
  try {
    await connectionStore.sendEvent(clientId, event);
  } catch (error) {
    console.error(`Error sending event to client ${clientId}:`, error);
    await connectionStore.removeConnection(clientId);
  }
}

// Update the cleanupClient function to use ConnectionStore
async function cleanupClient(clientId: string) {
  try {
    await connectionStore.removeConnection(clientId);
    console.log(`Client ${clientId} cleaned up`);
  } catch (error) {
    console.error(`Error cleaning up client ${clientId}:`, error);
  }
}

// Helper function to add rate limit headers
function addRateLimitHeaders(headers: Headers, rateLimitInfo: { remaining: number; reset: number; total: number }) {
  headers.set('X-RateLimit-Limit', rateLimitInfo.total.toString());
  headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
  headers.set('X-RateLimit-Reset', rateLimitInfo.reset.toString());
}

// Main GET handler for SSE connection and message history
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const threadId = searchParams.get('threadId');
  const mode = searchParams.get('mode');

  try {
    // Validate required parameters
    if (!userId) {
      await logger.warn('Missing userId in request', { userId, threadId, mode });
      return new NextResponse('Missing userId', { status: 400 });
    }

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      await logger.warn('Unauthorized request', { userId });
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Handle message history request
    if (mode === 'history') {
      // Check rate limit for history requests
      const rateLimitInfo = await rateLimiter.checkLimit(userId, 'history');
      if (rateLimitInfo.remaining === 0) {
        const response = new NextResponse('Rate limit exceeded', { status: 429 });
        addRateLimitHeaders(response.headers, rateLimitInfo);
        return response;
      }

      const cacheKey = generateCacheKey(session.user.id, threadId || undefined);
      
      try {
        const messages = await cache(
          cacheKey,
          async () => {
            const userSession = await getSession(session.user.id);
            if (!userSession) {
              throw new Error('Session not found');
            }

            let query = supabase
              .from('messages')
              .select('*')
              .order('timestamp', { ascending: true });

            if (threadId) {
              query = query.eq('thread_id', threadId);
            } else {
              query = query.or(`senderId.eq.${session.user.id},recipientId.eq.${session.user.id}`);
            }

            const { data: messages } = await query;
            return messages || [];
          },
          MESSAGE_CACHE_TIME
        );

        // Increment rate limit counter
        await rateLimiter.incrementCounter(userId, 'history');

        await logger.trackRequest(Date.now() - startTime);
        await logger.info('Message history fetched', { userId, threadId, messageCount: messages.length });
        
        const response = NextResponse.json({ messages });
        addRateLimitHeaders(response.headers, rateLimitInfo);
        return response;
      } catch (error) {
        await logger.error('Error fetching message history', error as Error, { userId, threadId });
        return new NextResponse('Internal Server Error', { status: 500 });
      }
    }

    // Handle SSE connection
    if (!threadId) {
      await logger.warn('Missing threadId for SSE connection', { userId });
      return new NextResponse('Missing threadId for SSE connection', { status: 400 });
    }

    // Check rate limit for new connections
    const rateLimitInfo = await rateLimiter.checkLimit(userId, 'connections');
    if (rateLimitInfo.remaining === 0) {
      const response = new NextResponse('Rate limit exceeded', { status: 429 });
      addRateLimitHeaders(response.headers, rateLimitInfo);
      return response;
    }

    // Select appropriate instance for this connection
    const selectedInstance = await instanceManager.selectInstanceForConnection(userId);
    
    // If no healthy instances available
    if (!selectedInstance) {
      await logger.error('No healthy instances available', null, { userId });
      return new NextResponse('Service unavailable', { status: 503 });
    }

    // If selected instance is not this instance, redirect
    if (selectedInstance.instanceId !== instanceManager.instanceId) {
      const redirectUrl = new URL(req.url);
      redirectUrl.host = selectedInstance.host;
      redirectUrl.port = selectedInstance.port.toString();
      
      await logger.info('Redirecting to selected instance', {
        userId,
        fromInstance: instanceManager.instanceId,
        toInstance: selectedInstance.instanceId,
      });

      return NextResponse.redirect(redirectUrl.toString());
    }

    const stream = new ReadableStream({
      start: async (controller) => {
        const clientId = `${userId}-${Date.now()}`;

        // Add connection to ConnectionStore
        await connectionStore.addConnection({
          userId: userId!,
          threadId,
          clientId,
          lastActive: Date.now(),
          controller,
        });

        // Increment connection rate limit counter
        await rateLimiter.incrementCounter(userId, 'connections');

        await logger.info('Client connected', { clientId, userId, threadId });

        // Set up heartbeat interval
        const heartbeatInterval = setInterval(async () => {
          try {
            await sendSSEEvent(clientId, { type: 'heartbeat', timestamp: Date.now() });
          } catch (error) {
            clearInterval(heartbeatInterval);
          }
        }, HEARTBEAT_INTERVAL);

        // Send initial connection success event
        await sendSSEEvent(clientId, {
          type: 'connected',
          clientId,
          timestamp: Date.now()
        });

        // Subscribe to Supabase realtime changes
        const subscription = supabase
          .channel(`chat_thread_${threadId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'messages',
              filter: `thread_id=eq.${threadId}`,
            },
            async (payload) => {
              await sendSSEEvent(clientId, {
                type: 'message',
                payload: payload.new,
                timestamp: Date.now()
              });
            }
          )
          .subscribe();

        // Clean up on connection close
        req.signal.addEventListener('abort', async () => {
          subscription.unsubscribe();
          clearInterval(heartbeatInterval);
          await cleanupClient(clientId);
          await logger.info('Client disconnected', { clientId, userId, threadId });
        });
      },
      cancel() {
        // Cleanup will be handled by the abort event listener
      }
    });

    // Track request duration
    const duration = Date.now() - startTime;
    await Promise.all([
      logger.trackRequest(duration),
      resourceMonitor.trackRequest(duration)
    ]);

    const response = new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    addRateLimitHeaders(response.headers, rateLimitInfo);
    return response;
  } catch (error) {
    await logger.error('Unexpected error in GET handler', error as Error);
    await resourceMonitor.trackError();
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// POST handler for sending messages
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = generateMessageId();
  
  try {
    // Start monitoring request
    await resourceMonitor.startRequest(requestId);
    
    const json = await req.json();
    const { message, recipientId, threadId } = json;

    // Validate message length
    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new Error('Message exceeds maximum length');
    }

    // Check concurrent requests
    if (!await resourceMonitor.canAcceptRequest()) {
      throw new Error('Too many concurrent requests');
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      await logger.warn('Unauthorized message send attempt', { recipientId, threadId, requestId });
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Check rate limit with enhanced monitoring
    const rateLimitInfo = await rateLimiter.checkLimit(session.user.id, 'messages');
    await metrics.incrementCounter('rate_limit_check', { userId: session.user.id });
    
    if (rateLimitInfo.remaining === 0) {
      await metrics.incrementCounter('rate_limit_exceeded', { userId: session.user.id });
      const response = new NextResponse('Rate limit exceeded', { status: 429 });
      addRateLimitHeaders(response.headers, rateLimitInfo);
      return response;
    }

    // Set up request timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
    );

    // Encrypt and store message with timeout
    const messagePromise = Promise.race([
      encryptionService.encryptMessage(message, session.user.id, recipientId),
      timeoutPromise
    ]);

    const encryptedMessage = await messagePromise;
    await metrics.timing('message_encryption', Date.now() - startTime);

    await encryptionService.storeMessage(encryptedMessage);
    await metrics.incrementCounter('message_stored');

    // Create streaming response with monitoring
    const { stream, handlers } = LangChainStream({
      onToken: () => metrics.incrementCounter('tokens_generated'),
      onComplete: () => metrics.incrementCounter('responses_completed'),
      onError: (error) => {
        metrics.incrementCounter('stream_errors');
        logger.error('Streaming error', error);
      }
    });

    // Initialize chat model with monitoring
    const chat = new ChatOpenAI({
      modelName: 'gpt-4',
      streaming: true,
      temperature: 0.7,
      callbacks: [{
        handleLLMStart: () => metrics.incrementCounter('llm_requests'),
        handleLLMError: (error) => {
          metrics.incrementCounter('llm_errors');
          logger.error('LLM error', error);
        }
      }]
    });

    // Convert message to LangChain format
    const langchainMessages = [new HumanMessage(message)];

    // Start AI response generation with monitoring
    chat.call(langchainMessages, {}, [handlers]);

    // Invalidate cache for both participants
    await Promise.all([
      invalidateByPattern(`chat:${session.user.id}:*`, true),
      invalidateByPattern(`chat:${recipientId}:*`, true)
    ]);

    // Increment message rate limit counter
    await rateLimiter.incrementCounter(session.user.id, 'messages');

    // Track request metrics
    const duration = Date.now() - startTime;
    await Promise.all([
      metrics.timing('request_duration', duration),
      resourceMonitor.trackRequest(duration),
      logger.info('Message sent successfully', { 
        userId: session.user.id,
        recipientId,
        threadId,
        messageId: encryptedMessage.id,
        duration,
        requestId
      })
    ]);

    // Return streaming response with monitoring headers
    const response = new StreamingTextResponse(stream);
    addRateLimitHeaders(response.headers, rateLimitInfo);
    response.headers.set('X-Request-ID', requestId);
    response.headers.set('X-Response-Time', duration.toString());
    return response;
  } catch (error) {
    // Enhanced error handling with monitoring
    const duration = Date.now() - startTime;
    await Promise.all([
      metrics.incrementCounter('errors', { type: error.name }),
      logger.error('Chat error', {
        error,
        requestId,
        duration,
        stack: error.stack
      }),
      resourceMonitor.trackError(error)
    ]);

    // Clean up resources
    await resourceMonitor.endRequest(requestId);

    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal Server Error',
        requestId,
        message: error.message
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'X-Response-Time': duration.toString()
        }
      }
    );
  } finally {
    // Ensure resources are cleaned up
    await resourceMonitor.endRequest(requestId);
  }
} 