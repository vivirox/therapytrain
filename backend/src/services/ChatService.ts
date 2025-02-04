import { Server } from 'http';
import WebSocket from 'ws';
import { RateLimiterService } from './RateLimiterService';
import { SecurityAuditService } from './SecurityAuditService';
import { AIService } from './AIService';
import { MessageService } from './MessageService';
import { Request } from 'express';

interface ChatMessage {
  type: 'message' | 'status' | 'error' | 'ai_response';
  userId: string;
  content: string;
  timestamp: number;
  metadata?: any;
  sessionId?: string;
}

interface ChatClient {
  userId: string;
  ws: WebSocket;
  isAlive: boolean;
  sessionId: string;
  lastActivity: number;
}

export class ChatService {
  private wss: WebSocket.Server;
  private clients: Map<string, ChatClient> = new Map();
  private disconnectedSessions: Map<string, any> = new Map();
  private rateLimiter: RateLimiterService;
  private securityAudit: SecurityAuditService;
  private aiService: AIService;
  private messageService: MessageService;

  constructor(
    server: Server,
    rateLimiter: RateLimiterService,
    securityAudit: SecurityAuditService
  ) {
    this.wss = new WebSocket.Server({ server });
    this.rateLimiter = rateLimiter;
    this.securityAudit = securityAudit;
    this.aiService = new AIService(securityAudit, rateLimiter);
    this.messageService = new MessageService(securityAudit);
    this.initialize();
  }

  private async initialize() {
    this.wss.on('connection', async (ws: WebSocket, req: Request) => {
      const userId = this.getUserIdFromRequest(req);
      
      if (!userId) {
        ws.close(1008, 'Authentication required');
        return;
      }

      // Rate limiting check
      if (this.rateLimiter.isRateLimited(userId)) {
        ws.close(1008, 'Too many connections');
        return;
      }

      // Create or recover session
      const sessionId = await this.createOrRecoverSession(userId, req);

      const client: ChatClient = {
        userId,
        ws,
        isAlive: true,
        sessionId,
        lastActivity: Date.now()
      };

      this.clients.set(userId, client);
      
      // Log connection
      await this.securityAudit.recordEvent('chat_connection', {
        userId,
        sessionId,
        timestamp: Date.now(),
        ip: req.ip
      });

      // Send session recovery data if available
      await this.sendSessionRecoveryData(client);

      ws.on('message', async (data: WebSocket.Data) => {
        try {
          await this.handleMessage(userId, data.toString(), sessionId);
        } catch (error) {
          this.handleError(ws, error as Error);
        }
      });

      ws.on('close', async () => {
        try {
          await this.messageService.endSession(sessionId);
          this.clients.delete(userId);
          this.broadcastStatus(userId, 'offline', sessionId);
        } catch (error) {
          console.error('Error ending session:', error);
        }
      });

      ws.on('pong', () => {
        const client = this.clients.get(userId);
        if (client) {
          client.isAlive = true;
        }
      });

      // Send welcome message
      this.sendToClient(ws, {
        type: 'status',
        userId: 'system',
        content: 'Connected to chat server',
        timestamp: Date.now(),
        sessionId
      });

      // Broadcast user online status
      this.broadcastStatus(userId, 'online', sessionId);
    });

    // Setup heartbeat
    setInterval(() => {
      this.wss.clients.forEach((ws: WebSocket) => {
        const client = Array.from(this.clients.values()).find(c => c.ws === ws);
        if (client && !client.isAlive) {
          ws.terminate();
          this.clients.delete(client.userId);
          return;
        }
        if (client) {
          client.isAlive = false;
          ws.ping();
        }
      });
    }, 30000);
  }

  private async handleMessage(userId: string, data: string, sessionId: string) {
    try {
      const message = JSON.parse(data) as ChatMessage;
      
      // Rate limiting check for messages
      if (this.rateLimiter.isRateLimited(userId, 'message')) {
        throw new Error('Message rate limit exceeded');
      }

      // Validate message
      if (!this.isValidMessage(message)) {
        throw new Error('Invalid message format');
      }

      // Save and broadcast user message
      const savedMessage = await this.messageService.saveMessage(
        sessionId,
        userId,
        message.content,
        'message'
      );

      this.broadcast({
        type: 'message',
        userId,
        content: message.content,
        timestamp: Date.now(),
        sessionId,
        metadata: savedMessage.metadata
      });

      // Process message with AI
      try {
        const aiResponse = await this.aiService.processMessage(userId, message.content);
        
        // Save and broadcast AI response
        const savedAiResponse = await this.messageService.saveMessage(
          sessionId,
          'ai_assistant',
          aiResponse.content,
          'ai_response',
          aiResponse.metadata
        );

        this.broadcast({
          type: 'ai_response',
          userId: 'ai_assistant',
          content: aiResponse.content,
          timestamp: Date.now(),
          sessionId,
          metadata: savedAiResponse.metadata
        });

        // If crisis is detected (sentiment below threshold)
        if (aiResponse.metadata?.sentiment && aiResponse.metadata.sentiment < -0.7) {
          await this.securityAudit.recordEvent('crisis_alert', {
            userId,
            sessionId,
            timestamp: Date.now(),
            message: message.content,
            sentiment: aiResponse.metadata.sentiment
          });
        }
      } catch (error) {
        console.error('Error processing message with AI:', error);
        // Send error message only to the user who sent the message
        const client = this.clients.get(userId);
        if (client) {
          const errorMessage = {
            type: 'error' as const,
            userId: 'system',
            content: 'Unable to process message with AI assistant',
            timestamp: Date.now(),
            sessionId
          };
          await this.messageService.saveMessage(
            sessionId,
            'system',
            errorMessage.content,
            'error'
          );
          this.sendToClient(client.ws, errorMessage);
        }
      }

      // Log message for security audit
      await this.securityAudit.recordEvent('chat_message', {
        userId,
        sessionId,
        timestamp: Date.now(),
        messageLength: message.content.length
      });

    } catch (error) {
      throw error;
    }
  }

