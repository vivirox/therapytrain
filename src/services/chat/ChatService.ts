import { WebSocket, WebSocketServer } from 'ws';
import { SupabaseClient } from "@supabase/supabase-js";
import { Redis } from '@upstash/redis';
import { Message, MessageStatus } from "../../types/chat/message";
import { ZKService } from "@/lib/zk/ZKService";
import { MessageRecoveryService } from "./MessageRecoveryService";
import { logger } from "../../lib/logger";
import { env } from "@/utils/env";

interface ChatClient {
  ws: WebSocket;
  userId: string;
  sessionId: string;
}

export class ChatService {
  protected wss: WebSocketServer;
  protected clients: Map<string, ChatClient>;
  protected disconnectedSessions: Map<string, string>;
  private messageHistory: Map<string, Message[]>;
  private messageNumbers: Map<string, number>;
  private zkService: ZKService;
  private recoveryService: MessageRecoveryService;
  private supabase: SupabaseClient;
  private redis: Redis;

  constructor() {
    this.clients = new Map();
    this.messageHistory = new Map();
    this.messageNumbers = new Map();
    this.zkService = new ZKService();
    this.disconnectedSessions = new Map();
    this.redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  protected async handleMessage(userId: string, message: string, sessionId: string): Promise<void> {
    try {
      const parsedMessage = JSON.parse(message);
      await this.sendMessage({
        ...parsedMessage,
        senderId: userId,
        threadId: sessionId,
        timestamp: new Date(),
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unknown error");
      await logger.error("Failed to handle message", err, {
        userId,
        sessionId,
      });
      throw err;
    }
  }

  protected async handleDisconnection(client: ChatClient): Promise<void> {
    this.clients.delete(client.userId);
    this.disconnectedSessions.set(client.userId, client.sessionId);
    await logger.info("Client disconnected", {
      userId: client.userId,
      sessionId: client.sessionId,
    });
  }

  protected async createOrRecoverSession(userId: string, request: Request): Promise<string> {
    const sessionId = Math.random().toString(36).substring(7);
    return sessionId;
  }

  public setSupabaseClient(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
    this.recoveryService = MessageRecoveryService.getInstance(supabaseClient, this.redis);
  }

  private updateMessageHistory(threadId: string, message: Message): void {
    const messages = this.messageHistory.get(threadId) || [];
    messages.push(message);
    this.messageHistory.set(threadId, messages);
  }

  public async sendMessage(message: Message): Promise<void> {
    try {
      // Get current message number for the thread
      const messageNumber = this.messageNumbers.get(message.threadId) || 0;
      this.messageNumbers.set(message.threadId, messageNumber + 1);

      // Get previous chain length
      const { data: previousMessages } = await this.supabase
        .from("messages")
        .select("id")
        .eq("thread_id", message.threadId)
        .lt("created_at", message.timestamp.toISOString());

      const previousChainLength = previousMessages?.length || 0;

      // Encrypt message with forward secrecy
      const { id, encryptedContent, iv, proof } =
        await this.zkService.encryptMessageWithSessionKey(
          message.content,
          message.recipientId,
          {
            senderId: message.senderId,
            recipientId: message.recipientId,
            threadId: message.threadId,
          }
        );

      // Store in database with metadata
      const { error } = await this.supabase.from("messages").insert({
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
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Send to recipient if online
      const recipientClient = this.clients.get(message.recipientId);
      if (recipientClient) {
        recipientClient.ws.send(
          JSON.stringify({
            type: "message",
            payload: {
              ...message,
              encryptedContent,
              iv,
              proof,
              messageNumber,
              previousChainLength,
            },
          })
        );
      }

      // Update message history
      this.updateMessageHistory(message.threadId, message);

      await logger.info("Message sent successfully", {
        messageId: message.id,
        threadId: message.threadId,
        messageNumber,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unknown error");
      await logger.error("Failed to send message", err, {
        messageId: message.id,
        threadId: message.threadId,
      });

      // Queue message for retry
      await this.recoveryService.queueMessageForRetry(message, err);
      throw error;
    }
  }

  public async recoverThreadMessages(threadId: string): Promise<number> {
    try {
      const recoveredCount =
        await this.recoveryService.recoverFailedMessages(threadId);

      if (recoveredCount > 0) {
        await logger.info("Messages recovered successfully", {
          threadId,
          count: recoveredCount,
        });

        // Notify participants about recovered messages
        const { data: thread } = await this.supabase
          .from("chat_threads")
          .select("sender_id, recipient_id")
          .eq("id", threadId)
          .single();

        if (thread) {
          const participants = [thread.sender_id, thread.recipient_id];
          for (const participantId of participants) {
            const client = this.clients.get(participantId);
            if (client) {
              client.ws.send(
                JSON.stringify({
                  type: "messages_recovered",
                  payload: {
                    threadId,
                    count: recoveredCount,
                  },
                })
              );
            }
          }
        }
      }

      return recoveredCount;
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unknown error");
      await logger.error("Failed to recover thread messages", err, {
        threadId,
      });
      return 0;
    }
  }

  protected async sendSessionRecoveryData(client: ChatClient): Promise<void> {
    try {
      const recoveredCount =
        await this.recoveryService.recoverFailedMessages(client.sessionId);

      if (recoveredCount > 0) {
        await logger.info("Messages recovered successfully", {
          sessionId: client.sessionId,
          count: recoveredCount,
        });
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unknown error");
      await logger.error("Failed to recover session messages", err, {
        sessionId: client.sessionId,
      });
    }
  }
}
