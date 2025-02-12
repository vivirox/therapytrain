import { Session, SessionMode, SessionState, SessionMetrics } from '../types/session';
import { RedisService } from './RedisService';
import { EncryptionService } from '../services/encryption';
import { ZKService } from '../services/zkservice';
import { MonitoringService } from './MonitoringService';

export interface SessionBranch {
    id: string;
    sessionId: string;
    condition: string;
    nextAction: string;
    probability: number;
    triggered: boolean;
}

class SessionManager {
    private static instance: SessionManager;
    private currentSession: SessionState | null = null;
    private branches: Map<string, SessionBranch[]> = new Map();
    private redisService: RedisService;
    private encryptionService: EncryptionService;
    private zkService: ZKService;
    private monitoringService: MonitoringService;

    private constructor() {
        this.redisService = RedisService.getInstance();
        this.encryptionService = EncryptionService.getInstance();
        this.zkService = ZKService.getInstance();
        this.monitoringService = MonitoringService.getInstance();
    }

    public static getInstance(): SessionManager {
        if (!SessionManager.instance) {
            SessionManager.instance = new SessionManager();
        }
        return SessionManager.instance;
    }

    public async startSession(clientId: string, mode: SessionMode): Promise<SessionState> {
        const sessionId = crypto.randomUUID();
        const session = {
            id: sessionId,
            clientId,
            mode,
            status: 'active',
            currentBranch: null,
            startTime: new Date(),
            metrics: {
                sentiment: 0,
                engagement: 0,
                riskLevel: 0,
                interventionSuccess: 0,
            },
        };

        // Store in Redis with pattern for grouped invalidation
        await this.redisService.set(`session:${sessionId}`, session, undefined, 'active-sessions');
        this.currentSession = session;

        return session;
    }

    public async getSession(sessionId: string): Promise<SessionState | null> {
        // Try Redis first with monitoring
        const cachedSession = await this.redisService.get<SessionState>(`session:${sessionId}`);
        
        if (cachedSession) {
            // Check session performance
            const stats = this.monitoringService.getPerformanceStats();
            if (stats.recommendations.length > 0) {
                console.log('Cache performance recommendations:', stats.recommendations);
            }
            return cachedSession;
        }

        // If not in Redis, check current session
        if (this.currentSession && this.currentSession.id === sessionId) {
            // Update Redis cache with pattern
            await this.redisService.set(
                `session:${sessionId}`,
                this.currentSession,
                undefined,
                'active-sessions'
            );
            return this.currentSession;
        }

        return null;
    }

    public async updateSession(sessionId: string, updates: Partial<SessionState>): Promise<SessionState | null> {
        const session = await this.getSession(sessionId);
        if (!session) return null;

        const updatedSession = {
            ...session,
            ...updates,
        };

        // Update Redis with pattern and monitor performance
        await this.redisService.set(
            `session:${sessionId}`,
            updatedSession,
            undefined,
            'active-sessions'
        );
        
        if (this.currentSession?.id === sessionId) {
            this.currentSession = updatedSession;
        }

        return updatedSession;
    }

    public async endSession(): Promise<void> {
        if (this.currentSession) {
            const endedSession = {
                ...this.currentSession,
                endTime: new Date(),
                status: 'completed',
            };

            // Move to completed sessions pattern and clear from active
            await this.redisService.set(
                `session:${endedSession.id}`,
                endedSession,
                undefined,
                'completed-sessions'
            );
            await this.redisService.invalidateByPattern('active-sessions');
            
            this.currentSession = null;
        }
    }

    public async cleanupInactiveSessions(timeoutMinutes: number = 60): Promise<void> {
        const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);
        
        // Get all active sessions from Redis
        const sessions = await this.redisService.hgetall<SessionState>('sessions');
        if (!sessions) return;

        // Find and update inactive sessions
        for (const [sessionId, session] of Object.entries(sessions)) {
            const lastActivity = session.startTime;
            if (lastActivity < cutoff) {
                const endedSession = {
                    ...session,
                    endTime: new Date(),
                    status: 'completed',
                };
                
                // Move to completed sessions pattern
                await this.redisService.set(
                    `session:${sessionId}`,
                    endedSession,
                    undefined,
                    'completed-sessions'
                );
            }
        }

        // Invalidate all completed sessions
        await this.redisService.invalidateByPattern('completed-sessions');

        // Clear current session if inactive
        if (this.currentSession && this.currentSession.startTime < cutoff) {
            this.currentSession = null;
        }
    }

    public async loadSessionBranches(sessionId: string): Promise<void> {
        const cachedBranches = await this.redisService.hget<SessionBranch[]>('branches', sessionId);
        if (cachedBranches) {
            this.branches.set(sessionId, cachedBranches);
            return;
        }

        // If not in cache, load from storage and cache with pattern
        const mockBranches: SessionBranch[] = [
            {
                id: 'branch1',
                condition: 'sentiment < 0.3',
                action: 'suggest_break',
                priority: 1,
                triggered: false,
            },
            // Add more mock branches as needed
        ];

        await this.redisService.hset('branches', sessionId, mockBranches);
        await this.redisService.set(
            `branches:${sessionId}`,
            mockBranches,
            undefined,
            'session-branches'
        );
        this.branches.set(sessionId, mockBranches);
    }

    public async evaluateBranches(metrics: {
        sentiment: number;
        engagement: number;
        riskLevel: number;
    }): Promise<SessionBranch | null> {
        if (!this.currentSession) return null;

        const branches = this.branches.get(this.currentSession.id) || [];
        const eligibleBranches = branches
            .filter(branch => !branch.triggered && this.evaluateCondition(branch.condition, metrics))
            .sort((a, b) => b.priority - a.priority);

        return eligibleBranches[0] || null;
    }

    private evaluateCondition(condition: string, metrics: {
        sentiment: number;
        engagement: number;
        riskLevel: number;
    }): boolean {
        try {
            // Simple evaluation for demo purposes
            const { sentiment, engagement, riskLevel } = metrics;
            return eval(condition);
        } catch (error) {
            console.error('Error evaluating condition:', error);
            return false;
        }
    }

    public async triggerBranch(branch: SessionBranch): Promise<void> {
        if (!this.currentSession) return;

        const branches = this.branches.get(this.currentSession.id);
        if (branches) {
            const branchIndex = branches.findIndex(b => b.id === branch.id);
            if (branchIndex >= 0) {
                branches[branchIndex].triggered = true;
                await this.redisService.hset('branches', this.currentSession.id, branches);
                await this.redisService.set(
                    `branches:${this.currentSession.id}`,
                    branches,
                    undefined,
                    'session-branches'
                );
            }
        }
    }

    public async switchMode(newMode: SessionMode): Promise<void> {
        if (this.currentSession) {
            await this.updateSession(this.currentSession.id, { mode: newMode });
        }
    }

    public async updateMetrics(metrics: Partial<SessionState['metrics']>): Promise<void> {
        if (this.currentSession) {
            const updatedMetrics = {
                ...this.currentSession.metrics,
                ...metrics,
            };
            await this.updateSession(this.currentSession.id, { metrics: updatedMetrics });
        }
    }

    public getCurrentSession(): SessionState | null {
        return this.currentSession;
    }

    /**
     * Get session performance metrics
     */
    public getSessionMetrics(): any {
        return this.monitoringService.getPerformanceStats();
    }
}

export default SessionManager;
