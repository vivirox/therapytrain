import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { Configuration, OpenAIApi } from 'openai-edge';
import { Message } from 'ai';
import { getRateLimit, isTooManyRequests, createRateLimitResponse } from '@/lib/edge/rate-limit';
import { cacheMessage, getCachedMessages, invalidateMessageCache } from '@/lib/edge/message-cache';
import { encryptMessageForRecipient, decryptMessageContent } from '@/lib/encryption/message-encryption';
import { logMessageEncryption, logMessageDecryption, logMessageAccess } from '@/lib/audit/audit-logger';
import { cache } from 'react';

// Create an OpenAI API client (that's edge friendly!)
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(config);

// Cache the session check for 1 minute
const getSession = cache(async () => {
  const supabase = createRouteHandlerClient({ cookies });
  return await supabase.auth.getSession();
});

// Cache message storage for better performance
const storeMessage = cache(async (supabase: any, message: any) => {
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single();

  if (!error && data) {
    await cacheMessage(data);
  }

  return { data, error };
});

export const runtime = 'edge'; // Enable edge runtime

export async function POST(req: Request) {
  try {
    // Get session with caching
    const { data: { session }, error: authError } = await getSession();

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
    const { messages, threadId } = json;
    const lastMessage = messages[messages.length - 1];

    const supabase = createRouteHandlerClient({ cookies });

    // Try to get messages from cache first
    const cachedMessages = await getCachedMessages(threadId);

    // Encrypt the message for storage
    const encryptedMessage = await encryptMessageForRecipient(
      lastMessage.content,
      session.user.id,
      'ai' // AI is treated as a special recipient
    );

    // Log message encryption
    await logMessageEncryption(session.user.id, threadId, 'ai');

    // Store the encrypted message
    const { error: insertError } = await storeMessage(supabase, {
      thread_id: threadId,
      user_id: session.user.id,
      content: encryptedMessage.encryptedContent,
      iv: encryptedMessage.iv,
      role: lastMessage.role,
      created_at: new Date().toISOString(),
      sender_public_key: encryptedMessage.senderPublicKey
    });

    if (insertError) {
      console.error('Failed to store message:', insertError);
      return new Response('Failed to store message', { status: 500 });
    }

    // Log successful message access
    await logMessageAccess(session.user.id, threadId, true, {
      ipAddress: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent')
    });

    // Prepare messages for OpenAI by decrypting cached messages
    const decryptedMessages = await Promise.all(
      messages.map(async (message: Message) => {
        if (message.role === 'assistant') {
          // Decrypt AI messages
          const decryptedContent = await decryptMessageContent(
            {
              encryptedContent: message.content,
              iv: message.iv,
              senderPublicKey: message.sender_public_key,
              recipientId: session.user.id,
              timestamp: message.created_at
            },
            session.user.id
          );
          await logMessageDecryption(session.user.id, threadId);
          return { ...message, content: decryptedContent };
        }
        return message;
      })
    );

    // Ask OpenAI for a streaming chat completion
    const response = await openai.createChatCompletion({
      model: 'gpt-4',
      stream: true,
      messages: decryptedMessages.map((message: Message) => ({
        role: message.role,
        content: message.content
      }))
    });

    // Convert the response into a friendly text-stream
    const stream = OpenAIStream(response, {
      async onCompletion(completion) {
        // Encrypt the AI response
        const encryptedResponse = await encryptMessageForRecipient(
          completion,
          'ai',
          session.user.id
        );

        // Log AI message encryption
        await logMessageEncryption('ai', threadId, session.user.id);

        // Store the encrypted AI response
        const { error: aiError } = await storeMessage(supabase, {
          thread_id: threadId,
          user_id: 'ai',
          content: encryptedResponse.encryptedContent,
          iv: encryptedResponse.iv,
          role: 'assistant',
          created_at: new Date().toISOString(),
          sender_public_key: encryptedResponse.senderPublicKey
        });

        if (aiError) {
          console.error('Failed to store AI response:', aiError);
          // Invalidate cache on error to ensure consistency
          await invalidateMessageCache(threadId);
        }
      }
    });

    // Return a StreamingTextResponse, which can be consumed by the client
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Chat error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}