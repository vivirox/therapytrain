import { Session, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/database.types';
import { ReactNode } from 'react';
import { UserProfile, UserSession } from './user';
import { Metadata } from './common';

export interface User {
  id: string;
  email: string;
  role: string;
  profile?: UserProfile;
  lastSignInAt?: string;
  createdAt: string;
  updatedAt: string;
  aud: string;
  confirmed_at?: string;
  email_confirmed_at?: string;
  phone?: string;
  phone_confirmed_at?: string;
  last_sign_in_at?: string;
  app_metadata: {
    provider?: string;
    providers?: string[];
  };
  user_metadata: {
    avatar_url?: string;
    full_name?: string;
  };
  identities?: Array<{
    id: string;
    user_id: string;
    identity_data: {
      email?: string;
      sub?: string;
    };
    provider: string;
    created_at: string;
    last_sign_in_at: string;
  }>;
}

export interface AuthState {
  user: UserProfile | null;
  session: UserSession | null;
  loading: boolean;
  error: Error | null;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserProfile;
  session: UserSession;
  tokens: {
    access_token: string;
    refresh_token: string;
  };
}

export interface AuthError extends Error {
  code: string;
  details?: Record<string, unknown>;
}

export interface AuthProviderProps {
  children: ReactNode;
  onAuthStateChange?: (state: AuthState) => void;
}

export interface AuthContextType {
  user: UserProfile | null;
  session: UserSession | null;
  loading: boolean;
  error: Error | null;
  signIn: (credentials: AuthCredentials) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  signUp: (credentials: AuthCredentials) => Promise<AuthResponse>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateEmail: (email: string) => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<UserProfile>;
}

export interface AuthConfig {
  providers: {
    email: boolean;
    google: boolean;
    github: boolean;
    [key: string]: boolean;
  };
  redirects: {
    signIn: string;
    signUp: string;
    forgotPassword: string;
    [key: string]: string;
  };
  session: {
    maxAge: number;
    refreshInterval: number;
  };
  security: {
    requireEmailVerification: boolean;
    requireStrongPassword: boolean;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };
}

export interface AuthEvent {
  type: 'SIGNED_IN' | 'SIGNED_OUT' | 'USER_UPDATED' | 'USER_DELETED' | 'TOKEN_REFRESHED';
  user?: UserProfile;
  session?: UserSession;
  timestamp: string;
  metadata?: Metadata;
}

export interface AuthToken {
  token: string;
  expires_at: string;
  refresh_token?: string;
  type: 'bearer' | 'jwt';
  metadata?: Metadata;
}

export interface AuthProvider {
  id: string;
  type: 'oauth' | 'email' | 'phone';
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
  metadata?: Metadata;
}

export interface AuthSession {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  last_active_at: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Metadata;
}

export interface AuthStoreState extends AuthState {
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export type UserRole = 'client' | 'therapist' | 'admin';

export interface Database {
    public: { Tables: { [key: string]: any } };
}
