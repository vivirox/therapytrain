import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { IncomingMessage } from 'http';

export interface WebSocketMessage {
    type: string;
    payload: any;
    timestamp: number;
    sender: string;
    recipient?: string;
    metadata?: Record<string, any>;
}

export interface WebSocketClient {
    id: string;
    socket: WebSocket;
    userId: string;
    sessionId?: string;
    lastActivity: Date;
    metadata?: Record<string, any>;
}

export interface WebSocketEvent {
    type: string;
    data: any;
    timestamp: number;
    source: string;
    metadata?: Record<string, any>;
}

export class WebSocketServer extends EventEmitter {
    private static instance: WebSocketServer;
    private readonly wss: WebSocket.Server;
    private readonly clients: Map<string, WebSocketClient> = new Map();
    private readonly heartbeatInterval = 30000; // 30 seconds

    private constructor(port: number) {
        super();
        this.wss = new WebSocket.Server({ port });
        this.setupServer();
        setInterval(() => this.checkHeartbeats(), this.heartbeatInterval);
    }

    public static getInstance(port: number): WebSocketServer {
        if (!WebSocketServer.instance) {
            WebSocketServer.instance = new WebSocketServer(port);
        }
        return WebSocketServer.instance;
    }

    private setupServer(): void {
        this.wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
            const clientId = this.generateClientId();
            const userId = this.extractUserId(request);

            const client: WebSocketClient = {
                id: clientId,
                socket,
                userId,
                lastActivity: new Date(),
            };

            this.clients.set(clientId, client);

            socket.on('message', (data: WebSocket.Data) => {
                this.handleMessage(client, data);
            });

            socket.on('close', () => {
                this.handleDisconnection(client);
            });

            socket.on('error', (error: Error) => {
                this.handleError(client, error);
            });

            // Send welcome message
            this.sendToClient(client, {
                type: 'WELCOME',
                payload: { clientId },
                timestamp: Date.now(),
                sender: 'server'
            });
        });
    }

    private generateClientId(): string {
        return Math.random().toString(36).substring(2, 15);
    }

    private extractUserId(request: IncomingMessage): string {
        // Implement user authentication/extraction logic
        return 'anonymous';
    }

    private handleMessage(client: WebSocketClient, data: WebSocket.Data): void {
        try {
            const message: WebSocketMessage = JSON.parse(data.toString());
            client.lastActivity = new Date();

            this.emit('message', {
                type: message.type,
                data: message.payload,
                timestamp: Date.now(),
                source: client.id,
                metadata: message.metadata
            });

            if (message.recipient) {
                this.forwardMessage(client, message);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    private handleDisconnection(client: WebSocketClient): void {
        this.clients.delete(client.id);
        this.emit('disconnection', {
            type: 'DISCONNECTION',
            data: { clientId: client.id },
            timestamp: Date.now(),
            source: client.id
        });
    }

    private handleError(client: WebSocketClient, error: Error): void {
        console.error(`WebSocket error for client ${client.id}:`, error);
        this.emit('error', {
            type: 'ERROR',
            data: { error: error.message },
            timestamp: Date.now(),
            source: client.id
        });
    }

    private forwardMessage(sender: WebSocketClient, message: WebSocketMessage): void {
        const recipient = this.clients.get(message.recipient!);
        if (recipient && recipient.socket.readyState === WebSocket.OPEN) {
            this.sendToClient(recipient, message);
        }
    }

    public broadcast(message: WebSocketMessage): void {
        this.clients.forEach(client => {
            if (client.socket.readyState === WebSocket.OPEN) {
                this.sendToClient(client, message);
            }
        });
    }

    public sendToClient(client: WebSocketClient, message: WebSocketMessage): void {
        if (client.socket.readyState === WebSocket.OPEN) {
            client.socket.send(JSON.stringify(message));
        }
    }

    private checkHeartbeats(): void {
        const now = new Date();
        this.clients.forEach(client => {
            if (now.getTime() - client.lastActivity.getTime() > this.heartbeatInterval * 2) {
                client.socket.terminate();
                this.handleDisconnection(client);
            }
        });
    }

    public getClients(): Map<string, WebSocketClient> {
        return this.clients;
    }
}

export const createWebSocketServer = (port: number): WebSocketServer => {
    return WebSocketServer.getInstance(port);
}; 