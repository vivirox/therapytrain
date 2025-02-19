import { Router, Request, Response, NextFunction } from 'express';
import { ChatService } from "@/services/chat/ChatService";
import { ChatStreamService } from "@/services/chat/ChatStreamService";
import { SecurityAuditService } from "@/services/SecurityAuditService";
import { ZKService } from "@/services/zkService";
import { Session, Message, SecureMessage } from "@/types/chat";
import { supabase } from "@/config/supabase";
import { RateLimiterService } from "@/services/RateLimiterService";

const router = Router();
const chatService = new ChatService();
const chatStreamService = new ChatStreamService();
const securityAudit = new SecurityAuditService();
const zkService = new ZKService();
const rateLimiter = new RateLimiterService();

// Create new chat session
router.post('/sessions', async (req: Request, res: Response) => {
    try {
        const { title } = req.body;
        const userId = req.user?.id;
        
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        // Check rate limit
        const canProceed = await rateLimiter.checkLimit(userId, 'create_session');
        if (!canProceed) {
            res.status(429).json({ error: 'Rate limit exceeded' });
            return;
        }

        // Generate session keys
        const sessionKeys = await zkService.generateSessionKeys();
        
        const session = await chatService.createSession(userId, title, sessionKeys);
        
        // Audit log
        await securityAudit.recordEvent('session_created', {
            userId,
            sessionId: session.id,
            timestamp: new Date()
        });

        res.json(session);
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

// Get user's chat sessions
router.get('/sessions', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const sessions = await chatService.getUserSessions(userId);
        res.json(sessions);
    }
    catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

// Get specific session
router.get('/sessions/:sessionId', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const session = await chatService.getSession(sessionId);
        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        res.json(session);
    }
    catch (error) {
        console.error('Error fetching session:', error);
        res.status(500).json({ error: 'Failed to fetch session' });
    }
});

// Update session
router.patch('/sessions/:sessionId', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const updates = req.body;
        const session = await chatService.updateSession(sessionId, updates);
        res.json(session);
    }
    catch (error) {
        console.error('Error updating session:', error);
        res.status(500).json({ error: 'Failed to update session' });
    }
});

// Delete session
router.delete('/sessions/:sessionId', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        await chatService.deleteSession(sessionId);
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting session:', error);
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

// Get decrypted messages
router.get('/sessions/:sessionId/messages', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const { limit, before } = req.query;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        // Check rate limit
        const canProceed = await rateLimiter.checkLimit(userId, 'get_messages');
        if (!canProceed) {
            res.status(429).json({ error: 'Rate limit exceeded' });
            return;
        }

        // Get user's private key
        const { data: userKey } = await supabase
            .from('user_keys')
            .select('private_key')
            .eq('user_id', userId)
            .single();

        if (!userKey) {
            res.status(400).json({ error: 'User key not found' });
            return;
        }

        // Get encrypted messages
        const encryptedMessages = await chatService.getMessages(sessionId, Number(limit) || 50, before as string);

        // Decrypt messages
        const decryptedMessages = await Promise.all(
            encryptedMessages.map(async (msg) => {
                if (msg.user_id === userId || msg.recipient_id === userId) {
                    return await zkService.decryptMessage(msg, userKey.private_key);
                }
                return msg;
            })
        );

        res.json(decryptedMessages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Send encrypted message
router.post('/sessions/:sessionId/messages', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const { content, type } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        // Check rate limit
        const canProceed = await rateLimiter.checkLimit(userId, 'send_message');
        if (!canProceed) {
            res.status(429).json({ error: 'Rate limit exceeded' });
            return;
        }

        // Get recipient's public key
        const { data: session } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }

        // Get recipient ID (the other participant)
        const recipientId = session.client_id === userId ? session.therapist_id : session.client_id;

        // Get recipient's public key
        const { data: recipientKey } = await supabase
            .from('user_keys')
            .select('public_key')
            .eq('user_id', recipientId)
            .single();

        if (!recipientKey) {
            res.status(400).json({ error: 'Recipient key not found' });
            return;
        }

        // Encrypt message
        const encryptedMessage = await zkService.encryptMessage(content, userId, recipientId, recipientKey.public_key);

        // Add message to database
        const message = await chatService.addMessage(sessionId, userId, type, encryptedMessage);

        // Audit log
        await securityAudit.recordEvent('message_sent', {
            userId,
            sessionId,
            messageId: message.id,
            timestamp: new Date()
        });

        res.json(message);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Get session statistics
router.get('/sessions/:sessionId/stats', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const stats = await chatService.getSessionStats(sessionId);
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// SSE endpoint for real-time updates with encryption
router.get('/sessions/:sessionId/stream', async (req: Request, res: Response) => {
    const userId = req.user?.id;
    
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
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

    // Modify the stream handler to decrypt messages
    const streamHandler = async (message: SecureMessage) => {
        if (message.user_id === userId || message.recipient_id === userId) {
            const decryptedMessage = await zkService.decryptMessage(message, userKey.private_key);
            return decryptedMessage;
        }
        return message;
    };

    chatStreamService.handleSSE(req, res, streamHandler);
});

// Report inappropriate message
router.post('/messages/:messageId/report', async (req: Request, res: Response) => {
    try {
        const { messageId } = req.params;
        const { reason } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        await securityAudit.reportMessage(messageId, userId, reason);
        res.status(204).send();
    }
    catch (error) {
        console.error('Error reporting message:', error);
        res.status(500).json({ error: 'Failed to report message' });
    }
});

export default router;
