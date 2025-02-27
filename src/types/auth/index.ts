import { User, Session } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { Metadata } from '@/common';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Core authentication types for PocketBase integration
 */

export enum AuthMethod {
  PASSWORD = 'password',
  OAUTH = 'oauth',
  MAGIC_LINK = 'magic_link',
  SSO = 'sso',
}

export enum AuthProvider {
  EMAIL = 'email',
  GOOGLE = 'google',
  MICROSOFT = 'microsoft',
  APPLE = 'apple',
}

export interface AuthConfig {
  providers: {
    [key in AuthProvider]?: {
      enabled: boolean;
      clientId?: string;
      clientSecret?: string;
      scopes?: string[];
    };
  };
  session: {
    maxAge: number;
    refreshThreshold: number;
  };
  security: {
    mfa: {
      enabled: boolean;
      required: boolean;
      methods: string[];
    };
    passwordPolicy: {
      minLength: number;
      requireNumbers: boolean;
      requireSymbols: boolean;
      requireUppercase: boolean;
      requireLowercase: boolean;
    };
    rateLimit: {
      enabled: boolean;
      maxAttempts: number;
      windowMs: number;
    };
  };
}

export interface AuthCredentials {
  provider: AuthProvider;
  method: AuthMethod;
  email?: string;
  password?: string;
  token?: string;
  code?: string;
  metadata?: Metadata;
}

export interface PocketBaseAuth {
  email: string;
  password: string;
  token: string;
  refreshToken: string;
  meta: Record<string, any>;
}

export interface PocketBaseUser {
  id: string;
  email: string;
  verified: boolean;
  roles: string[];
  meta: Record<string, any>;
}

export interface AuthResponse {
  user: User;
  session: Session;
  provider: AuthProvider;
}

export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
}

export interface SupabaseContextType {
  supabase: SupabaseClient<Database>;
  session: Session | null;
  loading: boolean;
}

export interface AuthContextType extends SupabaseContextType {
  signIn: (credentials: AuthCredentials) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  signUp: (credentials: AuthCredentials) => Promise<AuthResponse>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  refreshSession: () => Promise<Session>;
}

// Zero Knowledge Authentication types
export interface ZKAuthConfig {
  enabled: boolean;
  keyDerivation: {
    algorithm: string;
    iterations: number;
    saltLength: number;
  };
  encryption: {
    algorithm: string;
    keyLength: number;
    ivLength: number;
  };
}

export interface ZKKeyPair {
  publicKey: string;
  encryptedPrivateKey: string;
  nonce: string;
}

export interface ZKAuthState {
  keyPair: ZKKeyPair | null;
  derivedKey: string | null;
}

// Rate Limiting types
export interface RateLimitConfig {
  enabled: boolean;
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

export interface RateLimitState {
  attempts: number;
  firstAttempt: Date;
  blocked: boolean;
  blockExpires?: Date;
}

// Audit types
export interface AuthAuditEvent {
  type: string;
  userId?: string;
  timestamp: Date;
  success: boolean;
  provider: AuthProvider;
  method: AuthMethod;
  ip: string;
  userAgent: string;
  metadata?: Record<string, any>;
}

// Session types
export interface EnhancedSession extends Session {
  zkState?: ZKAuthState;
  rateLimitState?: RateLimitState;
  lastActivity: Date;
  deviceInfo: {
    id: string;
    name: string;
    type: string;
    os: string;
    browser: string;
  };
} 