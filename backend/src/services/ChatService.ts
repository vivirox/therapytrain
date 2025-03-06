import { WebSocket, WebSocketServer, RawData } from "ws";
import { Server } from "http";
import { RateLimiterService } from "./RateLimiterService";
import { SecurityAuditService } from "./SecurityAuditService";
import { AIService } from "./AIService";
import { MessageService } from "./MessageService";
import { TextAnalysisService } from "./TextAnalysisService";
import { Request, Response, NextFunction } from "express";
import {
  ChatClient as IWebSocketClient,
  ChatMessage,
  SessionRecoveryData,
  WebSocketConfig,
} from "../types/websocket";

export interface ChatClient {
  userId: string;
  ws: WebSocket;
  isAlive: boolean;
  sessionId: string;
  lastActivity: number;
}

export class ChatService {
  private wss: WebSocketServer;
  private clients: Map<string, ChatClient>;
  private messageHistory: Map<string, ChatMessage[]>;
  private readonly securityAudit: SecurityAuditService;
  private readonly config: WebSocketConfig;
  private rateLimiter: RateLimiterService;
  private aiService: AIService;
  private messageService: MessageService;

  constructor(
    server: Server,
    rateLimiter: RateLimiterService,
    securityAudit: SecurityAuditService,
    config: WebSocketConfig = {
      port: 8080,
      path: "/ws",
      maxPayloadSize: 1024 * 1024, // 1MB
      heartbeatInterval: 30000,
      closeTimeout: 5000,
      backoff: {
        initialDelay: 1000,
        maxDelay: 30000,
        factor: 2,
      },
    },
  ) {
    this.wss = new WebSocketServer({ noServer: true });
    this.clients = new Map();
    this.messageHistory = new Map();
    this.rateLimiter = rateLimiter;
    this.securityAudit = securityAudit;
    this.config = {
      port: config.port,
      path: config.path,
      maxPayloadSize: config.maxPayloadSize,
      heartbeatInterval: config.heartbeatInterval,
      closeTimeout: config.closeTimeout,
      backoff: config.backoff,
    };
    const textAnalysis = new TextAnalysisService(securityAudit);
    this.aiService = new AIService(securityAudit, rateLimiter, textAnalysis);
    this.messageService = new MessageService(securityAudit);

    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  private setupWebSocketServer(): void {
    this.wss.on("connection", (ws: WebSocket, req: any) => {
      const userId = req.session?.userId;
      if (!userId) {
        ws.close(1008, "Authentication required");
        return;
      }

      if (this.clients.size >= this.config.maxPayloadSize!) {
        ws.close(1008, "Too many connections");
        return;
      }

      const client: ChatClient = {
        userId,
        ws,
        isAlive: true,
        sessionId: Math.random().toString(36).substring(7),
        lastActivity: Date.now(),
      };

      this.clients.set(userId, client);

      ws.on("pong", () => {
        const client = this.clients.get(userId);
        if (client) {
          client.isAlive = true;
        }
      });

      ws.on("message", async (data: RawData) => {
        try {
          const message = JSON.parse(data.toString()) as ChatMessage;
          await this.handleMessage(userId, message);
        } catch (error) {
          console.error("Error handling message:", error);
          this.securityAudit.recordAlert("MESSAGE_HANDLING_ERROR", "MEDIUM", {
            userId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      });

      ws.on("close", () => {
        this.handleDisconnection(client);
      });

      ws.on("error", (error: Error) => {
        console.error("WebSocket error:", error);
        this.securityAudit.recordAlert("WEBSOCKET_ERROR", "HIGH", {
          userId,
          error: error.message,
        });
      });

      // Send session recovery data if available
      this.sendSessionRecoveryData(client);
    });
  }

  private startHeartbeat(): void {
    setInterval(() => {
      this.clients.forEach((client: any) => {
        if (!client.isAlive) {
          client.ws.terminate();
          return;
        }

        client.isAlive = false;
        client.ws.ping();
      });
    }, this.config.heartbeatInterval);
  }

  private async handleMessage(
    userId: string,
    message: ChatMessage,
  ): Promise<void> {
    const client = this.clients.get(userId);
    if (!client) {
      return;
    }

    client.lastActivity = Date.now();

    // Store message in history
    const sessionHistory = this.messageHistory.get(client.sessionId) || [];
    sessionHistory.push(message);
    this.messageHistory.set(client.sessionId, sessionHistory);

    // Broadcast message to all clients
    const messageStr = JSON.stringify(message);
    this.broadcast(messageStr);

    // Audit message
    await this.securityAudit.recordEvent("CHAT_MESSAGE", {
      userId,
      messageType: message.type,
      timestamp: message.timestamp,
    });
  }

  private handleDisconnection(client: ChatClient): void {
    this.clients.delete(client.userId);

    // Clean up message history after a delay
    setTimeout(() => {
      if (!this.clients.has(client.userId)) {
        this.messageHistory.delete(client.sessionId);
      }
    }, this.config.closeTimeout);

    this.securityAudit.recordEvent("USER_DISCONNECTED", {
      userId: client.userId,
      sessionId: client.sessionId,
    });
  }

  private async sendSessionRecoveryData(client: ChatClient): Promise<void> {
    const history = this.messageHistory.get(client.sessionId);
    if (!history) {
      return;
    }

    const recoveryNotification: SessionRecoveryData = {
      sessionId: client.sessionId,
      userId: client.userId,
      lastMessageId: history[history.length - 1]?.id || "",
      timestamp: new Date(),
      metadata: {
        messageHistory: history,
        participants: Array.from(this.clients.keys()),
        lastActivity: client.lastActivity,
      },
    };

    client.ws.send(JSON.stringify(recoveryNotification));

    await this.securityAudit.recordEvent("SESSION_RECOVERED", {
      userId: client.userId,
      sessionId: client.sessionId,
      messageCount: history.length,
    });
  }

  public broadcast(message: string): void {
    this.clients.forEach((client: any) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }

  public sendToUser(userId: string, message: ChatMessage): void {
    const client = this.clients.get(userId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }
}
