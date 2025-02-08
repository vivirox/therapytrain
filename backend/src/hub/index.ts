import { User } from '@/config/supabase';
import { EmotionState } from '@/emotions';
import { Message } from '@/chat';

export interface Hub {
    id: string;
    name: string;
    description: string;
    type: 'SUPPORT' | 'LEARNING' | 'COMMUNITY' | 'PRIVATE';
    members: HubMember[];
    channels: Channel[];
    settings: HubSettings;
    metadata?: {
        createdAt: Date;
        updatedAt: Date;
        tags: string[];
        category: string;
    };
}

export interface HubMember {
    userId: string;
    user: User;
    role: 'ADMIN' | 'MODERATOR' | 'MEMBER' | 'GUEST';
    joinedAt: Date;
    status: 'ACTIVE' | 'INACTIVE' | 'BANNED';
    permissions: string[];
    metadata?: {
        notes?: string;
        badges?: string[];
        reputation?: number;
    };
}

export interface Channel {
    id: string;
    hubId: string;
    name: string;
    description: string;
    type: 'TEXT' | 'VOICE' | 'VIDEO' | 'ANNOUNCEMENT';
    visibility: 'PUBLIC' | 'PRIVATE' | 'RESTRICTED';
    members: string[]; // userIds
    messages: Message[];
    settings: ChannelSettings;
    metadata?: {
        topic?: string;
        lastActivity: Date;
        pinned?: Message[];
    };
}

export interface HubSettings {
    privacy: {
        joinType: 'OPEN' | 'INVITE' | 'REQUEST';
        visibility: 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
        memberList: 'PUBLIC' | 'MEMBERS_ONLY' | 'HIDDEN';
    };
    moderation: {
        autoMod: boolean;
        requiredApproval: boolean;
        wordFilter: string[];
        maxWarnings: number;
    };
    features: {
        voice: boolean;
        video: boolean;
        fileSharing: boolean;
        events: boolean;
    };
    limits: {
        members: number;
        channels: number;
        messageHistory: number;
        fileSize: number;
    };
}

export interface ChannelSettings {
    permissions: {
        sendMessages: string[];
        readMessages: string[];
        manageMessages: string[];
        manageChannel: string[];
    };
    moderation: {
        slowMode: number;
        memberOnly: boolean;
        requireApproval: boolean;
    };
    notifications: {
        mentions: boolean;
        all: boolean;
        none: boolean;
    };
    retention: {
        enabled: boolean;
        duration: number;
    };
}

export interface HubEvent {
    id: string;
    hubId: string;
    type: 'MEMBER_JOIN' | 'MEMBER_LEAVE' | 'MESSAGE' | 'MODERATION' | 'SETTINGS_CHANGE';
    userId: string;
    timestamp: Date;
    data: any;
    metadata?: {
        emotion?: EmotionState;
        location?: string;
        device?: string;
    };
}

export interface HubStats {
    members: {
        total: number;
        active: number;
        banned: number;
        roles: Record<string, number>;
    };
    messages: {
        total: number;
        today: number;
        channels: Record<string, number>;
    };
    activity: {
        peakHours: Record<string, number>;
        topContributors: {
            userId: string;
            messages: number;
            reactions: number;
        }[];
    };
    moderation: {
        warnings: number;
        bans: number;
        deletedMessages: number;
    };
}

// Re-export hub-related implementations
export * from './hubManager';
export * from './channelManager';
export * from './moderationService';
export * from './eventHandler'; 