import { ObjectId } from 'mongodb';
export interface BaseDocument {
    _id: ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export interface UserDocument extends BaseDocument {
    email: string;
    name?: string;
    role: 'therapist' | 'supervisor' | 'admin';
    specializations?: string[];
    hashedPassword: string;
    sessions?: ObjectId[];
    clients?: ObjectId[];
}
export interface ClientDocument extends BaseDocument {
    name: string;
    email?: string;
    primaryIssue: string;
    keyTraits: string[];
    background: string;
    goals: string[];
    preferences: {
        communicationStyle: string;
        therapyApproach: string;
        sessionFrequency: string;
    };
    progress: {
        milestones: string[];
        challenges: string[];
        nextSteps: string[];
    };
    riskFactors?: string[];
    supportNetwork?: string[];
    medications?: string[];
    notes?: string[];
    therapistId: ObjectId;
}
export interface SessionDocument extends BaseDocument {
    clientId: ObjectId;
    therapistId: ObjectId;
    date: Date;
    duration: number;
    notes: string;
    interventions: {
        type: string;
        description: string;
        outcome: string;
    }[];
    progress: {
        goals: string[];
        challenges: string[];
        insights: string[];
    };
    nextSteps: string[];
    metrics: {
        engagement: number;
        progress: number;
        rapport: number;
    };
}
export interface AuditLog extends BaseDocument {
    eventType: string;
    userId?: string;
    sessionId?: string;
    resourceType: string;
    resourceId: string;
    action: string;
    status: 'success' | 'failure';
    details: Record<string, any>;
    metadata: Record<string, any>;
}
export interface ClientProfile extends BaseDocument {
    age: number;
    background: string;
    category: string;
    complexity: string;
    description: string;
    keyTraits: string[];
    name: string;
    primaryIssue: string;
    userId: string;
}
export interface Session extends BaseDocument {
    clientId: ObjectId;
    userId: string;
    mode: 'text' | 'video';
    status: 'active' | 'completed';
    startTime: Date;
    endTime?: Date;
    metrics: {
        sentiment: number;
        engagement: number;
    };
    messages: {
        role: 'user' | 'assistant';
        content: string;
        timestamp: Date;
    }[];
}
export interface UserProfile extends BaseDocument {
    userId: string;
    email: string;
    name: string;
    skills: {
        [key: string]: number;
    };
    preferences: {
        theme: 'light' | 'dark';
        notifications: boolean;
        language: string;
    };
}
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string;
                    email: string;
                    created_at: string;
                    updated_at: string;
                    name: string | null;
                    avatar_url: string | null;
                    role: 'user' | 'therapist' | 'admin';
                };
                Insert: {
                    id?: string;
                    email: string;
                    created_at?: string;
                    updated_at?: string;
                    name?: string | null;
                    avatar_url?: string | null;
                    role?: 'user' | 'therapist' | 'admin';
                };
                Update: {
                    id?: string;
                    email?: string;
                    created_at?: string;
                    updated_at?: string;
                    name?: string | null;
                    avatar_url?: string | null;
                    role?: 'user' | 'therapist' | 'admin';
                };
            };
            sessions: {
                Row: {
                    id: string;
                    created_at: string;
                    updated_at: string;
                    user_id: string;
                    client_id: string;
                    status: 'active' | 'ended' | 'expired';
                    expires_at: string;
                    metadata: Record<string, unknown> | null;
                };
                Insert: {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                    user_id: string;
                    client_id: string;
                    status?: 'active' | 'ended' | 'expired';
                    expires_at?: string;
                    metadata?: Record<string, unknown> | null;
                };
                Update: {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                    user_id?: string;
                    client_id?: string;
                    status?: 'active' | 'ended' | 'expired';
                    expires_at?: string;
                    metadata?: Record<string, unknown> | null;
                };
            };
            messages: {
                Row: {
                    id: string;
                    created_at: string;
                    session_id: string;
                    sender_id: string;
                    content: string;
                    type: 'text' | 'system' | 'intervention';
                    metadata: Record<string, unknown> | null;
                };
                Insert: {
                    id?: string;
                    created_at?: string;
                    session_id: string;
                    sender_id: string;
                    content: string;
                    type?: 'text' | 'system' | 'intervention';
                    metadata?: Record<string, unknown> | null;
                };
                Update: {
                    id?: string;
                    created_at?: string;
                    session_id?: string;
                    sender_id?: string;
                    content?: string;
                    type?: 'text' | 'system' | 'intervention';
                    metadata?: Record<string, unknown> | null;
                };
            };
            audit_logs: {
                Row: {
                    id: string;
                    created_at: string;
                    user_id: string;
                    action: string;
                    resource_type: string;
                    resource_id: string;
                    details: Record<string, unknown> | null;
                };
                Insert: {
                    id?: string;
                    created_at?: string;
                    user_id: string;
                    action: string;
                    resource_type: string;
                    resource_id: string;
                    details?: Record<string, unknown> | null;
                };
                Update: {
                    id?: string;
                    created_at?: string;
                    user_id?: string;
                    action?: string;
                    resource_type?: string;
                    resource_id?: string;
                    details?: Record<string, unknown> | null;
                };
            };
            clients: {
                Row: {
                    id: string;
                    created_at: string;
                    updated_at: string;
                    email: string;
                    name: string;
                    status: 'active' | 'inactive' | 'archived';
                    metadata: Record<string, unknown> | null;
                };
                Insert: {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                    email: string;
                    name: string;
                    status?: 'active' | 'inactive' | 'archived';
                    metadata?: Record<string, unknown> | null;
                };
                Update: {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                    email?: string;
                    name?: string;
                    status?: 'active' | 'inactive' | 'archived';
                    metadata?: Record<string, unknown> | null;
                };
            };
            client_profiles: {
                Row: {
                    id: string;
                    created_at: string;
                    updated_at: string;
                    client_id: string;
                    therapist_id: string;
                    status: 'active' | 'inactive' | 'archived';
                    metadata: Record<string, unknown> | null;
                };
                Insert: {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                    client_id: string;
                    therapist_id: string;
                    status?: 'active' | 'inactive' | 'archived';
                    metadata?: Record<string, unknown> | null;
                };
                Update: {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                    client_id?: string;
                    therapist_id?: string;
                    status?: 'active' | 'inactive' | 'archived';
                    metadata?: Record<string, unknown> | null;
                };
            };
            interventions: {
                Row: {
                    id: string;
                    created_at: string;
                    updated_at: string;
                    session_id: string;
                    type: string;
                    content: string;
                    status: 'pending' | 'applied' | 'rejected';
                    metadata: Record<string, unknown> | null;
                };
                Insert: {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                    session_id: string;
                    type: string;
                    content: string;
                    status?: 'pending' | 'applied' | 'rejected';
                    metadata?: Record<string, unknown> | null;
                };
                Update: {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                    session_id?: string;
                    type?: string;
                    content?: string;
                    status?: 'pending' | 'applied' | 'rejected';
                    metadata?: Record<string, unknown> | null;
                };
            };
            assessments: {
                Row: {
                    id: string;
                    created_at: string;
                    updated_at: string;
                    client_id: string;
                    type: string;
                    status: 'pending' | 'completed' | 'archived';
                    data: Record<string, unknown>;
                    metadata: Record<string, unknown> | null;
                };
                Insert: {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                    client_id: string;
                    type: string;
                    status?: 'pending' | 'completed' | 'archived';
                    data: Record<string, unknown>;
                    metadata?: Record<string, unknown> | null;
                };
                Update: {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                    client_id?: string;
                    type?: string;
                    status?: 'pending' | 'completed' | 'archived';
                    data?: Record<string, unknown>;
                    metadata?: Record<string, unknown> | null;
                };
            };
            appointments: {
                Row: {
                    id: string;
                    created_at: string;
                    updated_at: string;
                    client_id: string;
                    therapist_id: string;
                    start_time: string;
                    end_time: string;
                    status: 'scheduled' | 'completed' | 'cancelled';
                    metadata: Record<string, unknown> | null;
                };
                Insert: {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                    client_id: string;
                    therapist_id: string;
                    start_time: string;
                    end_time: string;
                    status?: 'scheduled' | 'completed' | 'cancelled';
                    metadata?: Record<string, unknown> | null;
                };
                Update: {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                    client_id?: string;
                    therapist_id?: string;
                    start_time?: string;
                    end_time?: string;
                    status?: 'scheduled' | 'completed' | 'cancelled';
                    metadata?: Record<string, unknown> | null;
                };
            };
            alerts: {
                Row: {
                    id: string;
                    created_at: string;
                    user_id: string;
                    type: string;
                    message: string;
                    status: 'unread' | 'read' | 'dismissed';
                    metadata: Record<string, unknown> | null;
                };
                Insert: {
                    id?: string;
                    created_at?: string;
                    user_id: string;
                    type: string;
                    message: string;
                    status?: 'unread' | 'read' | 'dismissed';
                    metadata?: Record<string, unknown> | null;
                };
                Update: {
                    id?: string;
                    created_at?: string;
                    user_id?: string;
                    type?: string;
                    message?: string;
                    status?: 'unread' | 'read' | 'dismissed';
                    metadata?: Record<string, unknown> | null;
                };
            };
            feedback: {
                Row: {
                    id: string;
                    created_at: string;
                    user_id: string;
                    session_id: string;
                    rating: number;
                    comment: string | null;
                    metadata: Record<string, unknown> | null;
                };
                Insert: {
                    id?: string;
                    created_at?: string;
                    user_id: string;
                    session_id: string;
                    rating: number;
                    comment?: string | null;
                    metadata?: Record<string, unknown> | null;
                };
                Update: {
                    id?: string;
                    created_at?: string;
                    user_id?: string;
                    session_id?: string;
                    rating?: number;
                    comment?: string | null;
                    metadata?: Record<string, unknown> | null;
                };
            };
            resources: {
                Row: {
                    id: string;
                    created_at: string;
                    updated_at: string;
                    title: string;
                    description: string;
                    type: string;
                    url: string | null;
                    content: string | null;
                    metadata: Record<string, unknown> | null;
                };
                Insert: {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                    title: string;
                    description: string;
                    type: string;
                    url?: string | null;
                    content?: string | null;
                    metadata?: Record<string, unknown> | null;
                };
                Update: {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                    title?: string;
                    description?: string;
                    type?: string;
                    url?: string | null;
                    content?: string | null;
                    metadata?: Record<string, unknown> | null;
                };
            };
            settings: {
                Row: {
                    id: string;
                    created_at: string;
                    updated_at: string;
                    user_id: string;
                    key: string;
                    value: unknown;
                    metadata: Record<string, unknown> | null;
                };
                Insert: {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                    user_id: string;
                    key: string;
                    value: unknown;
                    metadata?: Record<string, unknown> | null;
                };
                Update: {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                    user_id?: string;
                    key?: string;
                    value?: unknown;
                    metadata?: Record<string, unknown> | null;
                };
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            [_ in never]: never;
        };
        Enums: {
            [_ in never]: never;
        };
    };
}

// Helper type to get table types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
