import { WebSocket, Server as WSServer } from 'ws';
import { IncomingMessage } from 'http';
import { AuditEvent } from './audit';

export interface WebSocketConfig {
  port: number;
  path: string;
  maxPayloadSize: number;
  heartbeatInterval: number;
  closeTimeout: number;
  backoff: {
    initialDelay: number;
    maxDelay: number;
    factor: number;
  };
}

export interface ChatClient {
  id: string;
  userId: string;
  socket: WebSocket;
  sessionId?: string;
  lastActivity: Date;
  metadata?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ChatSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'paused' | 'ended';
  messages: ChatMessage[];
  metadata?: Record<string, unknown>;
}

export interface SessionRecoveryData {
  sessionId: string;
  userId: string;
  lastMessageId: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface WebSocketError {
  code: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface WebSocketMetrics {
  connectedClients: number;
  messagesReceived: number;
  messagesSent: number;
  errors: number;
  avgLatency: number;
  timestamp: Date;
}

export interface ExtendedWebSocketServer extends WSServer {
    clients: Set<WebSocket>;
    options: WebSocketConfig;
    metrics: WebSocketMetrics;
    broadcast(message: WebSocketMessage): void;
    handleConnection(socket: WebSocket, request: IncomingMessage): void;
    handleMessage(socket: WebSocket, message: WebSocketMessage): void;
    handleError(socket: WebSocket, error: WebSocketError): void;
    handleClose(socket: WebSocket, code: number, reason: string): void;
    getMetrics(): WebSocketMetrics;
}

export interface WebSocketClientManager {
    registerClient(client: WebSocket, userId: string): ChatClient;
    removeClient(clientId: string): void;
    getClient(clientId: string): ChatClient | undefined;
    getClientsByUserId(userId: string): ChatClient[];
    getActiveClients(): ChatClient[];
    updateClientActivity(clientId: string): void;
    validateClient(client: WebSocket): boolean;
}

export interface WebSocketEventHandler {
    handleMessage(client: ChatClient, message: WebSocketMessage): Promise<void>;
    handleError(client: ChatClient, error: WebSocketError): Promise<void>;
    handleDisconnect(client: ChatClient): Promise<void>;
    handleReconnect(client: ChatClient): Promise<void>;
}

export interface WebSocketServer extends ExtendedWebSocketServer {
    clientManager: WebSocketClientManager;
    eventHandler: WebSocketEventHandler;
} 