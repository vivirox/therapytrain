import { Express } from 'express';
import { setupSessionRoutes } from './session.routes';
import { setupSupabaseAuth } from '../middleware/supabaseAuth';

export const setupRoutes = (app: Express) => {
  const supabaseAuthMiddleware = setupSupabaseAuth;

  app.use('/api/sessions', supabaseAuthMiddleware, setupSessionRoutes());
};