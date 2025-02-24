import { Router, Request, Response, NextFunction } from 'express';
import { SessionController } from '@/controllers/session.controller';

const router = Router();
const sessionController = new SessionController();

export const setupSessionRoutes = () => {
  // Session routes
  router.post('/', sessionController.startSession.bind(sessionController));
  router.get('/', sessionController.getSessions.bind(sessionController));
  router.get('/:id', sessionController.getSession.bind(sessionController));
  router.put('/:id', sessionController.updateSession.bind(sessionController));
  router.delete('/:id', sessionController.deleteSession.bind(sessionController));
  
  return router;
};
