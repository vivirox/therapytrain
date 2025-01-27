import { Router } from 'express';
import { SessionController } from '../controllers/session.controller';
import * as KindeAuth from '@kinde-oss/kinde-node-express';

const router = Router();
const sessionController = new SessionController();

export const setupSessionRoutes = (kindeAuth: ReturnType<typeof KindeAuth.default>) => {
  // Create a new session
  router.post('/', kindeAuth.protect(), sessionController.startSession);

  // Get session by ID
  router.get('/:sessionId', kindeAuth.protect(), sessionController.getSession);

  // Load session branches
  router.get('/:sessionId/branches', kindeAuth.protect(), sessionController.loadBranches);

  // Evaluate branches
  router.post('/:sessionId/evaluate', kindeAuth.protect(), sessionController.evaluateBranches);

  // Trigger a branch
  router.post('/branches/:branchId/trigger', kindeAuth.protect(), sessionController.triggerBranch);

  // Switch session mode
  router.patch('/:sessionId/mode', kindeAuth.protect(), sessionController.switchMode);

  // Update session metrics
  router.patch('/:sessionId/metrics', kindeAuth.protect(), sessionController.updateMetrics);

  // End session
  router.post('/:sessionId/end', kindeAuth.protect(), sessionController.endSession);

  return router;
};
