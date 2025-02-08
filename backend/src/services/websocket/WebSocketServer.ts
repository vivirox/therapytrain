import WebSocket from 'ws';
import { Server } from 'http';
import { SecurityAuditService } from '../SecurityAuditService';
import { SessionManager } from './SessionManager';

interface WebSocketClient extends WebSocket {
    id: string;
    sessionId?: string;
    isAlive: boolean;
}

export class WebSocketService {
    private wss: WebSocket.Server;
    private readonly clients: Set<WebSocketClient> = new Set();
    private readonly pingInterval: NodeJS.Timeout;

    constructor(
        server: Server,
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

            client.on('message', async (message: string) => {
                try {
                    await this.handleMessage(client, message);
                } catch (error) {
                    await this.securityAuditService.recordAlert('WEBSOCKET_MESSAGE_ERROR', 'MEDIUM', {
                        error: error instanceof Error ? error.message : 'Unknown error',
                        clientId: client.id
                    });
                }
            });

            client.on('close', () => {
                this.clients.delete(client);
                if (client.sessionId) {
                    this.sessionManager.removeClient(client.sessionId, client.id);
                }
            });

            client.on('error', async (error: Error) => {
                await this.securityAuditService.recordAlert('WEBSOCKET_CLIENT_ERROR', 'HIGH', {
                    error: error.message,
                    clientId: client.id
                });
            });
        });
    }

    private pingClients(): void {
        this.clients.forEach((client: any) => {
            if (!client.isAlive) {
                client.terminate();
                this.clients.delete(client);
                return;
            }

            client.isAlive = false;
            client.ping();
        });
    }

    private async handleMessage(client: WebSocketClient, message: string): Promise<void> {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'join_session':
                client.sessionId = data.sessionId;
                await this.sessionManager.addClient(data.sessionId, client.id);
                break;

            case 'leave_session':
                if (client.sessionId) {
                    await this.sessionManager.removeClient(client.sessionId, client.id);
                    client.sessionId = undefined;
                }
                break;

            default:
                if (client.sessionId) {
                    await this.sessionManager.handleMessage(client.sessionId, client.id, data);
                }
        }
    }

    public close(): void {
        clearInterval(this.pingInterval);
        this.wss.close();
    }
}
