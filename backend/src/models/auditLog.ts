export interface AuditLog {
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
