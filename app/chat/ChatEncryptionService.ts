import { encrypt, decrypt, generateMessageId } from '@/lib/zk/crypto';
import { getSession, getOrCreateSharedKey } from '@/lib/zk/session';
import { ZKMessage, ZKChatMessage } from '@/lib/zk/types';
import { createClient } from '@supabase/supabase-js';

export interface EncryptedMessage {
  id: string;
  encryptedContent: string;
  iv: string;
  senderId: string;
  recipientId: string;
  timestamp: number;
}

export class ChatEncryptionService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          detectSessionInUrl: false,
        },
      }
    );
  }

  async encryptMessage(
    content: string,
    senderId: string,
    recipientId: string
  ): Promise<EncryptedMessage> {
    const userSession = await getSession(senderId);
    if (!userSession) {
      throw new Error('Session not found');
    }

    // Get recipient's public key
    const { data: recipientData } = await this.supabase
      .from('user_keys')
      .select('public_key')
      .eq('user_id', recipientId)
      .single();

    if (!recipientData) {
      throw new Error('Recipient not found');
    }

    // Get or create shared key
    const sharedKey = await getOrCreateSharedKey(
      userSession,
      recipientId,
      recipientData.public_key
    );

    // Encrypt the message
    const encryptedPayload = await encrypt(content, sharedKey);

    return {
      id: generateMessageId(),
      encryptedContent: encryptedPayload.content,
      iv: encryptedPayload.iv,
      senderId,
      recipientId,
      timestamp: Date.now(),
    };
  }

  async decryptMessage(
    message: EncryptedMessage,
    userId: string
  ): Promise<string> {
    const userSession = await getSession(userId);
    if (!userSession) {
      throw new Error('Session not found');
    }

    const otherId = message.senderId === userId ? message.recipientId : message.senderId;

    // Get other user's public key
    const { data: otherData } = await this.supabase
      .from('user_keys')
      .select('public_key')
      .eq('user_id', otherId)
      .single();

    if (!otherData) {
      throw new Error('Other user not found');
    }

    // Get or create shared key
    const sharedKey = await getOrCreateSharedKey(
      userSession,
      otherId,
      otherData.public_key
    );

    // Decrypt the message
    return await decrypt(message.encryptedContent, message.iv, sharedKey);
  }

  async storeMessage(message: EncryptedMessage): Promise<void> {
    const { error } = await this.supabase.from('chat_messages').insert([{
      id: message.id,
      sender_id: message.senderId,
      recipient_id: message.recipientId,
      encrypted_content: message.encryptedContent,
      iv: message.iv,
      timestamp: new Date(message.timestamp).toISOString(),
    }]);

    if (error) {
      throw error;
    }
  }

  async getMessages(userId: string, otherUserId: string): Promise<EncryptedMessage[]> {
    const { data, error } = await this.supabase
      .from('chat_messages')
      .select('*')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('timestamp', { ascending: true });

    if (error) {
      throw error;
    }

    return data.map(msg => ({
      id: msg.id,
      encryptedContent: msg.encrypted_content,
      iv: msg.iv,
      senderId: msg.sender_id,
      recipientId: msg.recipient_id,
      timestamp: new Date(msg.timestamp).getTime(),
    }));
  }
} 