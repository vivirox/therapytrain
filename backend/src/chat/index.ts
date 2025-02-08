import { User } from '@/config/supabase';
import { EmotionState } from '@/emotions';

export interface Message {
    id: string;
    sessionId: string;
    senderId: string;
    content: string;
    timestamp: Date;
    type: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
    metadata?: {
        emotion?: EmotionState;
        attachments?: string[];
        mentions?: string[];
        replyTo?: string;
        edited?: boolean;
        deletedAt?: Date;
    };
}

export interface ChatSession {
    id: string;
    participants: User[];
    startTime: Date;
    endTime?: Date;
    status: 'ACTIVE' | 'PAUSED' | 'ENDED';
    type: 'INDIVIDUAL' | 'GROUP' | 'SYSTEM';
    metadata?: {
        title?: string;
        description?: string;
        tags?: string[];
        customData?: Record<string, any>;
    };
}

export interface ChatConfig {
    maxMessageLength: number;
    allowedFileTypes: string[];
    maxFileSize: number;
    retentionPeriod: number;
    features: {
        encryption: boolean;
        fileSharing: boolean;
        emotionDetection: boolean;
        translation: boolean;
    };
}

export interface ChatEvent {
    type: 'MESSAGE_SENT' | 'MESSAGE_EDITED' | 'MESSAGE_DELETED' | 'SESSION_STARTED' | 'SESSION_ENDED';
    sessionId: string;
    userId: string;
    timestamp: Date;
    data: any;
    metadata?: Record<string, any>;
}

export interface ChatFilter {
    startDate?: Date;
    endDate?: Date;
    participants?: string[];
    status?: ChatSession['status'];
    type?: ChatSession['type'];
    limit?: number;
    offset?: number;
}

export interface ChatStats {
    totalSessions: number;
    activeSessions: number;
    messageCount: number;
    averageSessionDuration: number;
    participantStats: {
        totalParticipants: number;
        activeParticipants: number;
        averageMessagesPerParticipant: number;
    };
    emotionStats: {
        positive: number;
        negative: number;
        neutral: number;
    };
}

// Re-export chat-related implementations
export * from './chatManager';
export * from './messageHandler';
export * from './sessionManager';
export * from './emotionDetector'; 