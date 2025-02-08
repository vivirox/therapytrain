export enum SessionStatus {
    ACTIVE = 'active',
    PAUSED = 'paused',
    COMPLETED = 'completed'
}

export interface SessionMetadata {
    messageCount: number;
    lastActivity: Date;
    duration: number;
}

export interface Session {
    id: string;
    userId: string;
    status: SessionStatus;
    startTime: Date;
    endTime?: Date;
    metadata?: SessionMetadata;
    clients: Set<string>;
    data: Record<string, any>;
}

export interface SessionConfig {
    maxDuration?: number;
    maxClients?: number;
    autoSave?: boolean;
    autoSaveInterval?: number;
    encryption?: {
        enabled: boolean;
        algorithm?: string;
    };
}

export interface SessionStats {
    totalSessions: number;
    activeSessions: number;
    averageDuration: number;
    messageCount: number;
    clientCount: number;
}

export interface SessionFilter {
    userId?: string;
    status?: SessionStatus;
    startDate?: Date;
    endDate?: Date;
    minDuration?: number;
    maxDuration?: number;
} 