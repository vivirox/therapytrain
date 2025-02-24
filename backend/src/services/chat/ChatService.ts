import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { RateLimiterService } from "../RateLimiterService";
import { SecurityAuditService } from "../SecurityAuditService";
import { AIService } from "../AIService";
import { MessageService } from "../MessageService";
import { Request, Response, NextFunction } from 'express';
import { supabase } from "@/config/supabase";
import { ChatSession, ChatMessage, SessionRecoveryData, WebSocketConfig, SessionKeys } from '@/types/websocket';
import { ZKService } from "../zkService";

export interface ChatClient {
    userId: string;
    ws: WebSocketServer;
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
    private zkService: ZKService;

    constructor(
        server: Server,
        rateLimiter: RateLimiterService,
        securityAudit: SecurityAuditService,
        config: WebSocketConfig = {}
    ) {
        this.wss = new WebSocketServer({ noServer: true });
        this.clients = new Map();
        this.messageHistory = new Map();
        this.rateLimiter = rateLimiter;
        this.securityAudit = securityAudit;
        this.zkService = new ZKService();
        this.config = {
            maxClients: 1000,
            pingInterval: 30000,
            pongTimeout: 10000,
            closeTimeout: 5000,
            ...config
        };
        this.aiService = new AIService(securityAudit, rateLimiter);
        this.messageService = new MessageService(securityAudit);

        this.setupWebSocketServer();
        this.startHeartbeat();
    }

    async createSession(userId: string, title: string, sessionKeys: SessionKeys): Promise<ChatSession> {
        const session = {
            id: crypto.randomUUID(),
            userId,
            title,
            createdAt: new Date().toISOString(),
            status: 'active',
            metadata: {
                keys: sessionKeys,
                messageCount: 0,
                lastActivity: new Date().toISOString()
            }
        };

        const { data, error } = await supabase
            .from('sessions')
            .insert(session)
            .select()
            .single();

        if (error) {
            this.securityAudit.recordEvent('session_creation_error', {
                userId,
                error: error.message,
                timestamp: new Date()
            });
            throw error;
        }

        return data;
    }

    async addMessage(
        sessionId: string,
        userId: string,
        type: string,
        encryptedContent: string,
        metadata: any = {}
    ): Promise<ChatMessage> {
        const message = {
            id: crypto.randomUUID(),
            sessionId,
            userId,
            type,
            content: encryptedContent,
            createdAt: new Date().toISOString(),
            metadata: {
                ...metadata,
                encrypted: true,
                timestamp: new Date().toISOString()
            }
        };

        const { data, error } = await supabase
            .from('messages')
            .insert(message)
            .select()
            .single();

        if (error) {
            this.securityAudit.recordEvent('message_creation_error', {
                userId,
                sessionId,
                error: error.message,
                timestamp: new Date()
            });
            throw error;
        }

        // Update session metadata
        await supabase
            .from('sessions')
            .update({
                metadata: {
                    messageCount: supabase.raw('(metadata->\'messageCount\')::int + 1'),
                    lastActivity: new Date().toISOString()
                }
            })
            .eq('id', sessionId);

        // Broadcast to connected clients
        this.broadcastToSession(sessionId, {
            type: 'new_message',
            payload: data
        });

        return data;
    }

    async getMessages(
        sessionId: string,
        limit: number = 50,
        before?: string
    ): Promise<ChatMessage[]> {
        let query = supabase
            .from('messages')
            .select('*')
            .eq('sessionId', sessionId)
            .order('createdAt', { ascending: false })
            .limit(limit);

        if (before) {
            query = query.lt('createdAt', before);
        }

        const { data, error } = await query;

        if (error) {
            this.securityAudit.recordEvent('message_fetch_error', {
                sessionId,
                error: error.message,
                timestamp: new Date()
            });
            throw error;
        }

        return data || [];
    }

    private broadcastToSession(sessionId: string, message: any): void {
        this.clients.forEach((client) => {
            if (client.sessionId === sessionId && client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(JSON.stringify(message));
            }
        });
    }

