import { Router, Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
// Types for better type safety
interface ChatMessage {
    content: string;
    userId: string;
    timestamp: Date;
    roomId: string;
}
interface ChatRoom {
    id: string;
    name: string;
    createdAt: Date;
}
// Initialize Supabase client
const supabase: SupabaseClient<Database> = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');
const router = Router();
// Create a new chat room
router.post('/rooms', async (req: Request, res: Response) => {
    try {
        const { name } = req.body;
        const { data, error } = await supabase
            .from('chat_rooms')
            .insert([{ name, created_at: new Date() }])
            .select();
        if (error) {
            throw error;
        }
        res.status(201).json(data[0]);
    }
    catch (error) {
        console.error('Error creating chat room:', error);
        res.status(500).json({ error: 'Failed to create chat room' });
    }
});
// Get all chat rooms
router.get('/rooms', async (_req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('chat_rooms')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            throw error;
        }
        res.json(data);
    }
    catch (error) {
        console.error('Error fetching chat rooms:', error);
        res.status(500).json({ error: 'Failed to fetch chat rooms' });
    }
});
// Send a message in a chat room
router.post('/rooms/:roomId/messages', async (req: Request, res: Response) => {
    try {
        const { roomId } = req.params;
        const { content, userId } = req.body;
        const { data, error } = await supabase
            .from('chat_messages')
            .insert([{
                content,
                user_id: userId,
                room_id: roomId,
                timestamp: new Date()
            }])
            .select();
        if (error) {
            throw error;
        }
        res.status(201).json(data[0]);
    }
    catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});
// Get messages from a chat room
router.get('/rooms/:roomId/messages', async (req: Request, res: Response) => {
    try {
        const { roomId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        const { data, error } = await supabase
            .from('chat_messages')
            .select(`
        *,
        profiles:user_id (
          username,
          avatar_url
        )
      `)
            .eq('room_id', roomId)
            .order('timestamp', { ascending: false })
            .range(Number(offset), Number(offset) + Number(limit) - 1);
        if (error) {
            throw error;
        }
        res.json(data);
    }
    catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});
// Delete a message
router.delete('/messages/:messageId', async (req: Request, res: Response) => {
    try {
        const { messageId } = req.params;
        const { userId } = req.body; // For authorization
        const { error } = await supabase
            .from('chat_messages')
            .delete()
            .match({ id: messageId, user_id: userId });
        if (error) {
            throw error;
        }
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});
export default router;

export interface Database {
    public: { Tables: { [key: string]: any } };
}
