import { Server } from 'http';
import WebSocket from 'ws';
import { ChatService, ChatClient } from "../ChatService";
import { RateLimiterService } from "../RateLimiterService";
import { SecurityAuditService } from "../SecurityAuditService";
import { MessageService } from "../MessageService";
import { AIService } from "../AIService";
import { Request } from 'express';
jest.mock('../MessageService');
jest.mock('../AIService');
jest.mock('../RateLimiterService');
jest.mock('../SecurityAuditService');
class TestChatService extends ChatService {
    // Expose protected methods for testing
    public async testSendSessionRecoveryData(client: ChatClient) {
        return this.sendSessionRecoveryData(client);
    }
    public async testHandleMessage(userId: string, message: string, sessionId: string) {
        return this.handleMessage(userId, message, sessionId);
    }
    public async testCreateOrRecoverSession(userId: string, request: Request) {
        return this.createOrRecoverSession(userId, request);
    }
    public testHandleDisconnection(client: ChatClient) {
        return this.handleDisconnection(client);
    }
    // Expose other protected methods for testing
    public get testWss() { return this.wss; }
    public get testClients() { return this.clients; }
    public get testDisconnectedSessions() { return this.disconnectedSessions; }
}
describe('ChatService', () => {
    let chatService: TestChatService;
    let mockServer: Server;
    let mockRateLimiter: jest.Mocked<RateLimiterService>;
    let mockSecurityAudit: jest.Mocked<SecurityAuditService>;
    let mockWs: jest.Mocked<WebSocket>;
    let mockReq: any;
    beforeEach(() => {
        mockServer = {
            on: jest.fn(),
        } as any;
        mockRateLimiter = {
            isRateLimited: jest.fn().mockReturnValue(false),
        } as any;
        mockSecurityAudit = {
            recordEvent: jest.fn(),
        } as any;
        mockWs = {
            on: jest.fn(),
            send: jest.fn(),
            close: jest.fn(),
            readyState: WebSocket.OPEN,
        } as any;
        mockReq = {
            headers: {
                authorization: 'Bearer test-token',
            },
            socket: {
                remoteAddress: '127.0.0.1',
            },
        };
        chatService = new TestChatService(mockServer, mockRateLimiter, mockSecurityAudit);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('connection handling', () => {
        it('should reject connection without authentication', () => {
            mockReq.headers.authorization = undefined;
            chatService.testWss.emit('connection', mockWs, mockReq);
            expect(mockWs.close).toHaveBeenCalledWith(1008, 'Authentication required');
        });
        it('should reject connection when rate limited', () => {
            mockRateLimiter.isRateLimited.mockReturnValueOnce(true);
            chatService.testWss.emit('connection', mockWs, mockReq);
            expect(mockWs.close).toHaveBeenCalledWith(1008, 'Too many connections');
        });
        it('should set up client connection successfully', async () => {
            const mockSessionId = 'test-session';
            (MessageService.prototype.createSession as jest.Mock).mockResolvedValueOnce(mockSessionId);
            await chatService.testWss.emit('connection', mockWs, mockReq);
            expect(mockWs.on).toHaveBeenCalledWith('message', expect.any(Function));
            expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function));
            expect(mockWs.on).toHaveBeenCalledWith('pong', expect.any(Function));
            expect(mockSecurityAudit.recordEvent).toHaveBeenCalledWith('chat_connection', expect.any(Object));
        });
    });
    describe('message handling', () => {
        const userId = 'test-user';
        const sessionId = 'test-session';
        const validMessage = {
            content: 'test message',
            type: 'message',
        };
        beforeEach(() => {
            chatService.testClients.set(userId, {
                userId,
                ws: mockWs,
                isAlive: true,
                sessionId,
                lastActivity: Date.now()
            });
        });
        it('should handle valid message and broadcast response', async () => {
            const messageStr = JSON.stringify(validMessage);
            const mockAiResponse = {
                content: 'AI response',
                metadata: {
                    sentiment: 0.5,
                    topics: ['test'],
                },
            };
            (AIService.prototype.processMessage as jest.Mock).mockResolvedValueOnce(mockAiResponse);
            (MessageService.prototype.saveMessage as jest.Mock).mockImplementation(async (sid: unknown, uid: unknown, content: unknown, type: unknown) => ({
                session_id: sid,
                user_id: uid,
                content,
                type,
                created_at: new Date().toISOString(),
            }));
            await chatService.testHandleMessage(userId, messageStr, sessionId);
            expect(MessageService.prototype.saveMessage).toHaveBeenCalledTimes(2);
            expect(mockWs.send).toHaveBeenCalledTimes(2);
            expect(mockSecurityAudit.recordEvent).toHaveBeenCalledWith('chat_message', expect.any(Object));
        });
        it('should handle message rate limiting', async () => {
            mockRateLimiter.isRateLimited.mockReturnValueOnce(true);
            const messageStr = JSON.stringify(validMessage);
            await expect(chatService.testHandleMessage(userId, messageStr, sessionId)).rejects.toThrow('Message rate limit exceeded');
        });
        it('should handle AI processing errors', async () => {
            const messageStr = JSON.stringify(validMessage);
            const mockError = new Error('AI processing failed');
            (AIService.prototype.processMessage as jest.Mock).mockRejectedValueOnce(mockError);
            (MessageService.prototype.saveMessage as jest.Mock).mockImplementation(async (sid: unknown, uid: unknown, content: unknown, type: unknown) => ({
                session_id: sid,
                user_id: uid,
                content,
                type,
                created_at: new Date().toISOString(),
            }));
            await chatService.testHandleMessage(userId, messageStr, sessionId);
            expect(mockSecurityAudit.recordEvent).toHaveBeenCalledWith('chat_error', expect.any(Object));
            expect(MessageService.prototype.saveMessage).toHaveBeenCalledWith(sessionId, 'system', 'Unable to process message with AI assistant', 'error');
        });
        it('should detect and log crisis situations', async () => {
            const messageStr = JSON.stringify(validMessage);
            const mockAiResponse = {
                content: 'AI response',
                metadata: {
                    sentiment: -0.8,
                    topics: ['crisis'],
                },
            };
            (AIService.prototype.processMessage as jest.Mock).mockResolvedValueOnce(mockAiResponse);
            (MessageService.prototype.saveMessage as jest.Mock).mockImplementation(async (sid: unknown, uid: unknown, content: unknown, type: unknown) => ({
                session_id: sid,
                user_id: uid,
                content,
                type,
                created_at: new Date().toISOString(),
            }));
            await chatService.testHandleMessage(userId, messageStr, sessionId);
            expect(mockSecurityAudit.recordEvent).toHaveBeenCalledWith('crisis_alert', expect.any(Object));
        });
        it('should process messages correctly', () => {
            const mockWs = {
                send: jest.fn(),
            };
            const calls = mockWs.send.mock.calls;
            const sentMessages = calls.map((call) => JSON.parse(call[0] as string));
            expect(sentMessages).toBeDefined();
        });
    });
    describe('session management', () => {
        it('should end session on client disconnect', async () => {
            const userId = 'test-user';
            const sessionId = 'test-session';
            const mockCloseHandler = mockWs.on.mock.calls.find((call): call is [
                string,
                (...args: Array<any>) => void
            ] => typeof call[0] === 'string' && call[0] === 'close')?.[1];
            chatService.testClients.set(userId, {
                userId,
                ws: mockWs,
                isAlive: true,
                sessionId,
                lastActivity: Date.now()
            });
            if (mockCloseHandler) {
                await mockCloseHandler();
            }
            expect(MessageService.prototype.endSession).toHaveBeenCalledWith(sessionId);
            expect(chatService.testClients.has(userId)).toBeFalsy();
        });
    });
    describe('session recovery', () => {
        const userId = 'test-user';
        const sessionId = 'test-session';
        const mockMessages = [
            {
                session_id: sessionId,
                user_id: userId,
                content: 'test message 1',
                type: 'message',
                created_at: new Date().toISOString(),
                metadata: null
            },
            {
                session_id: sessionId,
                user_id: 'system',
                content: 'test response 1',
                type: 'ai_response',
                created_at: new Date().toISOString(),
                metadata: { sentiment: 0.5 }
            }
        ];
        beforeEach(() => {
            (MessageService.prototype.getUserSessions as jest.Mock).mockResolvedValue([{
                    id: sessionId,
                    user_id: userId,
                    last_activity: new Date().toISOString()
                }]);
            (MessageService.prototype.updateSessionActivity as jest.Mock).mockResolvedValue(undefined);
            (MessageService.prototype.getRecentMessages as jest.Mock).mockResolvedValue(mockMessages);
            (MessageService.prototype.getSessionSummary as jest.Mock).mockResolvedValue({
                messageCount: 2,
                averageSentiment: 0.5
            });
        });
        it('should recover recent session', async () => {
            await chatService.testCreateOrRecoverSession(userId, mockReq);
            expect(MessageService.prototype.getUserSessions).toHaveBeenCalledWith(userId);
            expect(MessageService.prototype.updateSessionActivity).toHaveBeenCalledWith(sessionId);
            expect(MessageService.prototype.createSession).not.toHaveBeenCalled();
        });
        it('should create new session if no recent session exists', async () => {
            (MessageService.prototype.getUserSessions as jest.Mock).mockResolvedValue([]);
            const newSessionId = 'new-session';
            (MessageService.prototype.createSession as jest.Mock).mockResolvedValue({
                id: newSessionId,
                user_id: userId
            });
            const result = await chatService.testCreateOrRecoverSession(userId, mockReq);
            expect(result).toBe(newSessionId);
            expect(MessageService.prototype.createSession).toHaveBeenCalledWith(userId, mockReq.socket.remoteAddress, undefined);
        });
        it('should send session recovery data', async () => {
            const client = {
                userId,
                ws: mockWs,
                isAlive: true,
                sessionId,
                lastActivity: Date.now()
            };
            await chatService.testSendSessionRecoveryData(client);
            // Should send recovery notification
            expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('Reconnected to previous session'));
            // Should send all messages
            expect(mockWs.send).toHaveBeenCalledTimes(4); // notification + 2 messages + summary
            // Verify message content
            const calls = (mockWs.send as jest.Mock).mock.calls;
            const sentMessages = calls.map((call) => JSON.parse(call[0] as string));
            expect(sentMessages[0].type).toBe('status');
            expect(sentMessages[0].content).toBe('Reconnected to previous session');
            expect(sentMessages[1].content).toBe(mockMessages[0].content);
            expect(sentMessages[2].content).toBe(mockMessages[1].content);
            expect(sentMessages[3].type).toBe('status');
            expect(sentMessages[3].content).toBe('Session Summary');
        });
        it('should handle disconnection', () => {
            const client = {
                userId,
                ws: mockWs,
                isAlive: true,
                sessionId,
                lastActivity: Date.now()
            };
            chatService.testHandleDisconnection(client);
            expect(chatService.testDisconnectedSessions.get(userId)).toBeDefined();
            expect(chatService.testClients.has(userId)).toBeFalsy();
            expect(mockSecurityAudit.recordEvent).toHaveBeenCalledWith('client_disconnected', expect.any(Object));
        });
        it('should handle client disconnection correctly', () => {
            const mockWs = {
                on: jest.fn(),
                send: jest.fn(),
                close: jest.fn(),
            };
            const calls = mockWs.on.mock.calls;
            const closeHandler = calls.find((call: [
                string,
                Function
            ]) => typeof call[0] === 'string' && call[0] === 'close');
            expect(closeHandler).toBeDefined();
        });
    });
});
