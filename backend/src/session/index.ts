import { User } from '@/config/supabase';
import { EmotionState } from '@/emotions';
import { Message } from '@/chat';

export interface Session {
    id: string;
    type: 'THERAPY' | 'COACHING' | 'SUPPORT' | 'ASSESSMENT';
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    participants: {
        userId: string;
        role: 'THERAPIST' | 'CLIENT' | 'OBSERVER';
        user: User;
        joinedAt: Date;
        leftAt?: Date;
    }[];
    schedule: {
        startTime: Date;
        endTime?: Date;
        duration: number;
        timezone: string;
    };
    metadata?: {
        title?: string;
        description?: string;
        tags?: string[];
        notes?: string;
    };
}

export interface SessionConfig {
    privacy: {
        recordingEnabled: boolean;
        transcriptEnabled: boolean;
        analyticsEnabled: boolean;
    };
    interaction: {
        chatEnabled: boolean;
        videoEnabled: boolean;
        fileShareEnabled: boolean;
        drawingEnabled: boolean;
    };
    notifications: {
        reminders: boolean;
        followups: boolean;
        summaries: boolean;
    };
    security: {
        encryptionEnabled: boolean;
        authRequired: boolean;
        ipRestrictions?: string[];
    };
}

export interface SessionEvent {
    id: string;
    sessionId: string;
    type: 'JOIN' | 'LEAVE' | 'MESSAGE' | 'EMOTION' | 'INTERVENTION' | 'SYSTEM';
    timestamp: Date;
    userId: string;
    data: any;
    metadata?: {
        emotion?: EmotionState;
        context?: string;
        importance?: number;
    };
}

export interface SessionSummary {
    sessionId: string;
    duration: number;
    participants: {
        userId: string;
        role: string;
        engagement: number;
        emotionalJourney: EmotionState[];
    }[];
    topics: {
        name: string;
        duration: number;
        sentiment: number;
    }[];
    interventions: {
        type: string;
        timestamp: Date;
        effectiveness: number;
    }[];
    outcomes: {
        goals: {
            description: string;
            achieved: boolean;
            progress: number;
        }[];
        recommendations: string[];
        followupActions: string[];
    };
}

export interface SessionAnalytics {
    metrics: {
        duration: number;
        messageCount: number;
        responseTime: number;
        engagementScore: number;
    };
    emotions: {
        distribution: Record<string, number>;
        transitions: {
            from: string;
            to: string;
            count: number;
        }[];
        triggers: {
            emotion: string;
            cause: string;
            frequency: number;
        }[];
    };
    content: {
        topics: string[];
        keywords: string[];
        sentiments: Record<string, number>;
    };
    interventions: {
        total: number;
        successful: number;
        types: Record<string, number>;
        timing: {
            emotion: string;
            delay: number;
            effectiveness: number;
        }[];
    };
}

export interface SessionFeedback {
    sessionId: string;
    userId: string;
    rating: number;
    categories: {
        name: string;
        rating: number;
        comment?: string;
    }[];
    improvements: string[];
    highlights: string[];
    willReturn: boolean;
    metadata?: {
        submittedAt: Date;
        emotion?: EmotionState;
        device?: string;
    };
}

// Re-export session-related implementations
export * from './sessionManager';
export * from './sessionAnalyzer';
export * from './feedbackCollector';
export * from './summaryGenerator'; 