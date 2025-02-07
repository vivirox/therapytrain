import { Server as HttpServer } from 'http';
import WebSocket from 'ws';
import { SecurityAuditService } from '../SecurityAuditService';
import { SessionManager } from './SessionManager';

interface WebSocketClient extends WebSocket {
    id: string;
    sessionId?: string;
    isAlive: boolean;
}

export class WebSocketServer {
    private wss: WebSocket.Server;
    private readonly clients: Set<WebSocketClient> = new Set();
    private readonly pingInterval: NodeJS.Timeout;

    constructor(
        server: HttpServer,
        private readonly sessionManager: SessionManager,
        private readonly securityAuditService: SecurityAuditService
    ) {
        this.wss = new WebSocket.Server({ server });
        this.setupWebSocketServer();
        this.pingInterval = setInterval(() => this.pingClients(), 30000);
    }

    private setupWebSocketServer(): void {
        this.wss.on('connection', (ws: WebSocket) => {
            const client = ws as WebSocketClient;
            client.id = Math.random().toString(36).substring(7);
            client.isAlive = true;

            this.clients.add(client);

            client.on('pong', () => {
                client.isAlive = true;
            });

            client.on('message', async (message: WebSocket.Data) => {
                try {
                    await this.handleMessage(client, message);
                } catch (error) {
                    this.handleError(client, error as Error);
                }
            });

            client.on('close', () => {
                this.clients.delete(client);
                if (client.sessionId) {
                    this.sessionManager.removeClient(client.sessionId, client.id);
                }
            });

            client.on('error', (error: Error) => {
                this.handleError(client, error);
            });
        });
    }

    private async handleMessage(client: WebSocketClient, message: WebSocket.Data): Promise<void> {
        const data = JSON.parse(message.toString());

        switch (data.type) {
            case 'join':
                await this.handleJoin(client, data.sessionId);
                break;
            case 'leave':
                await this.handleLeave(client);
                break;
            case 'message':
                await this.handleClientMessage(client, data.content);
                break;
            default:
                throw new Error(`Unknown message type: ${data.type}`);
        }
    }

    private async handleJoin(client: WebSocketClient, sessionId: string): Promise<void> {
        try {
            await this.sessionManager.addClient(sessionId, client.id);
            client.sessionId = sessionId;
            client.send(JSON.stringify({ type: 'joined', sessionId }));
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'WS_JOIN_ERROR',
                'MEDIUM',
                {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    clientId: client.id,
                    sessionId
                }
            );
            throw error;
        }
    }

    private async handleLeave(client: WebSocketClient): Promise<void> {
        if (client.sessionId) {
            await this.sessionManager.removeClient(client.sessionId, client.id);
            client.sessionId = undefined;
            client.send(JSON.stringify({ type: 'left' }));
        }
    }

    private async handleClientMessage(client: WebSocketClient, content: string): Promise<void> {
        if (!client.sessionId) {
            throw new Error('Client not in a session');
        }

        try {
            await this.sessionManager.broadcastMessage(client.sessionId, {
                type: 'message',
                clientId: client.id,
                content
            });
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'WS_MESSAGE_ERROR',
                'MEDIUM',
                {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    clientId: client.id,
                    sessionId: client.sessionId
                }
            );
            throw error;
        }
    }

    private handleError(client: WebSocketClient, error: Error): void {
        client.send(JSON.stringify({
            type: 'error',
            message: error.message
        }));

        this.securityAuditService.recordAlert(
            'WS_CLIENT_ERROR',
            'MEDIUM',
            {
                error: error.message,
                clientId: client.id,
                sessionId: client.sessionId
            }
        );
    }

    private pingClients(): void {
        this.clients.forEach(client => {
            if (!client.isAlive) {
                client.terminate();
                this.clients.delete(client);
                if (client.sessionId) {
                    this.sessionManager.removeClient(client.sessionId, client.id);
                }
                return;
            }

            client.isAlive = false;
            client.ping();
        });
    }

    async cleanup(): Promise<void> {
        clearInterval(this.pingInterval);
        this.clients.forEach(client => {
            client.terminate();
        });
        this.clients.clear();
        await new Promise<void>((resolve) => this.wss.close(() => resolve()));
    }
}
