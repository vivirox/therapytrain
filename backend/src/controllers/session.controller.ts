import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../services/session.service';
import { z } from 'zod';

const sessionService = new SessionService();

const startSessionSchema = z.object({
  clientId: z.string(),
  mode: z.enum(['text', 'video', 'hybrid']),
});

const updateMetricsSchema = z.object({
  metrics: z.object({
    sentiment: z.number().min(-1).max(1).optional(),
    engagement: z.number().min(0).max(1).optional(),
    riskLevel: z.number().min(0).max(1).optional(),
    interventionSuccess: z.number().min(0).max(1).optional(),
  }),
});

export class SessionController {
  async startSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { clientId, mode } = startSessionSchema.parse(req.body);
      const session = await sessionService.startSession(clientId, mode);
      res.status(201).json(session);
    } catch (error) {
      next(error);
    }
  }

  async getSession(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await sessionService.getSession(req.params.sessionId);
      res.json(session);
    } catch (error) {
      next(error);
    }
  }

  async loadBranches(req: Request, res: Response, next: NextFunction) {
    try {
      const branches = await sessionService.loadSessionBranches(req.params.sessionId);
      res.json(branches);
    } catch (error) {
      next(error);
    }
  }

  async evaluateBranches(req: Request, res: Response, next: NextFunction) {
    try {
      const metrics = updateMetricsSchema.parse(req.body).metrics;
      const branch = await sessionService.evaluateBranches(
        req.params.sessionId,
        metrics
      );
      res.json(branch);
    } catch (error) {
      next(error);
    }
  }

  async triggerBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const branch = await sessionService.triggerBranch(req.params.branchId);
      res.json(branch);
    } catch (error) {
      next(error);
    }
  }

  async switchMode(req: Request, res: Response, next: NextFunction) {
    try {
      const { mode } = z.object({ mode: z.enum(['text', 'video', 'hybrid']) }).parse(req.body);
      const session = await sessionService.switchMode(req.params.sessionId, mode);
      res.json(session);
    } catch (error) {
      next(error);
    }
  }

  async updateMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const { metrics } = updateMetricsSchema.parse(req.body);
      const session = await sessionService.updateMetrics(
        req.params.sessionId,
        metrics
      );
      res.json(session);
    } catch (error) {
      next(error);
    }
  }

  async endSession(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await sessionService.endSession(req.params.sessionId);
      res.json(session);
    } catch (error) {
      next(error);
    }
  }
}
