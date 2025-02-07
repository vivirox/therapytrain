import { Request, Response, NextFunction } from 'express';
import { supabase } from "@/../../config/database";
import { ChatService } from "./ChatService";
import { Message, ChatStreamResponse, ChatEvent } from "@/../types/chat";
import { OpenAIService } from "@/ai/OpenAIService";
import { AnthropicService } from "@/ai/AnthropicService";
import { GoogleAIService } from "@/ai/GoogleAIService";
export class ChatStreamService {
    private chatService: ChatService;
    private openAI: OpenAIService;
    private anthropic: AnthropicService;
    private googleAI: GoogleAIService;
    constructor() {
        this.chatService = new ChatService();
        this.openAI = new OpenAIService();
        this.anthropic = new AnthropicService();
        this.googleAI = new GoogleAIService();
    }
    async handleSSE(req: Request, res: Response) {
        const sessionId = req.params.sessionId;
        const userId = req.user?.id;
        if (!sessionId || !userId) {
            res.status(400).json({ error: 'Missing sessionId or userId' });
            return;
        }
        try {
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
            // Subscribe to real-time updates for this session
            const subscription = supabase
                .channel(`session:${sessionId}`)
                .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `session_id=eq.${sessionId}`
            }, async (payload: unknown) => {
                const message = payload.new as Message;
                this.sendEvent(res, {
                    type: 'message',
                    payload: message,
                    timestamp: new Date().toISOString()
                });
                // If this is a user message, generate AI response
                if (message.type === 'text') {
                    await this.handleAIResponse(sessionId, userId, message, res);
                }
            })
                .subscribe();
            // Handle client disconnection
            req.on('close', () => {
                subscription.unsubscribe();
            });
        }
        catch (error) {
            console.error('SSE error:', error);
            res.end();
        }
    }
    private async handleAIResponse(sessionId: string, userId: string, userMessage: Message, res: Response) {
        try {
            // Get session settings
            const session = await this.chatService.getSession(sessionId);
            if (!session)
                throw new Error('Session not found');
            // Get conversation history
            const messages = await this.chatService.getMessages(sessionId, 10);
            const history = messages.map((m: any) => ({
                role: m.payload.role || 'user',
                content: m.payload.content
            }));
            // Select AI service based on session settings
            const aiService = this.selectAIService(session.payload.settings.model);
            // Start streaming response
            const stream = await aiService.streamResponse(history);
            let fullResponse = '';
            let startTime = Date.now();
            for await (const chunk of stream) {
                fullResponse += chunk;
                // Send chunk to client
                this.sendEvent(res, {
                    type: 'message',
                    payload: {
                        id: `${sessionId}-${Date.now()}`,
                        type: 'ai',
                        content: chunk,
                        role: 'assistant',
                        timestamp: new Date().toISOString()
                    } as ChatStreamResponse,
                    timestamp: new Date().toISOString()
                });
            }
            // Save complete response
            const processingTime = Date.now() - startTime;
            await this.chatService.addMessage(sessionId, userId, 'ai', fullResponse, {
                processingTime,
                model: session.payload.settings.model,
                provider: aiService.provider
            });
        }
        catch (error) {
            console.error('AI response error:', error);
            this.sendEvent(res, {
                type: 'error',
                payload: { error: 'Failed to generate AI response' },
                timestamp: new Date().toISOString()
            });
        }
    }
    private selectAIService(model: string = 'gpt-4') {
        if (model.startsWith('gpt'))
            return this.openAI;
        if (model.startsWith('claude'))
            return this.anthropic;
        if (model.startsWith('palm'))
            return this.googleAI;
        return this.openAI; // default
    }
    private sendEvent(res: Response, event: ChatEvent) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
}
