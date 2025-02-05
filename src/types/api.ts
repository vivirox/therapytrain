import { User } from '@supabase/supabase-js';
import { Message, ChatSession } from './chat';
import { SessionState } from './session';

export interface ApiResponse<T = any> {
    data: T | null;
    error: string | null;
    status: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        hasMore: boolean;
    };
}

export interface UserProfile {
    id: string;
    userId: string;
    email: string;
    fullName: string;
    role: 'therapist' | 'supervisor' | 'admin';
    specialties: string[];
    certifications: string[];
    createdAt: string;
    updatedAt: string;
}

export interface TherapySession {
    id: string;
    therapistId: string;
    clientId: string;
    type: 'individual' | 'group' | 'assessment';
    status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
    startTime: string;
    endTime?: string;
    notes: string;
    metrics: {
        duration: number;
        engagement: number;
        progress: number;
        riskLevel: number;
    };
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

export interface ClientProfile {
    id: string;
    therapistId: string;
    fullName: string;
    dateOfBirth: string;
    gender: string;
    contactInfo: {
        email?: string;
        phone?: string;
        address?: string;
    };
    emergencyContact: {
        name: string;
        relationship: string;
        phone: string;
    };
    status: 'active' | 'inactive' | 'archived';
    intake: {
        date: string;
        reason: string;
        history: string;
        goals: string[];
    };
    diagnosis: {
        primary?: string;
        secondary?: string[];
        notes?: string;
    };
    treatment: {
        plan: string;
        approach: string[];
        goals: string[];
        progress: number;
    };
    createdAt: string;
    updatedAt: string;
}

export interface AnalyticsData {
    metrics: {
        totalSessions: number;
        activeClients: number;
        averageSessionDuration: number;
        clientSatisfaction: number;
        progressRate: number;
    };
    trends: {
        date: string;
        sessions: number;
        engagement: number;
        satisfaction: number;
    }[];
    insights: {
        type: 'success' | 'warning' | 'info';
        message: string;
        metric?: string;
        change?: number;
    }[];
}

export interface ComplianceReport {
    id: string;
    type: 'audit' | 'incident' | 'assessment';
    status: 'compliant' | 'non-compliant' | 'needs-review';
    date: string;
    findings: {
        category: string;
        status: 'pass' | 'fail' | 'warning';
        details: string;
        recommendations?: string[];
    }[];
    summary: string;
    createdAt: string;
    updatedAt: string;
}

export interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: any;
    };
    status: number;
} 