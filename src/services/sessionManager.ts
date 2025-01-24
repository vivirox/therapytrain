import { supabase } from '@/integrations/supabase/client';

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
  private branches: Map<string, SessionBranch[]> = new Map();

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  async startSession(clientId: string, mode: SessionMode): Promise<SessionState> {
    const { data, error } = await supabase
      .from('therapy_sessions')
      .insert([{
        client_id: clientId,
        mode,
        start_time: new Date().toISOString(),
        status: 'active'
      }])
      .select()
      .single();

    if (error) throw new Error(`Failed to start session: ${error.message}`);

    this.currentSession = {
      id: data.id,
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

    await this.loadSessionBranches(data.id);
    return this.currentSession;
  }

  private async loadSessionBranches(sessionId: string): Promise<void> {
    const { data, error } = await supabase
      .from('session_branches')
      .select('*')
      .eq('session_id', sessionId);

    if (error) throw new Error(`Failed to load branches: ${error.message}`);
    this.branches.set(sessionId, data);
  }

  async evaluateBranches(metrics: { sentiment: number; engagement: number }): Promise<SessionBranch | null> {
    if (!this.currentSession) return null;

    const sessionBranches = this.branches.get(this.currentSession.id) || [];
    for (const branch of sessionBranches) {
      if (branch.triggered) continue;

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
    if (!this.currentSession) return;

    await supabase
      .from('session_branches')
      .update({ triggered: true })
      .eq('id', branch.id);

    this.currentSession.currentBranch = branch.id;
  }

  async switchMode(newMode: SessionMode): Promise<void> {
    if (!this.currentSession) return;

    await supabase
      .from('therapy_sessions')
      .update({ mode: newMode })
      .eq('id', this.currentSession.id);

    this.currentSession.mode = newMode;
  }

  async updateMetrics(metrics: Partial<SessionState['metrics']>): Promise<void> {
    if (!this.currentSession) return;

    this.currentSession.metrics = {
      ...this.currentSession.metrics,
      ...metrics
    };

    await supabase
      .from('therapy_sessions')
      .update({
        metrics: this.currentSession.metrics
      })
      .eq('id', this.currentSession.id);
  }

  async endSession(): Promise<void> {
    if (!this.currentSession) return;

    await supabase
      .from('therapy_sessions')
      .update({
        status: 'completed',
        end_time: new Date().toISOString()
      })
      .eq('id', this.currentSession.id);

    this.currentSession.status = 'completed';
    this.currentSession.endTime = new Date();
  }

  getCurrentSession(): SessionState | null {
    return this.currentSession;
  }
}

export const sessionManager = SessionManager.getInstance();
