import { WebSocket } from 'ws';
import { SecuritySeverity } from './security';

export interface AuditEvent {
    id: string;
    eventType: string;
    userId: string;
    timestamp: Date;
    details: {
        action: string;
        resource: string;
        resourceId?: string;
        status: 'SUCCESS' | 'FAILURE';
        errorMessage?: string;
        changes?: Record<string, any>;
    };
    metadata?: {
        ipAddress?: string;
        userAgent?: string;
        sessionId?: string;
        location?: {
            country?: string;
            region?: string;
        };
    };
}

export interface ZKAuditMetrics {
    errorRate: number;
    cacheHitRate: number;
    averageProofTime: number;
    totalEvents: number;
    lastUpdated: Date;
}

export interface ZKAuditServiceInterface {
    initialize(): Promise<void>;
    cleanup(): Promise<void>;
    registerDashboardClient(client: WebSocket): void;
    recordAuditEvent(event: AuditEvent): Promise<void>;
    getHistoricalMetrics(startTime: Date, endTime: Date): Promise<AuditEvent[]>;
}

export interface SecurityAuditServiceInterface {
    recordEvent(eventType: string, details: Record<string, unknown>): Promise<void>;
    recordAlert(type: string, severity: SecuritySeverity, details: Record<string, unknown>): Promise<void>;
    recordAuthAttempt(userId: string, success: boolean, details: Record<string, unknown>): Promise<void>;
    logAccessPattern(userId: string, resourceType: string, resourceId: string): Promise<void>;
    logSessionEvent(sessionId: string, eventType: string, details: Record<string, unknown>): Promise<void>;
    logDataAccess(userId: string, dataType: string, accessType: string, details: Record<string, unknown>): Promise<void>;
    getAuditLogs(startTime: Date, endTime: Date, filters?: Record<string, unknown>): Promise<AuditEvent[]>;
}

export interface AuditEventBatch {
    events: AuditEvent[];
    timestamp: Date;
    metadata?: Record<string, unknown>;
}

export interface AuditEventFilter {
    eventType?: string | string[];
    startTime?: Date;
    endTime?: Date;
    userId?: string;
    severity?: SecuritySeverity;
    resourceType?: string;
    limit?: number;
    offset?: number;
}

export interface AuditLogOptions {
    batchSize?: number;
    flushInterval?: number;
    retryAttempts?: number;
    retryDelay?: number;
    persistLocally?: boolean;
    localStoragePath?: string;
}

export interface AuditLogFilters {
    startDate?: Date;
    endDate?: Date;
    eventType?: string;
    userId?: string;
    resourceType?: string;
    status?: 'SUCCESS' | 'FAILURE';
    limit?: number;
    offset?: number;
}

export interface AuditLogStats {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByStatus: {
        success: number;
        failure: number;
    };
    eventsByUser: Record<string, number>;
    eventsByResource: Record<string, number>;
    timeDistribution: {
        hourly: Record<string, number>;
        daily: Record<string, number>;
        weekly: Record<string, number>;
    };
}

export interface AuditLogExport {
    events: AuditEvent[];
    stats: AuditLogStats;
    metadata: {
        exportedAt: Date;
        exportedBy: string;
        filters?: AuditLogFilters;
    };
}

export interface AuditLogConfig {
    retentionPeriod: number;
    batchSize: number;
    flushInterval: number;
    exportFormat: 'JSON' | 'CSV';
    encryptionEnabled: boolean;
    compressionEnabled: boolean;
}

export interface AuditLogService {
    logEvent(event: AuditEvent): Promise<void>;
    queryEvents(filters: AuditLogFilters): Promise<AuditEvent[]>;
    getStats(filters?: AuditLogFilters): Promise<AuditLogStats>;
    exportLogs(filters?: AuditLogFilters): Promise<AuditLogExport>;
    purgeOldLogs(beforeDate: Date): Promise<void>;
    updateConfig(config: Partial<AuditLogConfig>): Promise<void>;
} 