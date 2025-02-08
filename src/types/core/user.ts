import { Timestamps, Metadata, Auditable, Statusable } from '@/common';
import type { Database } from './database'

/**
 * Enum for user roles
 */
export enum UserRole {
    ADMIN = 'admin',
    THERAPIST = 'therapist',
    CLIENT = 'client',
    SUPERVISOR = 'supervisor'
}

/**
 * Enum for user status
 */
export enum UserStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    PENDING = 'pending',
    SUSPENDED = 'suspended'
}

/**
 * Interface for user preferences
 */
export interface UserPreferences {
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
    notifications: {
        email: boolean;
        push: boolean;
        sms: boolean;
    };
    privacy: {
        profileVisibility: 'public' | 'private' | 'contacts';
        onlineStatus: boolean;
        activityTracking: boolean;
    };
    accessibility: {
        fontSize: number;
        contrast: 'normal' | 'high';
        animations: boolean;
    };
}

/**
 * Interface for user profile
 */
export interface UserProfile {
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
    bio?: string;
    specialties?: string[];
    certifications?: string[];
    preferences?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

/**
 * Interface for user credentials
 */
export interface UserCredentials {
    email: string;
    password: string;
}

/**
 * Interface for user registration
 */
export interface UserRegistration extends UserCredentials {
    role: UserRole;
    first_name: string;
    last_name: string;
}

/**
 * Interface for user session
 */
export interface UserSession {
    id: string;
    userId: string;
    token: string;
    refreshToken: string;
    expiresAt: Date;
    createdAt: Date;
    lastActivity: Date;
    ipAddress: string;
    userAgent: string;
    metadata?: Metadata;
}

/**
 * Interface for user authentication result
 */
export interface AuthResult {
    user: UserProfile;
    session: UserSession;
    tokens: {
        accessToken: string;
        refreshToken: string;
    };
}

/**
 * Interface for user update request
 */
export interface UserUpdateRequest {
    firstName?: string;
    lastName?: string;
    email?: string;
    status?: UserStatus;
    preferences?: Partial<UserPreferences>;
    metadata?: Metadata;
}

/**
 * Interface for user search filters
 */
export interface UserSearchFilters {
    role?: UserRole;
    status?: UserStatus;
    query?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}

/**
 * Interface for user update data
 */
export interface UserUpdate {
    email?: string;
    role?: UserRole;
    status?: UserStatus;
    metadata?: Record<string, unknown>;
}

/**
 * Interface for user profile update data
 */
export interface UserProfileUpdate {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    bio?: string;
    specialties?: string[];
    certifications?: string[];
    preferences?: Record<string, unknown>;
}

/**
 * Interface for user with profile
 */
export interface UserWithProfile extends User {
    profile: UserProfile;
}

/**
 * Type guard for checking if value is User
 */
export function isUser(obj: unknown): obj is User {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'email' in obj &&
        'role' in obj &&
        'status' in obj
    );
}

/**
 * Type guard for checking if value is UserProfile
 */
export function isUserProfile(obj: unknown): obj is UserProfile {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'user_id' in obj &&
        'first_name' in obj &&
        'last_name' in obj
    );
}

/**
 * Database types
 */
export type UserRow = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update']; 