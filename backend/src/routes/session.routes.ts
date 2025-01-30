import { Router } from 'express';
import { SessionController } from '../controllers/session.controller';
import { supabaseAuth } from '../middleware/supabaseAuth';

const router = Router();
const sessionController = new SessionController();

export const setupSessionRoutes = () => {
  // Create a new session
  router.post('/', supabaseAuth, sessionController.startSession);

  // Get session by ID
  router.get('/:sessionId', supabaseAuth, sessionController.getSession);

  // Load session branches
  router.get('/:sessionId/branches', supabaseAuth, sessionController.loadBranches);

  // Evaluate branches
  router.post('/:sessionId/evaluate', supabaseAuth, sessionController.evaluateBranches);

  // Trigger a branch
  router.post('/branches/:branchId/trigger', supabaseAuth, sessionController.triggerBranch);

  // Switch session mode
  router.patch('/:sessionId/mode', supabaseAuth, sessionController.switchMode);

  // Update session metrics
  router.patch('/:sessionId/metrics', supabaseAuth, sessionController.updateMetrics);

  // End session
  router.post('/:sessionId/end', supabaseAuth, sessionController.endSession);

  return router;
};
