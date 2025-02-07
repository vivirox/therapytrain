import { supabase } from "../../../config/database";
import { Message, Session, MessageType, SessionStatus } from "../../types/chat";
export class ChatService {
    async createSession(userId: string, title: string): Promise<Session> {
        const { data, error } = await supabase
            .from('sessions')
            .insert({
            user_id: userId,
            status: 'active',
            payload: {
                title,
                participants: [userId],
                settings: {
                    model: 'gpt-4',
                    temperature: 0.7,
                    maxTokens: 1000
                }
            },
            metadata: {
                messageCount: 0,
                lastActivity: new Date().toISOString(),
                duration: 0
            }
        })
            .select()
            .single();
        if (error)
            throw error;
        return data as Session;
    }
    async getSession(sessionId: string): Promise<Session | null> {
        const { data, error } = await supabase
            .from('sessions')
            .select()
            .eq('id', sessionId)
            .single();
        if (error)
            throw error;
        return data as Session;
    }
    async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session> {
        const { data, error } = await supabase
            .from('sessions')
            .update({
            status: updates.status,
            payload: updates.payload,
            metadata: updates.metadata
        })
            .eq('id', sessionId)
            .select()
            .single();
        if (error)
            throw error;
        return data as Session;
    }
    async getUserSessions(userId: string): Promise<Session[]> {
        const { data, error } = await supabase
            .from('sessions')
            .select()
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return data as Session[];
    }
    async addMessage(sessionId: string, userId: string, type: MessageType, content: string, metadata: any = {}): Promise<Message> {
        // Start a transaction
        const { data: message, error: messageError } = await supabase
            .from('messages')
            .insert({
            session_id: sessionId,
            user_id: userId,
            type,
            payload: {
                content,
                role: type === 'ai' ? 'assistant' : 'user',
                timestamp: new Date().toISOString()
            },
            metadata
        })
            .select()
            .single();
        if (messageError)
            throw messageError;
        // Update session metadata
        const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .update({
            metadata: {
                messageCount: supabase.raw('(metadata->\'messageCount\')::int + 1'),
                lastActivity: new Date().toISOString()
            }
        })
            .eq('id', sessionId)
            .select()
            .single();
        if (sessionError)
            throw sessionError;
        return message as Message;
    }
    async getMessages(sessionId: string, limit: number = 50, before?: string): Promise<Message[]> {
        let query = supabase
            .from('messages')
            .select()
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (before) {
            query = query.lt('created_at', before);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        return data as Message[];
    }
    async updateSessionStatus(sessionId: string, status: SessionStatus): Promise<void> {
        const { error } = await supabase
            .from('sessions')
            .update({
            status,
            metadata: {
                lastActivity: new Date().toISOString()
            }
        })
            .eq('id', sessionId);
        if (error)
            throw error;
    }
    async deleteSession(sessionId: string): Promise<void> {
        // Delete all messages first
        const { error: messagesError } = await supabase
            .from('messages')
            .delete()
            .eq('session_id', sessionId);
        if (messagesError)
            throw messagesError;
        // Then delete the session
        const { error: sessionError } = await supabase
            .from('sessions')
            .delete()
            .eq('id', sessionId);
        if (sessionError)
            throw sessionError;
    }
    async getSessionStats(sessionId: string) {
        const { data, error } = await supabase
            .from('messages')
            .select('type, created_at, metadata')
            .eq('session_id', sessionId);
        if (error)
            throw error;
        const messages = data as Message[];
        const totalMessages = messages.length;
        const aiMessages = messages.filter(m => m.type === 'ai').length;
        const userMessages = messages.filter(m => m.type === 'text').length;
        const totalTokens = messages.reduce((sum, m) => sum + (m.metadata?.tokens || 0), 0);
        return {
            totalMessages,
            aiMessages,
            userMessages,
            totalTokens,
            averageResponseTime: messages
                .filter(m => m.metadata?.processingTime)
                .reduce((sum, m) => sum + (m.metadata?.processingTime || 0), 0) /
                aiMessages
        };
    }
}
