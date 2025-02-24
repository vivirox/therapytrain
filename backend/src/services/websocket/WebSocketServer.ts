import { WebSocket, Server as WSServer } from 'ws';
import { IncomingMessage } from 'http';
import { SecurityAuditService } from '../SecurityAuditService';
import { SessionManager } from '../SessionManager';
import { logger } from '../../lib/logger';

interface WebSocketClient extends WebSocket {
    id: string;
    sessionId?: string;
    isAlive: boolean;
    lastActivity: Date;
    pingTimeout?: NodeJS.Timeout;
    stallTimeout?: NodeJS.Timeout;
}

export class WebSocketService {
    private static instance: WebSocketService;
    private readonly wss: WSServer;
    private readonly clients: Set<WebSocketClient> = new Set();
    private readonly securityAuditService: SecurityAuditService;
    private readonly sessionManager: SessionManager;
    
    private readonly heartbeatInterval = 15000; // 15 seconds
    private readonly stallThreshold = 45000; // 45 seconds
    private readonly maxInactivityPeriod = 300000; // 5 minutes

    private constructor() {
        this.wss = new WSServer({ noServer: true });
        this.securityAuditService = SecurityAuditService.getInstance();
        this.sessionManager = SessionManager.getInstance();
        this.setupWebSocketServer();
        this.startHeartbeatCheck();
    }

    public static getInstance(): WebSocketService {
        if (!WebSocketService.instance) {
            WebSocketService.instance = new WebSocketService();
        }
        return WebSocketService.instance;
    }

    private setupWebSocketServer(): void {
        this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
            const client = ws as WebSocketClient;
            client.id = Math.random().toString(36).substring(7);
            client.isAlive = true;
            client.lastActivity = new Date();

            this.clients.add(client);

            // Set up ping timeout for this client
            this.setupClientHeartbeat(client);

            client.on('pong', () => {
                this.handlePong(client);
            });

            client.on('message', async (data: WebSocket.Data) => {
                try {
                    const message = JSON.parse(data.toString());
                    
                    // Handle ping messages from client
                    if (message.type === 'ping') {
                        client.send(JSON.stringify({ type: 'pong' }));
                        this.updateClientActivity(client);
                        return;
                    }

                    await this.handleMessage(client, message);
                    this.updateClientActivity(client);
                } catch (error) {
                    await this.handleError(client, error as Error);
                }
            });

            client.on('close', () => {
                this.handleDisconnection(client);
            });

            client.on('error', async (error: Error) => {
                await this.handleError(client, error);
            });

            // Send welcome message
            this.sendToClient(client, {
                type: 'WELCOME',
                payload: { clientId: client.id },
                timestamp: Date.now()
            });
        });
    }

    private setupClientHeartbeat(client: WebSocketClient): void {
        // Clear any existing timeouts
        if (client.pingTimeout) clearTimeout(client.pingTimeout);
        if (client.stallTimeout) clearTimeout(client.stallTimeout);

        // Set up new ping timeout
        client.pingTimeout = setTimeout(() => {
            this.pingClient(client);
        }, this.heartbeatInterval);

        // Set up stall detection
        client.stallTimeout = setTimeout(() => {
            this.checkClientStall(client);
        }, this.stallThreshold);
    }

    private pingClient(client: WebSocketClient): void {
        if (!client.isAlive) {
            client.terminate();
            this.handleDisconnection(client);
            return;
        }

        client.isAlive = false;
        client.ping();
        
        // Reset ping timeout
        this.setupClientHeartbeat(client);
    }

    private handlePong(client: WebSocketClient): void {
        client.isAlive = true;
        client.lastActivity = new Date();
        this.setupClientHeartbeat(client);
    }

    private updateClientActivity(client: WebSocketClient): void {
        client.lastActivity = new Date();
        client.isAlive = true;
        this.setupClientHeartbeat(client);
    }

    private checkClientStall(client: WebSocketClient): void {
        const timeSinceLastActivity = Date.now() - client.lastActivity.getTime();
        
        if (timeSinceLastActivity > this.stallThreshold) {
            logger.warn('Client connection stalled', {
                clientId: client.id,
                lastActivity: client.lastActivity,
                timeSinceLastActivity
            });
            
            client.terminate();
            this.handleDisconnection(client);
        }
    }

    private startHeartbeatCheck(): void {
        setInterval(() => {
            const now = Date.now();
            this.clients.forEach(client => {
                const timeSinceLastActivity = now - client.lastActivity.getTime();
                
                if (timeSinceLastActivity > this.maxInactivityPeriod) {
                    logger.warn('Client exceeded max inactivity period', {
                        clientId: client.id,
                        lastActivity: client.lastActivity,
                        timeSinceLastActivity
                    });
                    
                    client.terminate();
                    this.handleDisconnection(client);
                    return;
                }

                this.pingClient(client);
            });
        }, this.heartbeatInterval);
    }

    private async handleMessage(client: WebSocketClient, message: any): Promise<void> {
        try {
            // Update client activity
            this.updateClientActivity(client);

            // Process message
            if (message.recipient) {
                await this.forwardMessage(client, message);
            }

            // Emit message event
            this.wss.emit('message', {
                type: message.type,
                data: message.payload,
                timestamp: Date.now(),
                source: client.id,
                metadata: message.metadata
            });
        } catch (error) {
            await this.handleError(client, error as Error);
        }
    }

    private async handleError(client: WebSocketClient, error: Error): Promise<void> {
        await this.securityAuditService.recordAlert('WEBSOCKET_CLIENT_ERROR', 'HIGH', {
            error: error.message,
            clientId: client.id
        });
        
        logger.error('WebSocket client error', {
            clientId: client.id,
            error: error.message,
            stack: error.stack
        });
    }

    private handleDisconnection(client: WebSocketClient): void {
        // Clear timeouts
        if (client.pingTimeout) clearTimeout(client.pingTimeout);
        if (client.stallTimeout) clearTimeout(client.stallTimeout);

        // Remove client
        this.clients.delete(client);
        
        // Clean up session
        if (client.sessionId) {
            this.sessionManager.removeClient(client.sessionId, client.id);
        }

        logger.info('Client disconnected', {
            clientId: client.id,
            sessionId: client.sessionId,
            lastActivity: client.lastActivity
        });
    }

    private async forwardMessage(client: WebSocketClient, message: any): Promise<void> {
        const recipientClient = Array.from(this.clients).find(c => c.id === message.recipient);
        
        if (recipientClient && recipientClient.readyState === WebSocket.OPEN) {
            recipientClient.send(JSON.stringify({
                type: message.type,
                payload: message.payload,
                sender: client.id,
                timestamp: Date.now()
            }));
        }
    }

    public sendToClient(client: WebSocketClient, message: any): void {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    }

    public broadcast(message: any, exclude?: string[]): void {
        this.clients.forEach(client => {
            if (!exclude?.includes(client.id) && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }
}
