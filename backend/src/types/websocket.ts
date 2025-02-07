import { WebSocket } from 'ws';

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

export interface WebSocketServer {
  clients: Set<WebSocket>;
  options: WebSocketConfig;
  metrics: WebSocketMetrics;
  broadcast(message: WebSocketMessage): void;
  handleConnection(socket: WebSocket): void;
  handleMessage(socket: WebSocket, message: WebSocketMessage): void;
  handleError(socket: WebSocket, error: WebSocketError): void;
  handleClose(socket: WebSocket): void;
  getMetrics(): WebSocketMetrics;
} 