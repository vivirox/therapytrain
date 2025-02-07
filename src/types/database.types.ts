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
export type Json = string | number | boolean | null | {
    [key: string]: Json | undefined;
} | Json[];
export interface Database {
    public: {
        Tables: {
            audit_logs: {
                Row: AuditLog;
                Insert: Omit<AuditLog, '_id' | 'createdAt'>;
                Update: Partial<AuditLog>;
            };
            client_profiles: {
                Row: ClientProfile;
                Insert: Omit<ClientProfile, '_id' | 'createdAt' | 'updatedAt'>;
                Update: Partial<ClientProfile>;
            };
            sessions: {
                Row: Session;
                Insert: Omit<Session, '_id' | 'createdAt' | 'updatedAt'>;
                Update: Partial<Session>;
            };
            user_profiles: {
                Row: UserProfile;
                Insert: Omit<UserProfile, '_id' | 'createdAt' | 'updatedAt'>;
                Update: Partial<UserProfile>;
            };
        };
        Views: {};
        Functions: {};
        Enums: {};
        CompositeTypes: {};
    };
}
