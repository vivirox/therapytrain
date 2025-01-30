import { createClient } from '@supabase/supabase-js';
import { Request, Response, NextFunction } from 'express';

class SupabaseClient {
  private static instance: ReturnType<typeof createClient>;

  public static getInstance() {
    if (!this.instance) {
      const supabaseConfig = {
        supabaseUrl: process.env.SUPABASE_URL!,
        supabaseKey: process.env.SUPABASE_ANON_KEY!
      };

      try {
        this.instance = createClient(
          supabaseConfig.supabaseUrl,
          supabaseConfig.supabaseKey
        );
      } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
        throw new Error('Database connection failed');
      }
    }
    return this.instance;
  }
}

export const supabase = SupabaseClient.getInstance();

export const setupSupabaseAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  supabase.auth.getUser(token)
    .then(({ data, error }) => {
      if (error || !data.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      req.user = data.user; // Attach user to request
      next();
    })
    .catch(() => {
      return res.status(401).json({ error: 'Unauthorized' });
    });
};
