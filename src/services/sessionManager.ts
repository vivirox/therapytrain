import { supabase } from '../integrations/supabase/client';
import EncryptionService from './encryption';
import ZKService from './zkService';

export type SessionMode = 'text' | 'video' | 'hybrid';

export interface SessionBranch {
  id: string;
  sessionId: string;
  condition: string;
  nextAction: string;
  probability: number;
  triggered: boolean;
}

export interface SessionState {
  id: string;
  clientId: string;
  mode: SessionMode;
  currentBranch: string | null;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'paused';
  metrics: {
    sentiment: number;
    engagement: number;
    progress: number;
  };
}

class SessionManager {
  private static instance: SessionManager;
  private currentSession: SessionState | null = null;
  private branches: Map<string, Array<SessionBranch>> = new Map();
  private encryptionService: EncryptionService;
  private zkService: ZKService;

  private constructor() {
    this.encryptionService = EncryptionService.getInstance();
    this.zkService = ZKService.getInstance();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  async startSession(clientId: string, mode: SessionMode): Promise<SessionState> {
    const sessionId = crypto.randomUUID();
    const encryptionKey = this.encryptionService.generateSessionKey(sessionId);
    const encryptedClientId = this.encryptionService.encryptSessionData(sessionId, clientId);
    const clientDataHash = await this.encryptionService.hashData(clientId);
    const metricsHash = await this.encryptionService.hashData('{}');

    const initialProof = await this.zkService.generateSessionProof({
      sessionId,
      timestamp: Date.now(),
      durationMinutes: 0,
      clientDataHash,
      metricsHash,
      therapistId: 'therapist-id',
      metrics: undefined
    });

    const { data, error } = await supabase
      .from('therapy_sessions')
      .insert([{
        id: sessionId,
        client_id: encryptedClientId,
        mode,
        start_time: new Date().toISOString(),
        status: 'active',
        integrity_proof: initialProof
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to start session: ${error.message}`);
    }

    this.currentSession = {
      id: sessionId,
      clientId,
      mode,
      currentBranch: null,
      startTime: new Date(data.start_time),
      status: 'active',
      metrics: {
        sentiment: 0,
        engagement: 0,
        progress: 0
      }
    };

    await this.loadSessionBranches(sessionId);
    return this.currentSession;
  }

  private async loadSessionBranches(sessionId: string): Promise<void> {
    const { data, error } = await supabase
      .from('session_branches')
      .select('*')
      .eq('session_id', sessionId);

    if (error) {
      throw new Error(`Failed to load branches: ${error.message}`);
    }

    // Decrypt branch data
    const decryptedBranches = data.map(branch => ({
      ...branch,
      nextAction: this.encryptionService.decryptSessionData(sessionId, branch.nextAction)
    }));

    this.branches.set(sessionId, decryptedBranches);
  }

  async evaluateBranches(metrics: { sentiment: number; engagement: number }): Promise<SessionBranch | null> {
    if (!this.currentSession) {
      return null;
    }

    const sessionBranches = this.branches.get(this.currentSession.id) || [];
    for (const branch of sessionBranches) {
      if (branch.triggered) {
        continue;
      }

      // Evaluate branch conditions
      const shouldTrigger = this.evaluateCondition(branch.condition, metrics);
      if (shouldTrigger) {
        await this.triggerBranch(branch);
        return branch;
      }
    }
    return null;
  }

  private evaluateCondition(condition: string, metrics: { sentiment: number; engagement: number }): boolean {
    // Simple condition evaluation
    // Format: "sentiment < -0.5" or "engagement > 0.8"
    const [metric, operator, value] = condition.split(' ');
    const metricValue = metrics[metric as keyof typeof metrics];
    const threshold = parseFloat(value);

    switch (operator) {
      case '<': return metricValue < threshold;
      case '>': return metricValue > threshold;
      case '<=': return metricValue <= threshold;
      case '>=': return metricValue >= threshold;
      case '==': return metricValue === threshold;
      default: return false;
    }
  }

  private async triggerBranch(branch: SessionBranch): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    await supabase
      .from('session_branches')
      .update({ triggered: true })
      .eq('id', branch.id);

    this.currentSession.currentBranch = branch.id;
  }

  async switchMode(newMode: SessionMode): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    await supabase
      .from('therapy_sessions')
      .update({ mode: newMode })
      .eq('id', this.currentSession.id);

    this.currentSession.mode = newMode;
  }

  async updateMetrics(metrics: Partial<SessionState['metrics']>): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    // Generate ZK proof for metrics
    const metricsProof = await this.zkService.generateMetricsProof(
      this.currentSession.id,
      { ...this.currentSession.metrics, ...metrics }
    );

    // Encrypt metrics before storing
    const encryptedMetrics = this.encryptionService.encryptSessionData(
      this.currentSession.id,
      metrics
    );

    const { error } = await supabase
      .from('therapy_sessions')
      .update({
        metrics: encryptedMetrics,
        metrics_proof: metricsProof
      })
      .eq('id', this.currentSession.id);

    if (error) {
      throw new Error(`Failed to update metrics: ${error.message}`);
    }

    this.currentSession.metrics = {
      ...this.currentSession.metrics,
      ...metrics
    };
  }

  async endSession(): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const { error } = await supabase
      .from('therapy_sessions')
      .update({
        end_time: new Date().toISOString(),
        status: 'completed'
      })
      .eq('id', this.currentSession.id);

    if (error) {
      throw new Error(`Failed to end session: ${error.message}`);
    }

    // Clean up encryption keys
    this.encryptionService.clearSessionKey(this.currentSession.id);
    this.currentSession = null;
  }

  getCurrentSession(): SessionState | null {
    return this.currentSession;
  }
}

export const sessionManager = SessionManager.getInstance();
