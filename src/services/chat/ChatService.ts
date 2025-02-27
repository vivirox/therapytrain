import { SupabaseClient } from '@supabase/supabase-js';
import { WebSocket } from 'ws';
import { ChatMessage, MessageStatus, ChatClient } from '../../types/chat';
import { ZKService } from '@/lib/zk/ZKService';
import { MessageRecoveryService } from './MessageRecoveryService';
import { logger } from '../../lib/logger';

export class ChatService {
  private static instance: ChatService;
  private clients: Map<string, ChatClient>;
  private messageHistory: Map<string, ChatMessage[]>;
  private messageNumbers: Map<string, number>; // threadId -> messageNumber
  private zkService: ZKService;
  private recoveryService: MessageRecoveryService;
  private supabase: SupabaseClient;

  private constructor(supabaseClient: SupabaseClient) {
    this.clients = new Map();
    this.messageHistory = new Map();
    this.messageNumbers = new Map();
    this.zkService = ZKService.getInstance();
    this.recoveryService = MessageRecoveryService.getInstance(supabaseClient);
    this.supabase = supabaseClient;
  }

  public async sendMessage(message: ChatMessage): Promise<void> {
    try {
      // Get current message number for the thread
      const messageNumber = this.messageNumbers.get(message.threadId) || 0;
      this.messageNumbers.set(message.threadId, messageNumber + 1);

      // Get previous chain length
      const { data: previousMessages } = await this.supabase
        .from('messages')
        .select('id')
        .eq('thread_id', message.threadId)
        .lt('created_at', message.timestamp.toISOString());

      const previousChainLength = previousMessages?.length || 0;

      // Encrypt message with forward secrecy
      const { id, encryptedContent, iv, proof } = await this.zkService.encryptMessageWithSessionKey(
        message.content,
        message.recipientId,
        {
          senderId: message.senderId,
          recipientId: message.recipientId,
          threadId: message.threadId
        }
      );

      // Store in database with metadata
      const { error } = await this.supabase.from('messages').insert({
        id: message.id,
        thread_id: message.threadId,
        sender_id: message.senderId,
        recipient_id: message.recipientId,
        content: encryptedContent,
        iv,
        proof,
        message_number: messageNumber,
        previous_chain_length: previousChainLength,
        status: MessageStatus.SENT,
        created_at: message.timestamp,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;

      // Send to recipient if online
      const recipientClient = this.clients.get(message.recipientId);
      if (recipientClient) {
        recipientClient.ws.send(JSON.stringify({
          type: 'message',
          payload: {
            ...message,
            encryptedContent,
            iv,
            proof,
            messageNumber,
            previousChainLength
          }
        }));
      }

      // Update message history
      this.updateMessageHistory(message.threadId, message);

      await logger.info('Message sent successfully', {
        messageId: message.id,
        threadId: message.threadId,
        messageNumber
      });
    } catch (error) {
      await logger.error('Failed to send message', {
        messageId: message.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Queue message for retry
      await this.recoveryService.queueMessageForRetry(message, error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }

  public async recoverThreadMessages(threadId: string): Promise<number> {
    try {
      const recoveredCount = await this.recoveryService.recoverFailedMessages(threadId);
      
      if (recoveredCount > 0) {
        await logger.info('Messages recovered successfully', {
          threadId,
          count: recoveredCount
        });

        // Notify participants about recovered messages
        const { data: thread } = await this.supabase
          .from('chat_threads')
          .select('sender_id, recipient_id')
          .eq('id', threadId)
          .single();

        if (thread) {
          const participants = [thread.sender_id, thread.recipient_id];
          for (const participantId of participants) {
            const client = this.clients.get(participantId);
            if (client) {
              client.ws.send(JSON.stringify({
                type: 'messages_recovered',
                payload: {
                  threadId,
                  count: recoveredCount
                }
              }));
            }
          }
        }
      }

      return recoveredCount;
    } catch (error) {
      await logger.error('Failed to recover thread messages', {
        threadId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }
} 