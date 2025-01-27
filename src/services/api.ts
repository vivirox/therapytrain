import { useKindeAuth } from '@kinde-oss/kinde-auth-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithAuth(endpoint: string, options: ApiOptions = {}) {
  const { getToken } = useKindeAuth();
  const token = await getToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new ApiError(response.status, error.message);
  }

  return response.json();
}

export const api = {
  // Data endpoints
  data: {
    create: (collection: string, data: any) =>
      fetchWithAuth(`/${collection}`, {
        method: 'POST',
        body: data,
      }),

    get: (collection: string, id: string) =>
      fetchWithAuth(`/${collection}/${id}`),

    update: (collection: string, id: string, data: any) =>
      fetchWithAuth(`/${collection}/${id}`, {
        method: 'PATCH',
        body: data,
      }),

    delete: (collection: string, id: string) =>
      fetchWithAuth(`/${collection}/${id}`, {
        method: 'DELETE',
      }),

    list: (collection: string, query: Record<string, any> = {}) =>
      fetchWithAuth(`/${collection}?${new URLSearchParams(query).toString()}`),

    findOne: (collection: string, query: Record<string, any>) =>
      fetchWithAuth(`/${collection}/findOne?${new URLSearchParams(query).toString()}`),
  },

  // Session endpoints
  sessions: {
    start: (clientId: string, mode: 'text' | 'video' | 'hybrid') =>
      fetchWithAuth('/sessions', {
        method: 'POST',
        body: { clientId, mode },
      }),

    get: (sessionId: string) =>
      fetchWithAuth(`/sessions/${sessionId}`),

    getBranches: (sessionId: string) =>
      fetchWithAuth(`/sessions/${sessionId}/branches`),

    evaluateBranches: (sessionId: string, metrics: { sentiment: number; engagement: number }) =>
      fetchWithAuth(`/sessions/${sessionId}/evaluate`, {
        method: 'POST',
        body: { metrics },
      }),

    triggerBranch: (branchId: string) =>
      fetchWithAuth(`/branches/${branchId}/trigger`, {
        method: 'POST',
      }),

    updateMetrics: (sessionId: string, metrics: {
      sentiment?: number;
      engagement?: number;
      riskLevel?: number;
      interventionSuccess?: number;
    }) =>
      fetchWithAuth(`/sessions/${sessionId}/metrics`, {
        method: 'PATCH',
        body: { metrics },
      }),

    switchMode: (sessionId: string, mode: 'text' | 'video' | 'hybrid') =>
      fetchWithAuth(`/sessions/${sessionId}/mode`, {
        method: 'PATCH',
        body: { mode },
      }),

    end: (sessionId: string) =>
      fetchWithAuth(`/sessions/${sessionId}/end`, {
        method: 'POST',
      }),
  },

  // User profile endpoints
  users: {
    getProfile: () =>
      fetchWithAuth('/users/profile'),

    updateProfile: (data: any) =>
      fetchWithAuth('/users/profile', {
        method: 'PATCH',
        body: data,
      }),

    updateSkills: (skills: Record<string, number>) =>
      fetchWithAuth('/users/skills', {
        method: 'PATCH',
        body: { skills },
      }),

    updatePreferences: (preferences: Record<string, any>) =>
      fetchWithAuth('/users/preferences', {
        method: 'PATCH',
        body: { preferences },
      }),
  },
};
