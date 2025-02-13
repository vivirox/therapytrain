import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ZKMessage, ZKChatMessage } from '@/lib/zk/types';
import { encrypt, decrypt, generateMessageId } from '@/lib/zk/crypto';
import { getSession, getOrCreateSharedKey } from '@/lib/zk/session';
import { cache, invalidateByPattern } from '@/lib/redis';
import { cacheConfig } from '@/config/cache.config';
import routeMessage from '@/services/router';

// Enable edge runtime
export const runtime = 'edge';
export const preferredRegion = 'auto';
export const dynamic = 'force-dynamic';

// Cache configuration
const CACHE_REVALIDATION_TIME = 60; // 1 minute
const MESSAGE_CACHE_TIME = 300; // 5 minutes

// Initialize Supabase client with custom fetch for edge runtime
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

// Helper function to generate cache key
function generateCacheKey(userId: string, threadId?: string) {
  return `chat:${userId}:${threadId || 'direct'}`;
}

const connectedClients = new Map<string, { response: NextResponse, threadId: string }>();

function sendSSEEvent(clientId: string, event: any) {
  const client = connectedClients.get(clientId);
  if (client) {
    const encoder = new TextEncoder();
    client.response.writableStream.write(encoder.encode(`data: ${JSON.stringify(event)}

`));
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') as string;
  const threadId = searchParams.get('threadId') as string;

  if (!userId || !threadId) {
    return new NextResponse('Missing userId or threadId', { status: 400 });
  }

  return new ReadableStream({
    start(controller) {
      const response = new NextResponse(controller.desiredSize);
      response.headers.set('Content-Type', 'text/event-stream');
      response.headers.set('Cache-Control', 'no-cache');
      response.headers.set('Connection', 'keep-alive');

      const clientId = `${userId}-${Date.now()}`;
      connectedClients.set(clientId, { response, threadId });

      console.log(`Client ${clientId} connected`);
      controller.enqueue(`data: ${JSON.stringify({ type: 'status', payload: { status: 'connected' } })}

`);

      req.onclose = () => {
        connectedClients.delete(clientId);
        console.log(`Client ${clientId} disconnected`);
        controller.close();
      };

      supabase
        .channel(`chat_thread_${threadId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `thread_id=eq.${threadId}`,
          },
          (payload) => {
            console.log('Received message:', payload);
            sendSSEEvent(clientId, { type: 'message', payload: payload.new });
          }
        )
        .subscribe();
    },
    cancel() {
      console.log('Stream cancelled');
    }
  }).pipeThrough(new TextEncoder().writable)
    .pipeTo(new WritableStream({ write(chunk) { } }));
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { messages, recipientId, threadId, parentMessageId } = json;
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userSession = await getSession(session.user.id);
    if (!userSession) {
      return new NextResponse('Session not found', { status: 404 });
    }

    // Get recipient's public key from Supabase
    const { data: recipientData } = await supabase
      .from('user_keys')
      .select('public_key')
      .eq('user_id', recipientId)
      .single();

    if (!recipientData) {
      return new NextResponse('Recipient not found', { status: 404 });
    }

    // Get or create shared key for the recipient
    const sharedKey = await getOrCreateSharedKey(
      userSession,
      recipientId,
      recipientData.public_key
    );

    // Create streaming response
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

    // Start streaming response
    chat.call(langchainMessages, {}, [handlers]);

    // Encrypt and store message
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

        // Send SSE event to connected clients
    const sseEvent = {
      type: 'message',
      payload: message,
    };

    connectedClients.forEach((client, clientId) => {
      if (client.threadId === threadId && client.response) {
        sendSSEEvent(clientId, sseEvent);
      }
    });

    // Call the routeMessage function to handle the user's message
    const aiResponse = await routeMessage(messages[messages.length - 1].content);

    // Send the AI response back to the client
    return new NextResponse(aiResponse as string, { status: 200 });

    await Promise.all([
      invalidateByPattern(`chat:${session.user.id}:*`, true),
      invalidateByPattern(`chat:${recipientId}:*`, true)
    ]);

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Chat error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const recipientId = searchParams.get('recipientId');
    const threadId = searchParams.get('threadId');
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const cacheKey = generateCacheKey(session.user.id, threadId);

    return await cache(
      cacheKey,
      async () => {
        const userSession = await getSession(session.user.id);
        if (!userSession) {
          throw new Error('Session not found');
        }

        // Get messages from Supabase
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

        if (!messages) {
          return { messages: [] };
        }

        // Decrypt messages
        const decryptedMessages = await Promise.all(
          messages.map(async (message) => {
            const sharedKey = await getOrCreateSharedKey(
              userSession,
              message.senderId === session.user.id ? message.recipientId : message.senderId,
              recipientData.public_key
            );

            const decryptedContent = await decrypt(message.encryptedContent, message.iv, sharedKey);

            return {
              ...message,
              decryptedContent,
            };
          })
        );

        return { messages: decryptedMessages };
      },
      cacheConfig.redis.ttl.messages,
      true // Use edge runtime
    );
  } catch (error) {
    console.error('Chat error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 