  private async createOrRecoverSession(userId: string, request: Request): Promise<string> {
    const ip = request.socket.remoteAddress || '';
    const userAgent = request.headers['user-agent'] || '';

    try {
      // Check for existing active sessions
      const sessions = await this.messageService.getUserSessions(userId);
      const recentSession = sessions.find(s => {
        const lastActive = new Date(s.last_activity).getTime();
        const now = Date.now();
        // Session is considered recent if last active within 30 minutes
        return (now - lastActive) <= 30 * 60 * 1000;
      });

      if (recentSession) {
        await this.messageService.updateSessionActivity(recentSession.id);
        return recentSession.id;
      }

      // Create new session if no recent one found
      const newSession = await this.messageService.createSession(userId, ip, userAgent);
      return newSession.id;
    } catch (error) {
      console.error('Error creating/recovering session:', error);
      throw error;
    }
  }

  private async sendSessionRecoveryData(client: ChatClient) {
    try {
      // Get recent messages
      const messages = await this.messageService.getRecentMessages(client.sessionId, 50);
      
      if (messages.length > 0) {
        // Send session recovery notification
        const recoveryNotification = {
          type: 'status',
          userId: 'system',
          content: 'Reconnected to previous session',
          timestamp: Date.now(),
          sessionId: client.sessionId,
          metadata: {
            messageCount: messages.length,
            sessionId: client.sessionId
          }
        };
        
        client.ws.send(JSON.stringify(recoveryNotification));

        // Send recent messages
        for (const message of messages) {
          client.ws.send(JSON.stringify({
            type: 'message',
            userId: message.user_id,
            content: message.content,
            timestamp: new Date(message.created_at).getTime(),
            metadata: message.metadata,
            sessionId: message.session_id
          }));
        }

        // Send session summary if available
        const sessionSummary = await this.messageService.getSessionSummary(client.sessionId);
        if (sessionSummary) {
          client.ws.send(JSON.stringify({
            type: 'status',
            userId: 'system',
            content: 'Session Summary',
            timestamp: Date.now(),
            sessionId: client.sessionId,
            metadata: sessionSummary
          }));
        }
      }
    } catch (error) {
      console.error('Error sending recovery data:', error);
      // Don't throw - we want to continue even if recovery data can't be sent
    }
  }

  private handleDisconnection(client: ChatClient) {
    // Store last known state
    this.disconnectedSessions.set(client.userId, {
      sessionId: client.sessionId,
      lastActivity: client.lastActivity,
      disconnectedAt: Date.now()
    });

    this.clients.delete(client.userId);
    this.securityAudit.recordEvent('client_disconnected', {
      userId: client.userId,
      sessionId: client.sessionId,
      timestamp: Date.now()
    });
  }

  private isValidMessage(message: any): message is ChatMessage {
    return (
      typeof message === 'object' &&
      typeof message.content === 'string' &&
      message.content.length <= 2000 // Maximum message length
    );
  }

  private getUserIdFromRequest(req: Request): string | null {
    // Implementation depends on your authentication system
    // This is a placeholder - replace with actual auth logic
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    
    try {
      // Parse JWT or session token to get userId
      return 'user-id'; // Replace with actual userId extraction
    } catch (error) {
      return null;
    }
  }

  private broadcast(message: ChatMessage) {
    const messageStr = JSON.stringify(message);
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  private broadcastStatus(userId: string, status: 'online' | 'offline', sessionId: string) {
    this.broadcast({
      type: 'status',
      userId,
      content: status,
      timestamp: Date.now(),
      sessionId
    });
  }

  private sendToClient(ws: WebSocket, message: ChatMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private handleError(ws: WebSocket, error: Error) {
    const errorMessage: ChatMessage = {
      type: 'error',
      userId: 'system',
      content: 'An error occurred while processing your message',
      timestamp: Date.now()
    };
    this.sendToClient(ws, errorMessage);
    
    // Log error
    this.securityAudit.recordEvent('chat_error', {
      error: error.message,
      timestamp: Date.now()
    });
  }
}
