import { api } from './api';
import {
    ApiResponse,
    PaginatedResponse,
    UserProfile,
    TherapySession,
    ClientProfile,
    AnalyticsData,
    ComplianceReport
} from '@/types/api';

export const endpoints = {
    auth: {
        login: (email: string, password: string) =>
            api.post<{ token: string }>('/auth/login', { email, password }),

        register: (email: string, password: string, profile: Partial<UserProfile>) =>
            api.post<{ token: string }>('/auth/register', { email, password, profile }),

        forgotPassword: (email: string) =>
            api.post<void>('/auth/forgot-password', { email }),

        resetPassword: (token: string, newPassword: string) =>
            api.post<void>('/auth/reset-password', { token, newPassword }),

        verifyEmail: (token: string) =>
            api.post<void>('/auth/verify-email', { token }),
    },

    users: {
        getProfile: () =>
            api.get<UserProfile>('/users/profile'),

        updateProfile: (data: Partial<UserProfile>) =>
            api.patch<UserProfile>('/users/profile', data),

        updateSettings: (settings: Record<string, any>) =>
            api.patch<UserProfile>('/users/settings', { settings }),
    },

    sessions: {
        create: (clientId: string, type: TherapySession['type']) =>
            api.post<TherapySession>('/sessions', { clientId, type }),

        get: (id: string) =>
            api.get<TherapySession>(`/sessions/${id}`),

        update: (id: string, data: Partial<TherapySession>) =>
            api.patch<TherapySession>(`/sessions/${id}`, data),

        end: (id: string, summary: string) =>
            api.post<TherapySession>(`/sessions/${id}/end`, { summary }),

        list: (params?: { page?: number; limit?: number; status?: TherapySession['status'] }) =>
            api.get<PaginatedResponse<TherapySession>>('/sessions', { params }),
    },

    clients: {
        create: (data: Omit<ClientProfile, 'id' | 'createdAt' | 'updatedAt'>) =>
            api.post<ClientProfile>('/clients', data),

        get: (id: string) =>
            api.get<ClientProfile>(`/clients/${id}`),

        update: (id: string, data: Partial<ClientProfile>) =>
            api.patch<ClientProfile>(`/clients/${id}`, data),

        archive: (id: string) =>
            api.post<ClientProfile>(`/clients/${id}/archive`),

        list: (params?: { page?: number; limit?: number; status?: ClientProfile['status'] }) =>
            api.get<PaginatedResponse<ClientProfile>>('/clients', { params }),
    },

    analytics: {
        getDashboard: () =>
            api.get<AnalyticsData>('/analytics/dashboard'),

        getSessionMetrics: (sessionId: string) =>
            api.get<TherapySession['metrics']>(`/analytics/sessions/${sessionId}/metrics`),

        getClientProgress: (clientId: string) =>
            api.get<{ progress: number; trends: any[] }>(`/analytics/clients/${clientId}/progress`),
    },

    compliance: {
        generateReport: (type: ComplianceReport['type']) =>
            api.post<ComplianceReport>('/compliance/reports', { type }),

        getReport: (id: string) =>
            api.get<ComplianceReport>(`/compliance/reports/${id}`),

        listReports: (params?: { page?: number; limit?: number; type?: ComplianceReport['type'] }) =>
            api.get<PaginatedResponse<ComplianceReport>>('/compliance/reports', { params }),

        runAudit: () =>
            api.post<ComplianceReport>('/compliance/audit'),
    },
}; 