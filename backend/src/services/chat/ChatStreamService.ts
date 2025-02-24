import { Request, Response } from 'express';
import { supabase } from "@/config/supabase";
import { ChatService } from "./ChatService";
import { Message, ChatStreamResponse, ChatEvent, SecureMessage } from "@/types/chat";
import { ZKService } from "../zkService";
import { RateLimiterService } from "../RateLimiterService";
import { SecurityAuditService } from "../SecurityAuditService";
import { AIService } from "../AIService";
import { EventEmitter } from 'events';

export class ChatStreamService {
    private chatService: ChatService;
    private zkService: ZKService;
    private rateLimiter: RateLimiterService;
    private securityAudit: SecurityAuditService;
    private aiService: AIService;
    private readonly eventEmitter: EventEmitter;

    constructor() {
        this.chatService = new ChatService();
        this.zkService = new ZKService();
        this.rateLimiter = new RateLimiterService();
        this.securityAudit = new SecurityAuditService();
        this.aiService = new AIService();
        this.eventEmitter = new EventEmitter();
        this.eventEmitter.setMaxListeners(100); // Adjust based on expected concurrent connections
    }

    async handleSSE(req: Request, res: Response, messageHandler?: (message: SecureMessage) => Promise<Message>) {
        const sessionId = req.params.sessionId;
        const userId = req.user?.id;

        if (!sessionId || !userId) {
            res.status(400).json({ error: 'Missing sessionId or userId' });
            return;
        }

        try {
            // Check rate limit for SSE connections
            const canConnect = await this.rateLimiter.checkLimit(userId, 'sse_connection');
            if (!canConnect) {
                res.status(429).json({ error: 'Too many connections' });
                return;
            }

            // Get user's private key for decryption
            const { data: userKey } = await supabase
                .from('user_keys')
                .select('private_key')
                .eq('user_id', userId)
                .single();

            if (!userKey) {
                res.status(400).json({ error: 'User key not found' });
                return;
            }

            // Set up SSE headers
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });

            // Send initial connection message
            this.sendEvent(res, {
                type: 'status',
                payload: { status: 'connected' },
                timestamp: new Date().toISOString()
            });

            // Subscribe to real-time updates
            const subscription = supabase
                .channel(`session:${sessionId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `session_id=eq.${sessionId}`
                }, async (payload: any) => {
                    try {
                        const encryptedMessage = payload.new as SecureMessage;

                        // Check if user should receive this message
                        if (encryptedMessage.user_id !== userId && encryptedMessage.recipient_id !== userId) {
                            return;
                        }

                        // Decrypt message if needed
                        let message: Message;
                        if (messageHandler) {
                            message = await messageHandler(encryptedMessage);
                        } else {
                            message = await this.zkService.decryptMessage(
                                encryptedMessage,
                                userKey.private_key
                            );
                        }

                        // Send decrypted message to client
                        this.sendEvent(res, {
                            type: 'message',
                            payload: message,
                            timestamp: new Date().toISOString()
                        });

                        // If this is a user message, generate AI response
                        if (message.type === 'text') {
                            await this.handleAIResponse(sessionId, userId, message, res, userKey.private_key);
                        }

                        // Audit log
                        await this.securityAudit.recordEvent('message_streamed', {
                            userId,
                            sessionId,
                            messageId: message.id,
                            timestamp: new Date()
                        });
                    } catch (error) {
                        console.error('Error processing message:', error);
                        this.sendEvent(res, {
                            type: 'error',
                            payload: { error: 'Failed to process message' },
                            timestamp: new Date().toISOString()
                        });

                        // Audit error
                        await this.securityAudit.recordAlert('MESSAGE_PROCESSING_ERROR', 'HIGH', {
                            userId,
                            sessionId,
                            error: error instanceof Error ? error.message : 'Unknown error'
                        });
                    }
                })
                .subscribe();

            // Set up heartbeat to keep connection alive
            const heartbeatInterval = setInterval(() => {
                this.sendEvent(res, {
                    type: 'heartbeat',
                    payload: { timestamp: Date.now() },
                    timestamp: new Date().toISOString()
                });
            }, 30000);

            // Handle client disconnection
            req.on('close', () => {
                clearInterval(heartbeatInterval);
                subscription.unsubscribe();
                this.eventEmitter.emit('client_disconnected', { userId, sessionId });
            });

        } catch (error) {
            console.error('SSE error:', error);
            this.securityAudit.recordAlert('SSE_ERROR', 'HIGH', {
                userId,
                sessionId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            res.end();
        }
    }

    private async handleAIResponse(
        sessionId: string,
        userId: string,
        userMessage: Message,
        res: Response,
        privateKey: string
    ) {
        try {
            // Check rate limit for AI responses
            const canGenerate = await this.rateLimiter.checkLimit(userId, 'ai_response');
            if (!canGenerate) {
                this.sendEvent(res, {
                    type: 'error',
                    payload: { error: 'AI response rate limit exceeded' },
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Get conversation history
            const messages = await this.chatService.getMessages(sessionId, 10);
            
            // Decrypt history for AI context
            const decryptedHistory = await Promise.all(
                messages.map(async (msg) => ({
                    role: msg.type === 'ai' ? 'assistant' : 'user',
                    content: await this.zkService.decryptMessage(msg, privateKey)
                }))
            );

            // Start streaming AI response
            const stream = await this.aiService.streamResponse(decryptedHistory);
            let fullResponse = '';
            const startTime = Date.now();

            for await (const chunk of stream) {
                // Encrypt chunk before sending
                const encryptedChunk = await this.zkService.encryptMessage(
                    chunk,
                    'system',
                    userId,
                    privateKey
                );

                fullResponse += chunk;

                // Send encrypted chunk to client
                this.sendEvent(res, {
                    type: 'message',
                    payload: {
                        id: `${sessionId}-${Date.now()}`,
                        type: 'ai',
                        content: encryptedChunk,
                        timestamp: new Date().toISOString()
                    } as ChatStreamResponse,
                    timestamp: new Date().toISOString()
                });
            }

            // Save complete response
            const processingTime = Date.now() - startTime;
            const encryptedResponse = await this.zkService.encryptMessage(
                fullResponse,
                'system',
                userId,
                privateKey
            );

            await this.chatService.addMessage(sessionId, 'system', 'ai', encryptedResponse, {
                processingTime,
                model: 'gpt-4',
                provider: 'openai'
            });

        } catch (error) {
            console.error('AI response error:', error);
            this.sendEvent(res, {
                type: 'error',
                payload: { error: 'Failed to generate AI response' },
                timestamp: new Date().toISOString()
            });

            await this.securityAudit.recordAlert('AI_RESPONSE_ERROR', 'HIGH', {
                userId,
                sessionId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    private sendEvent(res: Response, event: ChatEvent) {
        try {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
        } catch (error) {
            console.error('Error sending event:', error);
            this.securityAudit.recordAlert('EVENT_SEND_ERROR', 'MEDIUM', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
