import { supabase } from "../../../config/database";
export interface Session {
    id: string;
    userId: string;
    status: 'active' | 'paused' | 'completed' | 'cancelled';
    startTime: Date;
    endTime?: Date;
    metadata?: {
        messageCount: number;
        lastActivity: Date;
        duration: number;
    };
}
export class SessionManager {
    private activeSessions: Map<string, Session> = new Map();
    async createSession(userId: string): Promise<Session> {
        try {
            const { data, error } = await supabase
                .from('sessions')
                .insert({
                user_id: userId,
                status: 'active',
                start_time: new Date().toISOString(),
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
            const session: Session = {
                id: data.id,
                userId: data.user_id,
                status: data.status,
                startTime: new Date(data.start_time),
                metadata: data.metadata
            };
            this.activeSessions.set(session.id, session);
            return session;
        }
        catch (error) {
            console.error('Error creating session:', error);
            throw error;
        }
    }
    async getSession(sessionId: string): Promise<Session | null> {
        // Check cache first
        if (this.activeSessions.has(sessionId)) {
            return this.activeSessions.get(sessionId)!;
        }
        // If not in cache, check database
        try {
            const { data, error } = await supabase
                .from('sessions')
                .select('*')
                .eq('id', sessionId)
                .single();
            if (error)
                throw error;
            if (!data)
                return null;
            const session: Session = {
                id: data.id,
                userId: data.user_id,
                status: data.status,
                startTime: new Date(data.start_time),
                endTime: data.end_time ? new Date(data.end_time) : undefined,
                metadata: data.metadata
            };
            // Cache active sessions
            if (session.status === 'active') {
                this.activeSessions.set(session.id, session);
            }
            return session;
        }
        catch (error) {
            console.error('Error getting session:', error);
            return null;
        }
    }
    async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | null> {
        try {
            const { data, error } = await supabase
                .from('sessions')
                .update({
                status: updates.status,
                end_time: updates.endTime?.toISOString(),
                metadata: updates.metadata
            })
                .eq('id', sessionId)
                .select()
                .single();
            if (error)
                throw error;
            if (!data)
                return null;
            const session: Session = {
                id: data.id,
                userId: data.user_id,
                status: data.status,
                startTime: new Date(data.start_time),
                endTime: data.end_time ? new Date(data.end_time) : undefined,
                metadata: data.metadata
            };
            // Update cache if session is active
            if (session.status === 'active') {
                this.activeSessions.set(session.id, session);
            }
            else {
                this.activeSessions.delete(session.id);
            }
            return session;
        }
        catch (error) {
            console.error('Error updating session:', error);
            return null;
        }
    }
    async endSession(sessionId: string): Promise<void> {
        try {
            const session = await this.getSession(sessionId);
            if (!session)
                throw new Error('Session not found');
            const endTime = new Date();
            const duration = endTime.getTime() - session.startTime.getTime();
            await this.updateSession(sessionId, {
                status: 'completed',
                endTime,
                metadata: {
                    ...session.metadata,
                    duration,
                    lastActivity: endTime
                }
            });
            this.activeSessions.delete(sessionId);
        }
        catch (error) {
            console.error('Error ending session:', error);
            throw error;
        }
    }
    async pauseSession(sessionId: string): Promise<void> {
        try {
            const session = await this.getSession(sessionId);
            if (!session)
                throw new Error('Session not found');
            await this.updateSession(sessionId, {
                status: 'paused',
                metadata: {
                    ...session.metadata,
                    lastActivity: new Date()
                }
            });
        }
        catch (error) {
            console.error('Error pausing session:', error);
            throw error;
        }
    }
    async resumeSession(sessionId: string): Promise<void> {
        try {
            const session = await this.getSession(sessionId);
            if (!session)
                throw new Error('Session not found');
            await this.updateSession(sessionId, {
                status: 'active',
                metadata: {
                    ...session.metadata,
                    lastActivity: new Date()
                }
            });
        }
        catch (error) {
            console.error('Error resuming session:', error);
            throw error;
        }
    }
    async incrementMessageCount(sessionId: string): Promise<void> {
        try {
            const session = await this.getSession(sessionId);
            if (!session)
                throw new Error('Session not found');
            await this.updateSession(sessionId, {
                metadata: {
                    ...session.metadata,
                    messageCount: (session.metadata?.messageCount || 0) + 1,
                    lastActivity: new Date()
                }
            });
        }
        catch (error) {
            console.error('Error incrementing message count:', error);
            throw error;
        }
    }
    getActiveSessions(): Session[] {
        return Array.from(this.activeSessions.values());
    }
    async cleanupInactiveSessions(timeoutMinutes: number = 60): Promise<void> {
        const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);
        try {
            const { data, error } = await supabase
                .from('sessions')
                .update({
                status: 'completed',
                end_time: new Date().toISOString()
            })
                .eq('status', 'active')
                .lt('metadata->lastActivity', cutoff.toISOString())
                .select();
            if (error)
                throw error;
            // Clear from cache
            if (data) {
                data.forEach(session, unknown => this.activeSessions.delete(session.id));
            }
        }
        catch (error) {
            console.error('Error cleaning up inactive sessions:', error);
            throw error;
        }
    }
}