    private setupWebSocketServer(): void {
        this.wss.on('connection', async (ws: WebSocket, req: any) => {
            const userId = req.session?.userId;
            if (!userId) {
                ws.close(1008, 'Authentication required');
                return;
            }

            if (this.clients.size >= this.config.maxClients!) {
                ws.close(1008, 'Too many connections');
                return;
            }

            const client: ChatClient = {
                userId,
                ws,
                isAlive: true,
                sessionId: req.session?.sessionId || '',
                lastActivity: Date.now()
            };

            this.clients.set(userId, client);

            ws.on('pong', () => {
                const client = this.clients.get(userId);
                if (client) {
                    client.isAlive = true;
                }
            });

            ws.on('message', async (data: WebSocket.Data) => {
                try {
                    const message = JSON.parse(data.toString());
                    
                    // Rate limiting check
                    const canProceed = await this.rateLimiter.checkLimit(userId, 'websocket_message');
                    if (!canProceed) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            payload: 'Rate limit exceeded'
                        }));
                        return;
                    }

                    // Handle different message types
                    switch (message.type) {
                        case 'join_session':
                            await this.handleJoinSession(client, message.payload);
                            break;
                        case 'leave_session':
                            await this.handleLeaveSession(client);
                            break;
                        case 'chat_message':
                            await this.handleChatMessage(client, message.payload);
                            break;
                        default:
                            ws.send(JSON.stringify({
                                type: 'error',
                                payload: 'Unknown message type'
                            }));
                    }
                } catch (error) {
                    console.error('Error handling message:', error);
                    this.securityAudit.recordAlert('MESSAGE_HANDLING_ERROR', 'MEDIUM', {
                        userId,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            });

            ws.on('close', () => {
                this.handleDisconnection(client);
            });

            ws.on('error', (error: Error) => {
                console.error('WebSocket error:', error);
                this.securityAudit.recordAlert('WEBSOCKET_ERROR', 'HIGH', {
                    userId,
                    error: error.message
                });
            });
        });
    }

    private async handleJoinSession(client: ChatClient, payload: any): Promise<void> {
        const { sessionId } = payload;
        
        // Verify session access
        const { data: session } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (!session || (session.userId !== client.userId && !session.participants?.includes(client.userId))) {
            client.ws.send(JSON.stringify({
                type: 'error',
                payload: 'Session access denied'
            }));
            return;
        }

        client.sessionId = sessionId;
        client.lastActivity = Date.now();

        // Send session recovery data
        this.sendSessionRecoveryData(client);
    }

    private async handleLeaveSession(client: ChatClient): Promise<void> {
        client.sessionId = '';
        client.lastActivity = Date.now();
    }

    private async handleChatMessage(client: ChatClient, payload: any): Promise<void> {
        const { content, type } = payload;
        
        if (!client.sessionId) {
            client.ws.send(JSON.stringify({
                type: 'error',
                payload: 'No active session'
            }));
            return;
        }

        // Get recipient's public key
        const { data: session } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', client.sessionId)
            .single();

        if (!session) {
            client.ws.send(JSON.stringify({
                type: 'error',
                payload: 'Session not found'
            }));
            return;
        }

        // Get recipient ID
        const recipientId = session.userId === client.userId ? session.participants[0] : session.userId;

        // Get recipient's public key
        const { data: recipientKey } = await supabase
            .from('user_keys')
            .select('public_key')
            .eq('user_id', recipientId)
            .single();

        if (!recipientKey) {
            client.ws.send(JSON.stringify({
                type: 'error',
                payload: 'Recipient key not found'
            }));
            return;
        }

        // Encrypt message
        const encryptedMessage = await this.zkService.encryptMessage(
            content,
            client.userId,
            recipientId,
            recipientKey.public_key
        );

        // Add message to database
        await this.addMessage(client.sessionId, client.userId, type, encryptedMessage);
    }

    private startHeartbeat(): void {
        setInterval(() => {
            this.clients.forEach((client) => {
                if (!client.isAlive) {
                    this.handleDisconnection(client);
                    return;
                }
                client.isAlive = false;
                client.ws.ping();
            });
        }, this.config.pingInterval);
    }

    private handleDisconnection(client: ChatClient): void {
        client.ws.terminate();
        this.clients.delete(client.userId);
    }

    private async sendSessionRecoveryData(client: ChatClient): Promise<void> {
        if (!client.sessionId) return;

        const messages = await this.getMessages(client.sessionId, 50);
        
        client.ws.send(JSON.stringify({
            type: 'session_recovery',
            payload: {
                sessionId: client.sessionId,
                messages
            }
        }));
    }
}
