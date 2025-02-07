export enum HIPAAEventType {
    ADMINISTRATIVE = 'ADMINISTRATIVE',
    PHI_ACCESS = 'PHI_ACCESS',
    PHI_MODIFICATION = 'PHI_MODIFICATION',
    AUTHENTICATION = 'AUTHENTICATION',
    SYSTEM_OPERATION = 'SYSTEM_OPERATION',
    SECURITY_EVENT = 'SECURITY_EVENT'
}

export enum HIPAAActionType {
    CREATE = 'CREATE',
    READ = 'READ',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    EMERGENCY_ACCESS = 'EMERGENCY_ACCESS',
    EXPORT = 'EXPORT',
    IMPORT = 'IMPORT',
    ARCHIVE = 'ARCHIVE',
    RESTORE = 'RESTORE'
}

export type HIPAAActionStatus = 'SUCCESS' | 'FAILURE';

export interface HIPAAActor {
    id: string;
    role: string;
    ipAddress: string;
    userAgent?: string;
}

export interface HIPAAAction {
    type: HIPAAActionType;
    status: HIPAAActionStatus;
    details: Record<string, any>;
}

export interface HIPAAResource {
    type: 'SYSTEM' | 'PHI' | 'USER';
    id: string;
    description: string;
}

export interface HIPAAAuditEvent {
    id: string;
    eventType: HIPAAEventType;
    timestamp: Date;
    actor: HIPAAActor;
    action: HIPAAAction;
    resource: HIPAAResource;
    metadata?: Record<string, any>;
}

export interface HIPAAComplianceReport {
    id: string;
    startDate: Date;
    endDate: Date;
    summary: {
        totalEvents: number;
        totalViolations: number;
        complianceScore: number;
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        phiAccessEvents: number;
        phiModificationEvents: number;
        authenticationEvents: number;
    };
    violations: Array<{
        id: string;
        eventId: string;
        type: string;
        severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        description: string;
        timestamp: Date;
        actor: {
            id: string;
            role: string;
        };
        details: Record<string, any>;
    }>;
    recommendations: Array<{
        id: string;
        category: string;
        description: string;
        priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        suggestedActions: string[];
    }>;
    metadata?: Record<string, any>;
}

export interface HIPAAQueryFilters {
    startDate?: Date;
    endDate?: Date;
    eventTypes?: HIPAAEventType[];
    actionTypes?: HIPAAActionType[];
    actorIds?: string[];
    resourceTypes?: Array<'SYSTEM' | 'PHI' | 'USER'>;
    status?: Array<'SUCCESS' | 'FAILURE'>;
    limit?: number;
    offset?: number;
}

export interface HIPAAAlertConfig {
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    conditions: {
        eventType?: HIPAAEventType[];
        actionType?: HIPAAActionType[];
        threshold?: number;
        timeWindow?: number;
    };
    actions: {
        notify?: string[];
        block?: boolean;
        log?: boolean;
    };
} 