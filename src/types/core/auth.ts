import { UserProfile, UserSession } from '@/user';
import { Metadata } from '@/common';
import type { Database } from './database'
import type { User } from './user'

/**
 * Enum for authentication providers
 */
export enum AuthProvider {
    EMAIL = 'email',
    GOOGLE = 'google',
    MICROSOFT = 'microsoft',
    APPLE = 'apple'
}

/**
 * Enum for authentication methods
 */
export enum AuthMethod {
    PASSWORD = 'password',
    OTP = 'otp',
    MAGIC_LINK = 'magic_link',
    OAUTH = 'oauth',
    SSO = 'sso'
}

/**
 * Interface for authentication state
 */
export interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: UserProfile | null;
    session: UserSession | null;
    error: Error | null;
}

/**
 * Interface for authentication context
 */
export interface AuthContextType {
    state: AuthState;
    signIn: (credentials: AuthCredentials) => Promise<AuthResult>;
    signOut: () => Promise<void>;
    signUp: (registration: AuthRegistration) => Promise<AuthResult>;
    resetPassword: (email: string) => Promise<void>;
    updatePassword: (oldPassword: string, newPassword: string) => Promise<void>;
    refreshSession: () => Promise<void>;
}

/**
 * Interface for authentication credentials
 */
export interface AuthCredentials {
    provider: AuthProvider;
    method: AuthMethod;
    email?: string;
    password?: string;
    token?: string;
    code?: string;
    metadata?: Metadata;
}

/**
 * Interface for authentication registration
 */
export interface AuthRegistration {
    provider: AuthProvider;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    metadata?: Metadata;
}

/**
 * Interface for authentication result
 */
export interface AuthResult {
    user: UserProfile;
    session: UserSession;
    tokens: {
        accessToken: string;
        refreshToken: string;
        idToken?: string;
    };
    provider: AuthProvider;
    metadata?: Metadata;
}

/**
 * Interface for authentication configuration
 */
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

/**
 * Interface for multi-factor authentication
 */
export interface MFAConfig {
    enabled: boolean;
    method: 'totp' | 'sms' | 'email';
    secret?: string;
    verified: boolean;
    backupCodes?: string[];
}

/**
 * Interface for authentication events
 */
export interface AuthEvent {
    type: 'SIGN_IN' | 'SIGN_OUT' | 'SIGN_UP' | 'PASSWORD_RESET' | 'SESSION_REFRESH';
    userId: string;
    provider: AuthProvider;
    timestamp: Date;
    success: boolean;
    error?: Error;
    metadata?: {
        ipAddress?: string;
        userAgent?: string;
        location?: string;
    };
}

/**
 * Type guard for checking if value is AuthResult
 */
export const isAuthResult = (value: unknown): value is AuthResult => {
    if (typeof value !== 'object' || value === null) return false;
    
    const result = value as Partial<AuthResult>;
    return (
        result.user !== undefined &&
        result.session !== undefined &&
        result.tokens !== undefined &&
        typeof result.tokens.accessToken === 'string' &&
        typeof result.tokens.refreshToken === 'string' &&
        typeof result.provider === 'string'
    );
};

// Auth session
export interface AuthSession {
    id: string
    user_id: string
    provider: AuthProvider
    access_token: string
    refresh_token?: string
    expires_at: string
    created_at: string
    updated_at: string
}

// Auth session with user
export interface AuthSessionWithUser extends AuthSession {
    user: User
}

// Auth response
export interface AuthResponse {
    session: AuthSession
    user: User
}

// Auth error
export interface AuthError {
    code: string
    message: string
    details?: Record<string, unknown>
}

// Password reset request
export interface PasswordResetRequest {
    email: string
    token: string
    expires_at: string
    created_at: string
}

// Password reset
export interface PasswordReset {
    token: string
    password: string
    confirm_password: string
}

// Magic link request
export interface MagicLinkRequest {
    email: string
    redirect_to?: string
}

// OAuth provider config
export interface OAuthProviderConfig {
    provider: AuthProvider
    client_id: string
    client_secret: string
    redirect_uri: string
    scopes: string[]
}

// Type guard for AuthSession
export function isAuthSession(obj: unknown): obj is AuthSession {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'user_id' in obj &&
        'provider' in obj &&
        'access_token' in obj
    )
}

// Type guard for AuthError
export function isAuthError(obj: unknown): obj is AuthError {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'code' in obj &&
        'message' in obj
    )
}

// Database types
export type AuthSessionRow = Database['public']['Tables']['auth_sessions']['Row']
export type AuthSessionInsert = Database['public']['Tables']['auth_sessions']['Insert']
export type AuthSessionUpdate = Database['public']['Tables']['auth_sessions']['Update']

export type PasswordResetRequestRow = Database['public']['Tables']['password_reset_requests']['Row']
export type PasswordResetRequestInsert = Database['public']['Tables']['password_reset_requests']['Insert']
export type PasswordResetRequestUpdate = Database['public']['Tables']['password_reset_requests']['Update'] 