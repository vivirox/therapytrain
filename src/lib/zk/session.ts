import { ZKService } from './ZKService';
import { ForwardSecrecyService } from './ForwardSecrecyService';
import { SecurityAuditService } from '@/services/SecurityAuditService';
import { SupabaseClient } from '@supabase/supabase-js';

interface SessionContext {
  threadId: string;
  userId: string;
  sessionId: string;
  keyId: string;
  publicKey: string;
  privateKey: string;
  status: 'active' | 'expired';
  createdAt: Date;
  expiresAt: Date;
}

export class SessionManager {
  private static instance: SessionManager;
  private zkService: ZKService;
  private forwardSecrecy: ForwardSecrecyService;
  private securityAudit: SecurityAuditService;
  private sessions: Map<string, SessionContext> = new Map();

  private constructor(supabaseClient?: SupabaseClient) {
    this.zkService = ZKService.getInstance(supabaseClient);
    this.forwardSecrecy = ForwardSecrecyService.getInstance(supabaseClient);
    this.securityAudit = new SecurityAuditService();
  }

  public static getInstance(supabaseClient?: SupabaseClient): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager(supabaseClient);
    }
    return SessionManager.instance;
  }

  public async createSession(threadId: string, userId: string): Promise<SessionContext> {
    try {
      // Get or create session keys
      const keys = await this.zkService.getOrCreateSessionKeys(threadId);

      // Initialize forward secrecy for the session
      const sharedSecret = Buffer.from(keys.privateKey, 'hex');
      await this.forwardSecrecy.initializeRatchet(threadId, sharedSecret, true);

      // Create session context
      const context: SessionContext = {
        threadId,
        userId,
        sessionId: keys.id,
        keyId: keys.id,
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
        status: 'active',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };

      // Store session
      this.sessions.set(threadId, context);

      // Log session creation
      await this.securityAudit.logEvent({
        type: 'session_created',
        threadId,
        userId,
        metadata: {
          sessionId: context.sessionId,
          expiresAt: context.expiresAt.toISOString()
        }
      });

      return context;
    } catch (error) {
      await this.securityAudit.logError({
        operation: 'create_session',
        error,
        threadId,
        userId
      });
      throw error;
    }
  }

  public async getSession(threadId: string): Promise<SessionContext | null> {
    const session = this.sessions.get(threadId);
    if (!session) return null;

    // Check if session has expired
    if (session.expiresAt <= new Date()) {
      await this.invalidateSession(threadId);
      return null;
    }

    return session;
  }

  public async invalidateSession(threadId: string): Promise<void> {
    const session = this.sessions.get(threadId);
    if (!session) return;

    try {
      // Update session status
      session.status = 'expired';
      this.sessions.delete(threadId);

      // Log session invalidation
      await this.securityAudit.logEvent({
        type: 'session_invalidated',
        threadId,
        userId: session.userId,
        metadata: {
          sessionId: session.sessionId,
          reason: 'manual_invalidation'
        }
      });
    } catch (error) {
      await this.securityAudit.logError({
        operation: 'invalidate_session',
        error,
        threadId,
        userId: session.userId
      });
      throw error;
    }
  }

  public async refreshSession(threadId: string): Promise<SessionContext> {
    const session = await this.getSession(threadId);
    if (!session) {
      throw new Error('Session not found');
    }

    try {
      // Get new session keys
      const keys = await this.zkService.getOrCreateSessionKeys(threadId);

      // Update session context
      const updatedContext: SessionContext = {
        ...session,
        keyId: keys.id,
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };

      // Store updated session
      this.sessions.set(threadId, updatedContext);

      // Log session refresh
      await this.securityAudit.logEvent({
        type: 'session_refreshed',
        threadId,
        userId: session.userId,
        metadata: {
          oldSessionId: session.sessionId,
          newSessionId: keys.id,
          expiresAt: updatedContext.expiresAt.toISOString()
        }
      });

      return updatedContext;
    } catch (error) {
      await this.securityAudit.logError({
        operation: 'refresh_session',
        error,
        threadId,
        userId: session.userId
      });
      throw error;
    }
  }
}

export const sessionManager = SessionManager.getInstance();

export const getSession = async (threadId: string) => {
  return sessionManager.getSession(threadId);
};

export const getOrCreateSharedKey = async (threadId: string) => {
  const session = await sessionManager.getSession(threadId);
  if (!session) {
    throw new Error('Session not found');
  }
  return session.privateKey;
};