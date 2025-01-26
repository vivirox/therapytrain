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
  metrics: {
    sentiment: number;
    engagement: number;
    riskLevel: number;
    interventionSuccess: number;
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

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  public async startSession(clientId: string, mode: SessionMode): Promise<SessionState> {
    const sessionId = crypto.randomUUID();
    this.currentSession = {
      id: sessionId,
      clientId,
      mode,
      currentBranch: null,
      startTime: new Date(),
      metrics: {
        sentiment: 0,
        engagement: 0,
        riskLevel: 0,
        interventionSuccess: 0,
      },
    };
    return this.currentSession;
  }

  public async loadSessionBranches(sessionId: string): Promise<void> {
    // TODO: Implement loading branches from your preferred storage solution
    // For now, using mock data
    const mockBranches: SessionBranch[] = [
      {
        id: crypto.randomUUID(),
        sessionId,
        condition: "sentiment < 0.3",
        nextAction: "intervention_required",
        probability: 0.8,
        triggered: false,
      },
    ];
    this.branches.set(sessionId, mockBranches);
  }

  public async evaluateBranches(metrics: { sentiment: number; engagement: number }): Promise<SessionBranch | null> {
    if (!this.currentSession) return null;

    const branches = this.branches.get(this.currentSession.id) || [];
    for (const branch of branches) {
      if (!branch.triggered && this.evaluateCondition(branch.condition, metrics)) {
        return branch;
      }
    }
    return null;
  }

  private evaluateCondition(condition: string, metrics: { sentiment: number; engagement: number }): boolean {
    // Simple condition evaluation
    const { sentiment, engagement } = metrics;
    try {
      return eval(condition); // Note: In production, use a proper expression evaluator
    } catch {
      return false;
    }
  }

  public async triggerBranch(branch: SessionBranch): Promise<void> {
    if (!this.currentSession) return;

    const branches = this.branches.get(this.currentSession.id) || [];
    const branchIndex = branches.findIndex(b => b.id === branch.id);
    if (branchIndex >= 0) {
      branches[branchIndex].triggered = true;
      this.branches.set(this.currentSession.id, branches);
      this.currentSession.currentBranch = branch.id;
    }
  }

  public async switchMode(newMode: SessionMode): Promise<void> {
    if (this.currentSession) {
      this.currentSession.mode = newMode;
    }
  }

  public async updateMetrics(metrics: Partial<SessionState['metrics']>): Promise<void> {
    if (this.currentSession) {
      this.currentSession.metrics = {
        ...this.currentSession.metrics,
        ...metrics,
      };
    }
  }

  public async endSession(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.endTime = new Date();
      // TODO: Implement session storage in your preferred solution
      this.currentSession = null;
    }
  }

  public getCurrentSession(): SessionState | null {
    return this.currentSession;
  }
}

export const sessionManager = SessionManager.getInstance();
