import { Router } from 'express';
import { SessionController } from '../controllers/session.controller';

const router = Router();
const sessionController = new SessionController();

// Sign in route
router.post('/sign-in', sessionController.signIn);

// Sign up route
router.post('/sign-up', sessionController.signUp);

export const setupAuthRoutes = () => {
  return router;
};
