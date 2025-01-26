import { Express } from 'express';
import { setupSessionRoutes } from './session.routes';
import { setupKindeAuth } from '../middleware/kindeAuth';

export const setupRoutes = (app: Express) => {
  const kindeAuth = setupKindeAuth(app);
  
  app.use('/api/sessions', setupSessionRoutes(kindeAuth));
};
