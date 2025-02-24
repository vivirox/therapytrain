import { Express, Request, Response, NextFunction } from 'express';
import { setupSessionRoutes } from './session.routes';

export const setupRoutes = (app: Express) => {
  app.use('/api/sessions', setupSessionRoutes());
};

export { setupSessionRoutes };