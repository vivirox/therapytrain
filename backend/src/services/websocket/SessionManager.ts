import { supabase } from "@/../../config/database";
import { SecurityAuditService } from '@/SecurityAuditService';

export interface Session {
    id: string;
    userId: string;
    status: 'active' | 'paused' | 'completed';
    startTime: Date;
    endTime?: Date;
    metadata?: {
        messageCount: number;
        lastActivity: Date;
        duration: number;
    };
    clients: Set<string>;
    data: Record<string, any>;
}

export class SessionManager {
    private readonly activeSessions: Map<string, Session> = new Map();

    constructor(private readonly securityAuditService: SecurityAuditService) {}

    async addClient(sessionId: string, clientId: string): Promise<void> {
        let session = this.activeSessions.get(sessionId);

        if (!session) {
            session = {
                id: sessionId,
                clients: new Set(),
                data: {}
            };
            this.activeSessions.set(sessionId, session);
        }

        session.clients.add(clientId);

        await this.securityAuditService.recordEvent('SESSION_JOIN', {
            sessionId,
            clientId
        });
    }

    async removeClient(sessionId: string, clientId: string): Promise<void> {
        const session = this.activeSessions.get(sessionId);
        if (!session) return;

        session.clients.delete(clientId);

        if (session.clients.size === 0) {
            this.activeSessions.delete(sessionId);
        }

        await this.securityAuditService.recordEvent('SESSION_LEAVE', {
            sessionId,
            clientId
        });
    }

    async handleMessage(sessionId: string, clientId: string, message: any): Promise<void> {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        await this.securityAuditService.recordEvent('SESSION_MESSAGE', {
            sessionId,
            clientId,
            messageType: message.type
        });

        // Handle message based on type
        switch (message.type) {
            case 'update_data':
                session.data = {
                    ...session.data,
                    ...message.data
                };
                break;

            case 'clear_data':
                session.data = {};
                break;

            default:
                // Other message types can be handled here
                break;
        }
    }

    getSession(sessionId: string): Session | undefined {
        return this.activeSessions.get(sessionId);
    }

    getActiveSessions(): Session[] {
        return Array.from(this.activeSessions.values());
    }

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
                clients: new Set(),
                data: {}
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
                clients: new Set(),
                data: {}
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
                clients: new Set(),
                data: {}
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

            if (error) throw error;

            // Clear from cache
            if (data) {
                data.forEach((session: Session) => {
                    this.activeSessions.delete(session.id);
                });
            }
        } catch (error) {
            console.error('Error cleaning up inactive sessions:', error);
            throw error;
        }
    }
}
