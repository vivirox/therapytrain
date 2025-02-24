import { Redis } from 'ioredis';
import { EventEmitter } from 'events';
import { Session, SessionState, SessionMode } from '../types/session';
import { RedisService } from './RedisService';
import { MonitoringService } from './MonitoringService';
import { ZKService } from './zkservice';
import { cacheConfig } from '../config/cache.config';

interface SessionLock {
    nodeId: string;
    timestamp: number;
    ttl: number;
}

export class DistributedSessionManager extends EventEmitter {
    private static instance: DistributedSessionManager;
    private redisService: RedisService;
    private monitoringService: MonitoringService;
    private zkService: ZKService;
    private nodeId: string;
    private subscriber: Redis;
    private publisher: Redis;
    private activeSessions: Map<string, SessionState> = new Map();
    private lockAttempts: Map<string, number> = new Map();

    private constructor() {
        super();
        this.redisService = RedisService.getInstance();
        this.monitoringService = MonitoringService.getInstance();
        this.zkService = ZKService.getInstance();
        this.nodeId = crypto.randomUUID();
        
        // Create separate Redis connections for pub/sub
        this.subscriber = new Redis(process.env.REDIS_URL || '', {
            ...cacheConfig.redis.connection,
            tls: { rejectUnauthorized: false }
        });
        this.publisher = new Redis(process.env.REDIS_URL || '', {
            ...cacheConfig.redis.connection,
            tls: { rejectUnauthorized: false }
        });

        this.setupSubscriptions();
        this.startHeartbeat();
    }

    public static getInstance(): DistributedSessionManager {
        if (!DistributedSessionManager.instance) {
            DistributedSessionManager.instance = new DistributedSessionManager();
        }
        return DistributedSessionManager.instance;
    }

    private setupSubscriptions(): void {
        // Subscribe to session events
        this.subscriber.subscribe('session:events');
        
        this.subscriber.on('message', async (channel, message) => {
            try {
                const event = JSON.parse(message);
                switch (event.type) {
                    case 'session:update':
                        await this.handleSessionUpdate(event.sessionId, event.data);
                        break;
                    case 'session:end':
                        await this.handleSessionEnd(event.sessionId);
                        break;
                    case 'node:heartbeat':
                        await this.handleNodeHeartbeat(event.nodeId);
                        break;
                }
            } catch (error) {
                console.error('Error handling pub/sub message:', error);
            }
        });
    }

    private startHeartbeat(): void {
        setInterval(async () => {
            try {
                await this.publisher.publish('session:events', JSON.stringify({
                    type: 'node:heartbeat',
                    nodeId: this.nodeId,
                    timestamp: Date.now()
                }));

                // Update node status in Redis
                await this.redisService.set(
                    `node:${this.nodeId}`,
                    { lastHeartbeat: Date.now() },
                    30 // 30 seconds TTL
                );
            } catch (error) {
                console.error('Error sending heartbeat:', error);
            }
        }, 10000); // Every 10 seconds
    }

    private async acquireLock(sessionId: string, ttl: number = 10): Promise<boolean> {
        const lockKey = `lock:session:${sessionId}`;
        const attempts = this.lockAttempts.get(sessionId) || 0;

        if (attempts >= 3) {
            console.warn(`Max lock attempts reached for session ${sessionId}`);
            this.lockAttempts.delete(sessionId);
            return false;
        }

        try {
            const lock: SessionLock = {
                nodeId: this.nodeId,
                timestamp: Date.now(),
                ttl
            };

            const acquired = await this.redisService.set(
                lockKey,
                lock,
                ttl,
                'session-locks'
            );

            if (acquired) {
                this.lockAttempts.delete(sessionId);
                return true;
            }

            this.lockAttempts.set(sessionId, attempts + 1);
            await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
            return this.acquireLock(sessionId, ttl);
        } catch (error) {
            console.error('Error acquiring lock:', error);
            return false;
        }
    }

    private async releaseLock(sessionId: string): Promise<void> {
        const lockKey = `lock:session:${sessionId}`;
        try {
            const lock = await this.redisService.get<SessionLock>(lockKey);
            if (lock?.nodeId === this.nodeId) {
                await this.redisService.del(lockKey);
            }
        } catch (error) {
            console.error('Error releasing lock:', error);
        }
    }

