import { User } from '@supabase/supabase-js';

export interface UserProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'ADMIN' | 'THERAPIST' | 'CLIENT';
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date;
    preferences?: {
        theme?: 'light' | 'dark';
        notifications?: boolean;
        language?: string;
    };
    metadata?: Record<string, any>;
}

export interface UserSession {
    id: string;
    user: User;
    profile: UserProfile;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    metadata?: Record<string, any>;
}

export interface UserCredentials {
    email: string;
    password: string;
}

export interface UserRegistration extends UserCredentials {
    firstName: string;
    lastName: string;
    role: 'THERAPIST' | 'CLIENT';
}

export interface UserUpdateRequest {
    firstName?: string;
    lastName?: string;
    email?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    preferences?: {
        theme?: 'light' | 'dark';
        notifications?: boolean;
        language?: string;
    };
    metadata?: Record<string, any>;
}

export interface UserSearchFilters {
    role?: 'ADMIN' | 'THERAPIST' | 'CLIENT';
    status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    query?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
} 