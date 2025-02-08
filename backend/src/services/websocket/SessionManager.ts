import { supabase } from "../../config/database";
import { SecurityAuditService } from '../SecurityAuditService';
import { Session, SessionStatus } from "../../types/session";

export class SessionManager {
    private readonly sessions: Map<string, Session> = new Map();
    private readonly securityAuditService: SecurityAuditService;

    constructor(securityAuditService: SecurityAuditService) {
        this.securityAuditService = securityAuditService;
    }

    async createSession(userId: string): Promise<Session> {
        const sessionId = crypto.randomBytes(16).toString('hex');
        const session: Session = {
            id: sessionId,
            userId,
            clients: new Set<string>(),
            status: SessionStatus.ACTIVE,
            startTime: new Date(),
            data: {}
        };
        this.sessions.set(sessionId, session);
        return session;
    }

    getSession(sessionId: string): Session | undefined {
        return this.sessions.get(sessionId);
    }

    async loadSession(sessionId: string): Promise<Session | null> {
        try {
            const { data: sessionData, error } = await supabase
                .from('sessions')
                .select('*')
                .eq('id', sessionId)
                .single();

            if (error || !sessionData) {
                return null;
            }

            const session: Session = {
                id: sessionData.id,
                userId: sessionData.userId,
                clients: new Set<string>(),
                status: sessionData.status,
                startTime: new Date(sessionData.startTime),
                data: sessionData.data || {}
            };

            this.sessions.set(sessionId, session);
            return session;
        } catch (error) {
            await this.securityAuditService.recordAlert('SESSION_LOAD_ERROR', 'HIGH', {
                error: error instanceof Error ? error.message : 'Unknown error',
                sessionId
            });
            return null;
        }
    }

    async addClient(sessionId: string, clientId: string): Promise<void> {
        let session = this.sessions.get(sessionId);

        if (!session) {
            session = {
                id: sessionId,
                clients: new Set(),
                data: {}
            };
            this.sessions.set(sessionId, session);
        }

        session.clients.add(clientId);

        await this.securityAuditService.recordEvent('SESSION_JOIN', {
            sessionId,
            clientId
        });
    }

    async removeClient(sessionId: string, clientId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        session.clients.delete(clientId);

        if (session.clients.size === 0) {
            this.sessions.delete(sessionId);
        }

        await this.securityAuditService.recordEvent('SESSION_LEAVE', {
            sessionId,
            clientId
        });
    }

    async handleMessage(sessionId: string, clientId: string, message: any): Promise<void> {
        const session = this.sessions.get(sessionId);
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

    getActiveSessions(): Session[] {
        return Array.from(this.sessions.values());
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
                this.sessions.set(session.id, session);
            }
            else {
                this.sessions.delete(session.id);
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
            this.sessions.delete(sessionId);
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
                    this.sessions.delete(session.id);
                });
            }
        } catch (error) {
            console.error('Error cleaning up inactive sessions:', error);
            throw error;
        }
    }
}
