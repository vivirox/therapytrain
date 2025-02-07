import { WebSocket, WebSocketServer } from 'ws';

export interface ChatClient {
    userId: string;
    ws: WebSocket;
    isAlive: boolean;
    sessionId: string;
    lastActivity: number;
}

export interface ChatMessage {
    type: 'message' | 'notification' | 'system' | 'recovery';
    senderId: string;
    content: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
}

export interface SessionRecoveryData {
    sessionId: string;
    messages: ChatMessage[];
    participants: string[];
    lastActivity: number;
}

export interface WebSocketMetrics {
    totalConnections: number;
    activeConnections: number;
    messagesSent: number;
    messagesReceived: number;
    errors: number;
    averageLatency: number;
}

export type WebSocketEventHandler = (ws: WebSocket, data: any) => Promise<void>;

export interface WebSocketConfig {
    maxClients?: number;
    pingInterval?: number;
    pongTimeout?: number;
    closeTimeout?: number;
} 