import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../services/session.service';
import { z } from 'zod';
import { supabase } from '../../../src/lib/supabase';

const sessionService = new SessionService();

const startSessionSchema = z.object({
  clientId: z.string(),
  mode: z.enum(['text', 'video', 'hybrid']),
});

// Other schemas...

export class SupabaseSessionController {
  async startSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { clientId, mode } = startSessionSchema.parse(req.body);
      const session = await sessionService.startSession(clientId, mode); // Ensure this uses Supabase
      res.status(201).json(session);
    } catch (error) {
      next(error);
    }
  }

  // Other methods...

  async signIn(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }
      res.status(200).json({ user: data.user });
    } catch (error) {
      next(error);
    }
  }

  async signUp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        throw error;
      }
      res.status(201).json({ user: data.user });
    } catch (error) {
      next(error);
    }
  }
}
