import { Session, SessionDocument, SessionMetrics } from '../models/session.model';
import { SessionBranch, SessionBranchDocument } from '../models/sessionBranch.model';
import { AppError } from '../middleware/errorHandler';

export class SessionService {
  async startSession(
    clientId: string,
    mode: SessionDocument['mode']
  ): Promise<SessionDocument> {
    const session = await Session.create({
      clientId,
      mode,
      startTime: new Date(),
      metrics: {
        sentiment: 0,
        engagement: 0,
        riskLevel: 0,
        interventionSuccess: 0,
      },
    });

    return session;
  }

  async loadSessionBranches(sessionId: string): Promise<SessionBranchDocument[]> {
    const branches = await SessionBranch.find({
      sessionId,
      deletedAt: null,
    }).sort({ probability: -1 });

    return branches;
  }

  async evaluateBranches(
    sessionId: string,
    metrics: Pick<SessionMetrics, 'sentiment' | 'engagement'>
  ): Promise<SessionBranchDocument | null> {
    const branches = await SessionBranch.find({
      sessionId,
      triggered: false,
      deletedAt: null,
    });

    for (const branch of branches) {
      if (this.evaluateCondition(branch.condition, metrics)) {
        return branch;
      }
    }

    return null;
  }

  private evaluateCondition(
    condition: string,
    metrics: Pick<SessionMetrics, 'sentiment' | 'engagement'>
  ): boolean {
    try {
      // Simple condition evaluation - in production, use a proper expression evaluator
      return eval(condition);
    } catch {
      return false;
    }
  }

  async triggerBranch(branchId: string): Promise<SessionBranchDocument> {
    const branch = await SessionBranch.findByIdAndUpdate(
      branchId,
      { triggered: true },
      { new: true }
    );

    if (!branch) {
      throw new AppError(404, 'Branch not found');
    }

    await Session.findByIdAndUpdate(branch.sessionId, {
      currentBranch: branch.id,
    });

    return branch;
  }

  async switchMode(
    sessionId: string,
    newMode: SessionDocument['mode']
  ): Promise<SessionDocument> {
    const session = await Session.findByIdAndUpdate(
      sessionId,
      { mode: newMode },
      { new: true }
    );

    if (!session) {
      throw new AppError(404, 'Session not found');
    }

    return session;
  }

  async updateMetrics(
    sessionId: string,
    metrics: Partial<SessionMetrics>
  ): Promise<SessionDocument> {
    const session = await Session.findById(sessionId);

    if (!session) {
      throw new AppError(404, 'Session not found');
    }

    session.metrics = {
      ...session.metrics,
      ...metrics,
    };

    await session.save();
    return session;
  }

  async endSession(sessionId: string): Promise<SessionDocument> {
    const session = await Session.findByIdAndUpdate(
      sessionId,
      { endTime: new Date() },
      { new: true }
    );

    if (!session) {
      throw new AppError(404, 'Session not found');
    }

    return session;
  }

  async getSession(sessionId: string): Promise<SessionDocument> {
    const session = await Session.findById(sessionId);

    if (!session) {
      throw new AppError(404, 'Session not found');
    }

    return session;
  }
}
