import { User, SupabaseClient, Session } from '@supabase/supabase-js';
import { Message, ChatSession } from '@/chat';
import { SessionState } from '@/session';
export interface ApiService {
    sessions: {
        start: (clientId: string, mode: string) => Promise<ChatSession>;
        end: (sessionId: string) => Promise<void>;
        switchMode: (sessionId: string, newMode: string) => Promise<void>;
        get: (sessionId: string) => Promise<ChatSession>;
        list: (clientId: string) => Promise<ChatSession[]>;
    };
    messages: {
        send: (sessionId: string, content: string) => Promise<Message>;
        list: (sessionId: string) => Promise<Message[]>;
        delete: (messageId: string) => Promise<void>;
        update: (messageId: string, content: string) => Promise<Message>;
    };
    clients: {
        get: (clientId: string) => Promise<ClientProfile>;
        list: (filters?: ClientFilters) => Promise<PaginatedResponse<ClientProfile>>;
        create: (data: CreateClientData) => Promise<ClientProfile>;
        update: (clientId: string, data: UpdateClientData) => Promise<ClientProfile>;
        delete: (clientId: string) => Promise<void>;
    };
    analytics: {
        getSessionMetrics: (sessionId: string) => Promise<SessionMetrics>;
        getClientProgress: (clientId: string) => Promise<ClientProgress>;
        getTherapistStats: (therapistId: string) => Promise<TherapistStats>;
    };
}
export interface ApiResponse<T = any> {
    data?: T;
    error?: {
        message: string;
        code?: string;
    };
}
export interface ApiError extends Error {
    code?: string;
    status?: number;
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
export interface ClientFilters {
    status?: 'active' | 'inactive' | 'archived';
    therapistId?: string;
    search?: string;
    page?: number;
    limit?: number;
}
export interface CreateClientData {
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
    intake: {
        reason: string;
        history: string;
        goals: string[];
    };
}
export interface UpdateClientData extends Partial<CreateClientData> {
    status?: 'active' | 'inactive' | 'archived';
    diagnosis?: {
        primary?: string;
        secondary?: string[];
        notes?: string;
    };
    treatment?: {
        plan?: string;
        approach?: string[];
        goals?: string[];
        progress?: number;
    };
}
export interface SessionMetrics {
    duration: number;
    engagement: number;
    progress: number;
    interventions: number;
    riskLevel: number;
    goals: {
        set: number;
        achieved: number;
    };
}
export interface ClientProgress {
    overallProgress: number;
    goalCompletion: {
        completed: number;
        total: number;
        goals: Array<{
            id: string;
            description: string;
            progress: number;
            status: 'not-started' | 'in-progress' | 'completed';
        }>;
    };
    sessionMetrics: {
        total: number;
        completed: number;
        averageDuration: number;
        averageEngagement: number;
    };
}
export interface TherapistStats {
    activeClients: number;
    totalSessions: number;
    averageSessionDuration: number;
    clientSatisfaction: number;
    successRate: number;
    specialties: string[];
    availability: {
        hours: number;
        slots: number;
    };
    certifications: {
        active: string[];
        pending: string[];
    };
}

export interface Database {
    public: { Tables: { [key: string]: any } };
}
