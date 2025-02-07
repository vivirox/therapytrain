import { Router, Request, Response } from 'express';
import { ChatService } from "../services/chat/ChatService";
import { ChatStreamService } from "../services/chat/ChatStreamService";
import { SecurityAuditService } from "../services/SecurityAuditService";
import { Session, Message } from "../types/chat";
const router = Router();
const chatService = new ChatService();
const chatStreamService = new ChatStreamService();
const securityAudit = new SecurityAuditService();
// Create new chat session
router.post('/sessions', async (req: Request, res: Response) => {
    try {
        const { title } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const session = await chatService.createSession(userId, title);
        res.json(session);
    }
    catch (error) {
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
// Get chat messages
router.get('/sessions/:sessionId/messages', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const { limit, before } = req.query;
        const messages = await chatService.getMessages(sessionId, Number(limit) || 50, before as string);
        res.json(messages);
    }
    catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});
// Send message
router.post('/sessions/:sessionId/messages', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const { content, type } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const message = await chatService.addMessage(sessionId, userId, type, content);
        res.json(message);
    }
    catch (error) {
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
// SSE endpoint for real-time updates
router.get('/sessions/:sessionId/stream', (req: Request, res: Response) => {
    chatStreamService.handleSSE(req, res);
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
