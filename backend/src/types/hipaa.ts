export enum HIPAAEventType {
    ADMINISTRATIVE = 'ADMINISTRATIVE',
    PHI_ACCESS = 'PHI_ACCESS',
    PHI_MODIFICATION = 'PHI_MODIFICATION',
    SECURITY = 'SECURITY',
    USER_AUTHENTICATION = 'USER_AUTHENTICATION',
    SYSTEM_OPERATION = 'SYSTEM_OPERATION'
}

export enum HIPAAActionType {
    CREATE = 'CREATE',
    READ = 'READ',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    EMERGENCY_ACCESS = 'EMERGENCY_ACCESS'
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
    id?: string;
    eventType: HIPAAEventType;
    timestamp: Date;
    actor: HIPAAActor;
    action: HIPAAAction;
    resource: HIPAAResource;
    metadata?: Record<string, any>;
}

export interface HIPAAComplianceReport {
    startTime: Date;
    endTime: Date;
    summary: {
        totalEvents: number;
        totalViolations: number;
        complianceScore: number;
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    };
    events: HIPAAAuditEvent[];
    violations: HIPAAAuditEvent[];
    recommendations: string[];
}

export interface HIPAAQueryFilters {
    eventType?: HIPAAEventType;
    actionType?: HIPAAActionType;
    actorId?: string;
    patientId?: string;
    resourceId?: string;
    startTime?: Date;
    endTime?: Date;
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