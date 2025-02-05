import { Session, User } from '@supabase/supabase-js';

export interface User extends SupabaseUser {
  given_name?: string; // Add given_name property
}

export interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: Error | null;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  error: Error | null;
}

export interface AuthProviderProps {
  children: React.ReactNode;
}

export type UserRole = 'client' | 'therapist' | 'admin';
