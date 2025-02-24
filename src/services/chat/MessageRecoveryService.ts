import { SupabaseClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import { v4 as uuidv4 } from 'uuid';
import { ZKService } from '../zk/ZKService';
import { ChatMessage, MessageStatus, FailedMessage, KeyTransitionContext } from '../../types/chat';
import { logger } from '../../lib/logger';
import { DistributedLockService } from './DistributedLockService';

interface RetryQueueItem {
  message: ChatMessage;
  attempts: number;
  lastAttempt: Date;
  error?: Error;
  keyTransitionContext?: KeyTransitionContext;
}

export class MessageRecoveryService {
  private static instance: MessageRecoveryService;
  private retryQueue: Map<string, RetryQueueItem>;
  private maxRetries = 3;
  private retryIntervals = [1000, 5000, 15000]; // Exponential backoff
  private zkService: ZKService;
  private supabase: SupabaseClient;
  private lockService: DistributedLockService;
  private transitionTimeoutMs = 30000; // 30 seconds timeout for key transitions
  private serverId: string;

  private constructor(supabaseClient: SupabaseClient, redis: Redis) {
    this.retryQueue = new Map();
    this.zkService = ZKService.getInstance();
    this.supabase = supabaseClient;
    this.lockService = DistributedLockService.getInstance(redis);
    this.serverId = `server_${uuidv4()}`; // Unique identifier for this server instance
    this.startRetryProcessor();
  }

  public static getInstance(supabaseClient: SupabaseClient, redis: Redis): MessageRecoveryService {
    if (!MessageRecoveryService.instance) {
      MessageRecoveryService.instance = new MessageRecoveryService(supabaseClient, redis);
    }
    return MessageRecoveryService.instance;
  }

  private getLockKey(messageId: string): string {
    return `message_recovery:${messageId}`;
  }

  private getTransitionLockKey(messageId: string): string {
    return `key_transition:${messageId}`;
  }

  public async queueMessageForRetry(
    message: ChatMessage, 
    error: Error, 
    keyTransitionContext?: KeyTransitionContext
  ): Promise<void> {
    const lockKey = this.getLockKey(message.id);
    const holderId = `${this.serverId}:${Date.now()}`;

    try {
      const lockAcquired = await this.lockService.acquireLock(lockKey, holderId);
      if (!lockAcquired) {
        await logger.warn('Failed to acquire lock for message retry', {
          messageId: message.id,
          error: 'Lock acquisition failed'
        });
        return;
      }

      try {
        const existingItem = this.retryQueue.get(message.id);
        
        if (existingItem && existingItem.attempts >= this.maxRetries) {
          await this.handleMaxRetriesExceeded(message, keyTransitionContext);
          return;
        }

        this.retryQueue.set(message.id, {
          message,
          attempts: existingItem ? existingItem.attempts + 1 : 1,
          lastAttempt: new Date(),
          error,
          keyTransitionContext
        });

        await logger.info('Message queued for retry', {
          messageId: message.id,
          attempts: existingItem ? existingItem.attempts + 1 : 1,
          error: error.message,
          keyTransition: keyTransitionContext ? {
            fromVersion: keyTransitionContext.fromVersion,
            toVersion: keyTransitionContext.toVersion
          } : undefined
        });
      } finally {
        await this.lockService.releaseLock(lockKey, holderId);
      }
    } catch (error) {
      await logger.error('Error in queueMessageForRetry', {
        messageId: message.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async handleMaxRetriesExceeded(
    message: ChatMessage,
    keyTransitionContext?: KeyTransitionContext
  ): Promise<void> {
    const lockKey = this.getLockKey(message.id);
    const holderId = `${this.serverId}:${Date.now()}`;

    try {
      const lockAcquired = await this.lockService.acquireLock(lockKey, holderId);
      if (!lockAcquired) {
        await logger.warn('Failed to acquire lock for max retries handling', {
          messageId: message.id,
          error: 'Lock acquisition failed'
        });
        return;
      }

      try {
        const queueItem = this.retryQueue.get(message.id);
        const status = keyTransitionContext ? MessageStatus.TRANSITION_FAILED : MessageStatus.FAILED;

        await this.supabase.from('failed_messages').insert({
          message_id: message.id,
          thread_id: message.threadId,
          content: message.content,
          sender_id: message.senderId,
          recipient_id: message.recipientId,
          status,
          error: queueItem?.error?.message,
          retry_count: queueItem?.attempts || 0,
          encryption_key_version: keyTransitionContext?.fromVersion || 'current',
          encryption_key_id: keyTransitionContext?.keyId,
          encryption_metadata: keyTransitionContext ? {
            key_transitions: [{
              from_version: keyTransitionContext.fromVersion,
              to_version: keyTransitionContext.toVersion,
              timestamp: Date.now() / 1000
            }]
          } : null,
          created_at: message.timestamp,
          updated_at: new Date().toISOString()
        });

        this.retryQueue.delete(message.id);

        await logger.error('Message retry attempts exceeded', {
          messageId: message.id,
          threadId: message.threadId,
          error: queueItem?.error?.message,
          keyTransition: keyTransitionContext ? {
            fromVersion: keyTransitionContext.fromVersion,
            toVersion: keyTransitionContext.toVersion
          } : undefined
        });
      } finally {
        await this.lockService.releaseLock(lockKey, holderId);
      }
    } catch (error) {
      await logger.error('Error in handleMaxRetriesExceeded', {
        messageId: message.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async retryMessage(queueItem: RetryQueueItem): Promise<boolean> {
    const { message, attempts, keyTransitionContext } = queueItem;
    const lockKey = this.getLockKey(message.id);
    const transitionLockKey = this.getTransitionLockKey(message.id);
    const holderId = `${this.serverId}:${Date.now()}`;

    try {
      // Acquire main retry lock
      const lockAcquired = await this.lockService.acquireLock(lockKey, holderId);
      if (!lockAcquired) {
        await logger.warn('Failed to acquire lock for message retry', {
          messageId: message.id,
          error: 'Lock acquisition failed'
        });
        return false;
      }

      try {
        let encryptedContent: string;

        if (keyTransitionContext) {
          // Acquire transition lock if needed
          const transitionLockAcquired = await this.lockService.acquireLock(
            transitionLockKey,
            holderId,
            this.transitionTimeoutMs
          );

          if (!transitionLockAcquired) {
            await logger.warn('Failed to acquire lock for key transition', {
              messageId: message.id,
              error: 'Transition lock acquisition failed'
            });
            return false;
          }

          try {
            encryptedContent = await this.zkService.reEncryptMessageWithNewKey(
              message.content,
              message.senderId,
              message.recipientId,
              keyTransitionContext.fromVersion,
              keyTransitionContext.toVersion
            );

            await this.supabase
              .from('failed_messages')
              .update({
                encryption_key_version: keyTransitionContext.toVersion,
                status: MessageStatus.TRANSITION_PENDING
              })
              .eq('message_id', message.id);
          } finally {
            await this.lockService.releaseLock(transitionLockKey, holderId);
          }
        } else {
          encryptedContent = await this.zkService.encryptMessageWithSessionKey(
            message.content,
            message.senderId,
            message.recipientId
          );
        }

        const { error } = await this.supabase.from('messages').insert({
          id: message.id,
          thread_id: message.threadId,
          sender_id: message.senderId,
          recipient_id: message.recipientId,
          content: encryptedContent,
          status: MessageStatus.SENT,
          created_at: message.timestamp,
          updated_at: new Date().toISOString()
        });

        if (error) throw error;

        await this.supabase
          .from('failed_messages')
          .update({ 
            status: MessageStatus.RECOVERED,
            updated_at: new Date().toISOString()
          })
          .eq('message_id', message.id);

        this.retryQueue.delete(message.id);
        await logger.info('Message retry successful', {
          messageId: message.id,
          attempts,
          keyTransition: keyTransitionContext ? {
            fromVersion: keyTransitionContext.fromVersion,
            toVersion: keyTransitionContext.toVersion
          } : undefined
        });

        return true;
      } finally {
        await this.lockService.releaseLock(lockKey, holderId);
      }
    } catch (error) {
      await logger.error('Message retry failed', {
        messageId: message.id,
        attempts,
        error: error instanceof Error ? error.message : 'Unknown error',
        keyTransition: keyTransitionContext ? {
          fromVersion: keyTransitionContext.fromVersion,
          toVersion: keyTransitionContext.toVersion
        } : undefined
      });
      return false;
    }
  }

  private startRetryProcessor(): void {
    setInterval(async () => {
      for (const [messageId, queueItem] of this.retryQueue.entries()) {
        const timeSinceLastAttempt = Date.now() - queueItem.lastAttempt.getTime();
        const retryInterval = this.retryIntervals[queueItem.attempts - 1] || 
                            this.retryIntervals[this.retryIntervals.length - 1];

        // Check if key transition has timed out
        if (queueItem.keyTransitionContext) {
          const transitionTime = Date.now() - queueItem.keyTransitionContext.transitionStarted.getTime();
          if (transitionTime > this.transitionTimeoutMs) {
            await this.handleMaxRetriesExceeded(queueItem.message, queueItem.keyTransitionContext);
            continue;
          }
        }

        if (timeSinceLastAttempt >= retryInterval) {
          const success = await this.retryMessage(queueItem);
          
          if (!success && queueItem.attempts >= this.maxRetries) {
            await this.handleMaxRetriesExceeded(
              queueItem.message,
              queueItem.keyTransitionContext
            );
          }
        }
      }
    }, 1000); // Check retry queue every second
  }

  public async recoverFailedMessages(threadId: string): Promise<number> {
    const lockKey = `thread_recovery:${threadId}`;
    const holderId = `${this.serverId}:${Date.now()}`;

    try {
      const lockAcquired = await this.lockService.acquireLock(lockKey, holderId);
      if (!lockAcquired) {
        await logger.warn('Failed to acquire lock for thread recovery', {
          threadId,
          error: 'Lock acquisition failed'
        });
        return 0;
      }

      try {
        const { data: failedMessages, error } = await this.supabase
          .from('failed_messages')
          .select('*')
          .eq('thread_id', threadId)
          .in('status', ['failed', 'transition_failed']);

        if (error) throw error;
        if (!failedMessages?.length) return 0;

        let recoveredCount = 0;

        for (const failedMessage of failedMessages) {
          try {
            const message: ChatMessage = {
              id: failedMessage.message_id,
              threadId: failedMessage.thread_id,
              senderId: failedMessage.sender_id,
              recipientId: failedMessage.recipient_id,
              content: failedMessage.content,
              timestamp: new Date(failedMessage.created_at),
              status: MessageStatus.PENDING
            };

            const needsKeyTransition = failedMessage.encryption_key_version !== 'current';
            const keyTransitionContext = needsKeyTransition ? {
              fromVersion: failedMessage.encryption_key_version,
              toVersion: 'current',
              keyId: failedMessage.encryption_key_id,
              transitionStarted: new Date(),
              retryCount: 0
            } : undefined;

            this.retryQueue.set(message.id, {
              message,
              attempts: 0,
              lastAttempt: new Date(0),
              keyTransitionContext
            });

            recoveredCount++;
          } catch (error) {
            await logger.error('Failed to recover message', {
              messageId: failedMessage.message_id,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        return recoveredCount;
      } finally {
        await this.lockService.releaseLock(lockKey, holderId);
      }
    } catch (error) {
      await logger.error('Failed to recover messages', {
        threadId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }

  public async getFailedMessageStats(threadId: string): Promise<{
    total: number;
    needsKeyTransition: number;
    inTransition: number;
  }> {
    try {
      const { data: failedMessages, error } = await this.supabase
        .from('failed_messages')
        .select('*')
        .eq('thread_id', threadId)
        .in('status', ['failed', 'transition_failed', 'transition_pending']);

      if (error) throw error;

      return {
        total: failedMessages?.length || 0,
        needsKeyTransition: failedMessages?.filter(
          msg => msg.encryption_key_version !== 'current'
        ).length || 0,
        inTransition: failedMessages?.filter(
          msg => msg.status === 'transition_pending'
        ).length || 0
      };
    } catch (error) {
      await logger.error('Failed to get message stats', {
        threadId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return { total: 0, needsKeyTransition: 0, inTransition: 0 };
    }
  }
} 