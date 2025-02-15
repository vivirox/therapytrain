import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ZKMessage, ZKChatMessage } from '@/lib/zk/types';
import { encrypt, decrypt, generateMessageId } from '@/lib/zk/crypto';
import { getSession, getOrCreateSharedKey } from '@/lib/zk/session';
import { StreamingTextResponse, LangChainStream } from 'ai';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { AIMessage, HumanMessage } from 'langchain/schema';
import { cache, invalidateByPattern } from '@/lib/redis';
import { cacheConfig } from '@/config/cache.config';
import { ChatEncryptionService } from '@/app/chat/ChatEncryptionService';

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

// Initialize encryption service
const encryptionService = new ChatEncryptionService();

// Helper function to generate cache key
function generateCacheKey(userId: string, threadId?: string) {
  return `chat:${userId}:${threadId || 'direct'}`;
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { message, recipientId, threadId } = json;
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Encrypt and store message
    const encryptedMessage = await encryptionService.encryptMessage(
      message,
      session.user.id,
      recipientId
    );

    await encryptionService.storeMessage(encryptedMessage);

    // Create streaming response
    const { stream, handlers } = LangChainStream();

    // Initialize chat model
    const chat = new ChatOpenAI({
      modelName: 'gpt-4',
      streaming: true,
      temperature: 0.7,
    });

    // Convert message to LangChain format
    const langchainMessages = [new HumanMessage(message)];

    // Start streaming response
    chat.call(langchainMessages, {}, [handlers]);

    // Invalidate cache for both participants
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
        // Get messages from encryption service
        const messages = await encryptionService.getMessages(
          session.user.id,
          recipientId!
        );

        // Decrypt messages
        const decryptedMessages = await Promise.all(
          messages.map(async (message) => {
            const decryptedContent = await encryptionService.decryptMessage(
              message,
              session.user.id
            );

            return {
              ...message,
              content: decryptedContent,
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