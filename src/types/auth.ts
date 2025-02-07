import { Session } from '@supabase/supabase-js';

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: 'therapist' | 'supervisor' | 'admin';
  specializations?: string[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface AuthContextType extends AuthState {
  session: Session | null;
  loading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
}

export interface AuthStoreState extends AuthState {
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export interface AuthProviderProps {
  children: React.ReactNode;
}

export type UserRole = 'client' | 'therapist' | 'admin';
