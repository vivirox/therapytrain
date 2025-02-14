import { createClient } from '@supabase/supabase-js';
import { ZKMessage, ZKChatMessage } from '@/lib/zk/types';
import { encrypt, decrypt, generateMessageId } from '@/lib/zk/crypto';
import { getSession, getOrCreateSharedKey } from '@/lib/zk/session';
import { cache, invalidateByPattern } from '@/lib/redis';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { HumanMessage, AIMessage } from 'langchain/schema';
import { LangChainStream } from 'ai';

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

export class ChatService {
  private static instance: ChatService;
  private chatModel: ChatOpenAI;

  private constructor() {
    this.chatModel = new ChatOpenAI({
      modelName: 'gpt-4',
      streaming: true,
      temperature: 0.7,
    });
  }

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  /**
   * Get message history for a user/thread
   */
  async getMessageHistory(userId: string, threadId?: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Unauthorized');
    }

    const userSession = await getSession(userId);
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
      query = query.or(`senderId.eq.${userId},recipientId.eq.${userId}`);
    }

    const { data: messages, error } = await query;
    if (error) {
      throw error;
    }

    return messages || [];
  }

  /**
   * Send a new message
   */
  async sendMessage(
    senderId: string,
    recipientId: string,
    content: string,
    threadId: string,
    parentMessageId?: string
  ) {
    const userSession = await getSession(senderId);
    if (!userSession) {
      throw new Error('Session not found');
    }

    // Get recipient's public key
    const { data: recipientData, error: recipientError } = await supabase
      .from('user_keys')
      .select('public_key')
      .eq('user_id', recipientId)
      .single();

    if (recipientError || !recipientData) {
      throw new Error('Recipient not found');
    }

    // Get or create shared key
    const sharedKey = await getOrCreateSharedKey(
      userSession,
      recipientId,
      recipientData.public_key
    );

    // Encrypt message
    const messageId = generateMessageId();
    const encryptedPayload = await encrypt(content, sharedKey);

    const message: ZKMessage = {
      id: messageId,
      senderId,
      recipientId,
      encryptedContent: encryptedPayload.content,
      iv: encryptedPayload.iv,
      timestamp: Date.now(),
      thread_id: threadId,
      parent_message_id: parentMessageId,
    };

    // Store message
    const { error: insertError } = await supabase
      .from('messages')
      .insert([message]);

    if (insertError) {
      throw insertError;
    }

    // Invalidate cache
    await Promise.all([
      invalidateByPattern(`chat:${senderId}:*`, true),
      invalidateByPattern(`chat:${recipientId}:*`, true)
    ]);

    return message;
  }

  /**
   * Generate AI response
   */
  async generateAIResponse(messages: ZKChatMessage[]) {
    const { stream, handlers } = LangChainStream();

    // Convert messages to LangChain format
    const langchainMessages = messages.map(m => 
      m.role === 'user' 
        ? new HumanMessage(m.decryptedContent || '')
        : new AIMessage(m.decryptedContent || '')
    );

    // Start AI response generation
    this.chatModel.call(langchainMessages, {}, [handlers]);

    return stream;
  }

  /**
   * Subscribe to thread updates
   */
  subscribeToThread(threadId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`chat_thread_${threadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        callback
      )
      .subscribe();
  }

  /**
   * Decrypt message content
   */
  async decryptMessage(
    message: ZKMessage,
    userSession: any,
    recipientPublicKey: string
  ) {
    const sharedKey = await getOrCreateSharedKey(
      userSession,
      message.senderId,
      recipientPublicKey
    );

    const decryptedContent = await decrypt(
      message.encryptedContent,
      message.iv,
      sharedKey
    );

    return {
      ...message,
      decryptedContent,
    };
  }
} 