    public async startSession(clientId: string, mode: SessionMode): Promise<SessionState> {
        const sessionId = crypto.randomUUID();
        const session: SessionState = {
            id: sessionId,
            clientId,
            mode,
            status: 'active',
            startTime: new Date(),
            metrics: {
                sentiment: 0,
                engagement: 0,
                riskLevel: 0,
                interventionSuccess: 0,
            },
        };

        if (await this.acquireLock(sessionId)) {
            try {
                // Store in Redis and local cache
                await this.redisService.set(
                    `session:${sessionId}`,
                    session,
                    undefined,
                    'active-sessions'
                );
                this.activeSessions.set(sessionId, session);

                // Notify other nodes
                await this.publisher.publish('session:events', JSON.stringify({
                    type: 'session:update',
                    sessionId,
                    data: session
                }));

                return session;
            } finally {
                await this.releaseLock(sessionId);
            }
        }
        throw new Error('Failed to acquire session lock');
    }

    public async getSession(sessionId: string): Promise<SessionState | null> {
        // Check local cache first
        const localSession = this.activeSessions.get(sessionId);
        if (localSession) {
            return localSession;
        }

        // Try Redis
        const cachedSession = await this.redisService.get<SessionState>(`session:${sessionId}`);
        if (cachedSession) {
            this.activeSessions.set(sessionId, cachedSession);
            return cachedSession;
        }

        return null;
    }

    public async updateSession(sessionId: string, updates: Partial<SessionState>): Promise<SessionState | null> {
        if (await this.acquireLock(sessionId)) {
            try {
                const session = await this.getSession(sessionId);
                if (!session) return null;

                const updatedSession = {
                    ...session,
                    ...updates,
                };

                // Update Redis and local cache
                await this.redisService.set(
                    `session:${sessionId}`,
                    updatedSession,
                    undefined,
                    'active-sessions'
                );
                this.activeSessions.set(sessionId, updatedSession);

                // Notify other nodes
                await this.publisher.publish('session:events', JSON.stringify({
                    type: 'session:update',
                    sessionId,
                    data: updatedSession
                }));

                return updatedSession;
            } finally {
                await this.releaseLock(sessionId);
            }
        }
        throw new Error('Failed to acquire session lock');
    }

    public async endSession(sessionId: string): Promise<void> {
        if (await this.acquireLock(sessionId)) {
            try {
                const session = await this.getSession(sessionId);
                if (!session) return;

                const endedSession = {
                    ...session,
                    endTime: new Date(),
                    status: 'completed',
                };

                // Move to completed sessions
                await this.redisService.set(
                    `session:${sessionId}`,
                    endedSession,
                    undefined,
                    'completed-sessions'
                );

                // Remove from active sessions
                this.activeSessions.delete(sessionId);
                await this.redisService.invalidateByPattern('active-sessions');

                // Notify other nodes
                await this.publisher.publish('session:events', JSON.stringify({
                    type: 'session:end',
                    sessionId
                }));
            } finally {
                await this.releaseLock(sessionId);
            }
        } else {
            throw new Error('Failed to acquire session lock');
        }
    }

    private async handleSessionUpdate(sessionId: string, data: SessionState): Promise<void> {
        if (data.id !== sessionId) return;
        this.activeSessions.set(sessionId, data);
    }

    private async handleSessionEnd(sessionId: string): Promise<void> {
        this.activeSessions.delete(sessionId);
    }

    private async handleNodeHeartbeat(nodeId: string): Promise<void> {
        if (nodeId === this.nodeId) return;
        
        // Update node's last seen timestamp
        await this.redisService.set(
            `node:${nodeId}`,
            { lastHeartbeat: Date.now() },
            30 // 30 seconds TTL
        );
    }

    public async cleanupInactiveSessions(timeoutMinutes: number = 60): Promise<void> {
        const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);
        
        // Get all active sessions from Redis
        const sessions = await this.redisService.mget<SessionState>(
            Array.from(this.activeSessions.keys()).map(id => `session:${id}`)
        );

        for (const session of sessions) {
            if (!session) continue;
            
            const lastActivity = session.startTime;
            if (new Date(lastActivity) < cutoff) {
                await this.endSession(session.id);
            }
        }
    }

    public async getActiveNodes(): Promise<string[]> {
        const nodes = await this.redisService.keys('node:*');
        return nodes.map(key => key.replace('node:', ''));
    }

    public async shutdown(): Promise<void> {
        // Clean up subscriptions
        await this.subscriber.quit();
        await this.publisher.quit();

        // Remove node from active nodes
        await this.redisService.del(`node:${this.nodeId}`);
    }
} 