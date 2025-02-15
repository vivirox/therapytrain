import { ChatEncryptionService } from './ChatEncryptionService';

// Core Chat Architecture (First Priority)
interface ChatConfig {
  maxTokens: number;
  temperature: number;
  streamingEnabled: boolean;
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    tokenCount?: number;
    processingTime?: number;
    encryptionStatus?: boolean;
  };
}

class ChatSystem {
  private config: ChatConfig;
  private messageQueue: Map<string, ChatMessage>;
  private rateLimitCounter: Map<string, number>;
  private lastRateLimitReset: number;
  private encryptionService: ChatEncryptionService;

  constructor(config: ChatConfig) {
    this.config = config;
    this.messageQueue = new Map();
    this.rateLimitCounter = new Map();
    this.lastRateLimitReset = Date.now();
    this.encryptionService = new ChatEncryptionService();
  }

  private async checkRateLimit(userId: string): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastRateLimitReset > 60000) { // Reset every minute
      this.rateLimitCounter.clear();
      this.lastRateLimitReset = now;
    }

    const currentCount = this.rateLimitCounter.get(userId) || 0;
    if (currentCount >= this.config.rateLimits.requestsPerMinute) {
      return false;
    }

    this.rateLimitCounter.set(userId, currentCount + 1);
    return true;
  }

  async sendMessage(message: string, userId: string, recipientId: string): Promise<ChatMessage> {
    if (!await this.checkRateLimit(userId)) {
      throw new Error('Rate limit exceeded');
    }

    const chatMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: new Date(),
      metadata: {
        tokenCount: message.split(/\s+/).length, // Simple token count estimation
        processingTime: 0,
        encryptionStatus: false
      }
    };

    // Add to queue for processing
    this.messageQueue.set(chatMessage.id, chatMessage);

    try {
      const startTime = Date.now();
      
      // Encrypt and store message
      const encryptedMessage = await this.encryptionService.encryptMessage(
        message,
        userId,
        recipientId
      );
      await this.encryptionService.storeMessage(encryptedMessage);
      
      if (chatMessage.metadata) {
        chatMessage.metadata.processingTime = Date.now() - startTime;
        chatMessage.metadata.encryptionStatus = true;
      }
      
      return chatMessage;
    } catch (error) {
      this.messageQueue.delete(chatMessage.id);
      throw error;
    }
  }

  async getMessages(userId: string, otherUserId: string): Promise<ChatMessage[]> {
    const encryptedMessages = await this.encryptionService.getMessages(userId, otherUserId);
    
    return await Promise.all(
      encryptedMessages.map(async (msg) => {
        const decryptedContent = await this.encryptionService.decryptMessage(msg, userId);
        return {
          id: msg.id,
          role: msg.senderId === userId ? 'user' : 'assistant',
          content: decryptedContent,
          timestamp: new Date(msg.timestamp),
          metadata: {
            encryptionStatus: true
          }
        };
      })
    );
  }

  async streamResponse(message: string, userId: string): Promise<AsyncGenerator<string>> {
    if (!await this.checkRateLimit(userId)) {
      throw new Error('Rate limit exceeded');
    }

    if (!this.config.streamingEnabled) {
      throw new Error('Streaming is not enabled');
    }

    async function* generateStream(): AsyncGenerator<string> {
      const chunks = message.split(' ');
      for (const chunk of chunks) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing time
        yield chunk + ' ';
      }
    }

    return generateStream();
  }
} 