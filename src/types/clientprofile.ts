import { Database } from '@/database.types';

export interface ClientProfile {
    id: string;
    name: string;
    email: string;
    dateOfBirth: string;
    gender: string;
    primaryIssue: string;
    secondaryIssues: string[];
    goals: string[];
    preferences: {
        communicationStyle: string;
        interventionPreferences: string[];
        triggers: string[];
    };
    history: {
        previousTherapy: boolean;
        medications: string[];
        traumaHistory: boolean;
        substanceUse: boolean;
    };
    riskFactors: {
        suicidalIdeation: boolean;
        selfHarm: boolean;
        violence: boolean;
        substanceAbuse: boolean;
    };
    supportSystem: {
        familySupport: boolean;
        socialNetwork: boolean;
        communityResources: string[];
    };
    status: 'active' | 'inactive' | 'archived';
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, any>;
}

export interface ClientSession {
    id: string;
    clientId: string;
    therapistId: string;
    startTime: string;
    endTime?: string;
    status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
    notes?: string;
    interventions: Intervention[];
    metrics: SessionMetrics;
    feedback?: {
        clientFeedback?: string;
        therapistNotes?: string;
        rating?: number;
    };
}

export interface Intervention {
    id: string;
    type: string;
    description: string;
    startTime: string;
    endTime?: string;
    status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
    outcome?: string;
    effectiveness?: number;
    notes?: string;
}

export interface SessionMetrics {
    duration: number;
    interventionCount: number;
    clientEngagement: number;
    therapeuticAlliance: number;
    goalProgress: number;
    riskLevel: 'low' | 'medium' | 'high';
    emotionalState: {
        start: EmotionalState;
        end: EmotionalState;
    };
}

export interface EmotionalState {
    primaryEmotion: string;
    intensity: number;
    secondaryEmotions: string[];
    triggers?: string[];
    copingStrategies?: string[];
}

export interface Message {
    id: string;
    sessionId: string;
    senderId: string;
    recipientId: string;
    content: string;
    type: 'text' | 'system' | 'intervention' | 'feedback';
    timestamp: string;
    metadata?: {
        emotion?: string;
        intent?: string;
        interventionId?: string;
        isRedFlag?: boolean;
    };
} 