import { Session, User as SupabaseUser } from '@supabase/supabase-js';

export interface User extends SupabaseUser {
  given_name?: string; // Add given_name property
}

export interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: Error | null;
}

export interface AuthContextType extends AuthState {
  isAuthenticated: boolean; // Add isAuthenticated property
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export type UserRole = 'client' | 'therapist' | 'admin';
