import { User, SupabaseClient, Session } from '@supabase/supabase-js';

declare global {
  namespace Express {
    interface Request {
      user?: User; // Add user property to the Request interface
    }
  }
}

export interface Database {
    public: { Tables: { [key: string]: any } };
}
