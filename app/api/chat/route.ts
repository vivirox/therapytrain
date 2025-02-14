import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ZKMessage, ZKChatMessage } from '@/lib/zk/types';
import { encrypt, decrypt, generateMessageId } from '@/lib/zk/crypto';
import { getSession, getOrCreateSharedKey } from '@/lib/zk/session';
import { cache, invalidateByPattern } from '@/lib/redis';
import { cacheConfig } from '@/config/cache.config';
import routeMessage from '@/services/router';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { HumanMessage, AIMessage } from 'langchain/schema';
import { LangChainStream, StreamingTextResponse } from 'ai';
import { Logger } from '@/lib/logger';
import { ConnectionStore } from '@/lib/services/ConnectionStore';
import { InstanceManager } from '@/lib/services/InstanceManager';
import { RateLimiter } from '@/lib/services/RateLimiter';
import { ResourceMonitor } from '@/lib/services/ResourceMonitor';
import { ZKSession } from '../../lib/zk/types';
import { decryptMessage } from '../../lib/zk/crypto';
import { getRedisClient } from '../../lib/redis';
import { router } from '../../services/router';

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

// Initialize logger
const logger = Logger.getInstance();

// Initialize connection store
const connectionStore = ConnectionStore.getInstance();

// Initialize instance manager
const instanceManager = InstanceManager.getInstance();

// Initialize rate limiter
const rateLimiter = RateLimiter.getInstance();

// Initialize resource monitor
const resourceMonitor = ResourceMonitor.getInstance();

// Register this instance
instanceManager.registerInstance().catch(error => {
  logger.error('Failed to register instance', error as Error);
});

// Start resource monitoring
resourceMonitor.startMonitoring();

// Handle instance shutdown
process.on('SIGTERM', async () => {
  try {
    await instanceManager.drainInstance();
    await instanceManager.deregisterInstance();
    resourceMonitor.stopMonitoring();
    process.exit(0);
  } catch (error) {
    logger.error('Error during instance shutdown', error as Error);
    process.exit(1);
  }
});

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
  
  try {
    const json = await req.json();
    const { messages, recipientId, threadId, parentMessageId } = json;
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      await logger.warn('Unauthorized message send attempt', { recipientId, threadId });
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Check rate limit for sending messages
    const rateLimitInfo = await rateLimiter.checkLimit(session.user.id, 'messages');
    if (rateLimitInfo.remaining === 0) {
      const response = new NextResponse('Rate limit exceeded', { status: 429 });
      addRateLimitHeaders(response.headers, rateLimitInfo);
      return response;
    }

    const userSession = await getSession(session.user.id);
    if (!userSession) {
      await logger.error('Session not found', null, { userId: session.user.id });
      return new NextResponse('Session not found', { status: 404 });
    }

    // Get recipient's public key
    const { data: recipientData } = await supabase
      .from('user_keys')
      .select('public_key')
      .eq('user_id', recipientId)
      .single();

    if (!recipientData) {
      await logger.error('Recipient not found', null, { recipientId });
      return new NextResponse('Recipient not found', { status: 404 });
    }

    // Get or create shared key
    const sharedKey = await getOrCreateSharedKey(
      userSession,
      recipientId,
      recipientData.public_key
    );

    // Set up streaming for AI response
    const { stream, handlers } = LangChainStream();

    // Initialize chat model
    const chat = new ChatOpenAI({
      modelName: 'gpt-4',
      streaming: true,
      temperature: 0.7,
    });

    // Convert messages to LangChain format
    const langchainMessages = messages.map((m: ZKChatMessage) => 
      m.role === 'user' 
        ? new HumanMessage(m.decryptedContent || '')
        : new AIMessage(m.decryptedContent || '')
    );

    // Start AI response generation
    chat.call(langchainMessages, {}, [handlers]);

    // Encrypt and store user message
    const messageId = generateMessageId();
    const encryptedPayload = await encrypt(messages[messages.length - 1].content, sharedKey);

    const message: ZKMessage = {
      id: messageId,
      senderId: session.user.id,
      recipientId,
      encryptedContent: encryptedPayload.content,
      iv: encryptedPayload.iv,
      timestamp: Date.now(),
      thread_id: threadId,
      parent_message_id: parentMessageId,
    };

    // Store message in Supabase
    await supabase.from('messages').insert([message]);

    // Invalidate cache for both participants
    await Promise.all([
      invalidateByPattern(`chat:${session.user.id}:*`, true),
      invalidateByPattern(`chat:${recipientId}:*`, true)
    ]);

    // Increment message rate limit counter
    await rateLimiter.incrementCounter(session.user.id, 'messages');

    // Track request duration
    const duration = Date.now() - startTime;
    await Promise.all([
      logger.trackRequest(duration),
      resourceMonitor.trackRequest(duration)
    ]);

    await logger.info('Message sent successfully', { 
      userId: session.user.id,
      recipientId,
      threadId,
      messageId
    });

    // Return streaming response
    const response = new StreamingTextResponse(stream);
    addRateLimitHeaders(response.headers, rateLimitInfo);
    return response;
  } catch (error) {
    await logger.error('Error sending message', error as Error);
    await resourceMonitor.trackError();
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 