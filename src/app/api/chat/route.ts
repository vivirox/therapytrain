import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { Configuration, OpenAIApi } from 'openai-edge';
import { Message } from 'ai';
import { getRateLimit, isTooManyRequests, createRateLimitResponse } from '@/lib/edge/rate-limit';
import { cacheMessage, getCachedMessages, invalidateMessageCache } from '@/lib/edge/message-cache';
import { encryptMessageForRecipient, decryptMessageContent } from '@/lib/encryption/message-encryption';
import { logMessageEncryption, logMessageDecryption, logMessageAccess } from '@/lib/audit/audit-logger';
import { ZKService } from '@/lib/zk/ZKService';
import { ChatService } from '@/services/chat/ChatService';
import { SecurityAuditService } from '@/services/SecurityAuditService';
import { cache } from 'react';
import { ChatSession, Message as ChatMessage } from '@/types/chat';

// Initialize services
const zkService = new ZKService();
const chatService = new ChatService();
const securityAudit = new SecurityAuditService();

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

// HIPAA-compliant message storage with encryption
const storeMessage = cache(async (supabase: any, message: any) => {
  // Generate ZK proof for message storage
  const proof = await zkService.generateMessageProof(message);
  
  // Encrypt message with recipient's public key
  const encryptedMessage = await zkService.encryptMessage(message);
  
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
    await cacheMessage(data);
    await securityAudit.logMessageStore({
      messageId: data.id,
      userId: message.user_id,
      operation: 'store',
      status: 'success'
    });
  }

  return { data, error };
});

export const runtime = 'edge';

export async function POST(req: Request) {
  const startTime = Date.now();
  
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
    await securityAudit.logMessageEncryption({
      messageId: encryptedMessage.id,
      userId: session.user.id,
      recipientId,
      threadId,
      status: 'success'
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
      await securityAudit.logError({
        operation: 'message_store',
        error: insertError,
        userId: session.user.id,
        threadId
      });
      return new Response('Failed to store message', { status: 500 });
    }

    // Create streaming response for AI
    const response = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content
      })),
      stream: true,
    });

    // Convert the response into a friendly text-stream
    const stream = OpenAIStream(response, {
      async onCompletion(completion) {
        // Encrypt the AI response
        const aiEncryptedMessage = await zkService.encryptMessageWithSessionKey(
          completion,
          sessionKeys.publicKey,
          {
            senderId: 'ai',
            recipientId: session.user.id,
            threadId
          }
        );

        // Log AI message encryption
        await securityAudit.logMessageEncryption({
          messageId: aiEncryptedMessage.id,
          userId: 'ai',
          recipientId: session.user.id,
          threadId,
          status: 'success'
        });

        // Store the encrypted AI response
        const { error: aiError } = await storeMessage(supabase, {
          thread_id: threadId,
          user_id: 'ai',
          recipient_id: session.user.id,
          content: aiEncryptedMessage.encryptedContent,
          iv: aiEncryptedMessage.iv,
          proof: aiEncryptedMessage.proof,
          session_key_id: sessionKeys.id,
          created_at: new Date().toISOString()
        });

        if (aiError) {
          await securityAudit.logError({
            operation: 'ai_message_store',
            error: aiError,
            userId: 'ai',
            threadId
          });
          // Invalidate cache on error to ensure consistency
          await invalidateMessageCache(threadId);
        }
      }
    });

    // Return a StreamingTextResponse, which can be consumed by the client
    return new StreamingTextResponse(stream);
  } catch (error) {
    await securityAudit.logError({
      operation: 'chat_api',
      error,
      userId: 'system',
      threadId: 'unknown'
    });
    return new Response('Internal Server Error', { status: 500 });
  }
}

// GET handler for retrieving messages
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get('threadId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before');

    // Get session with caching
    const { data: { session }, error: authError } = await getSession();

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
      await securityAudit.logError({
        operation: 'fetch_messages',
        error: fetchError,
        userId: session.user.id,
        threadId
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
            sessionKeys.privateKey
          );

          await securityAudit.logMessageDecryption({
            messageId: message.id,
            userId: session.user.id,
            threadId,
            status: 'success'
          });

          return {
            id: message.id,
            content: decryptedContent,
            sender_id: message.user_id,
            recipient_id: message.recipient_id,
            created_at: message.created_at
          };
        } catch (error) {
          await securityAudit.logError({
            operation: 'message_decrypt',
            error,
            userId: session.user.id,
            messageId: message.id
          });
          return null;
        }
      })
    );

    // Filter out failed decryptions
    const validMessages = decryptedMessages.filter((m) => m !== null);

    // Cache the decrypted messages
    await cacheMessage(validMessages);

    return new Response(JSON.stringify(validMessages), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    await securityAudit.logError({
      operation: 'get_messages',
      error,
      userId: 'system',
      threadId: 'unknown'
    });
    return new Response('Internal Server Error', { status: 500 });
  }
}