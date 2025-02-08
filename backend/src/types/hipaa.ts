import { Database } from '@/types/supabase';

export enum HIPAAEventType {
    PHI_ACCESS = 'PHI_ACCESS',
    PHI_MODIFICATION = 'PHI_MODIFICATION',
    AUTHENTICATION = 'AUTHENTICATION',
    SYSTEM = 'SYSTEM',
    EMERGENCY_ACCESS = 'EMERGENCY_ACCESS'
}

export enum HIPAAActionType {
    READ = 'READ',
    WRITE = 'WRITE',
    DELETE = 'DELETE',
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    EMERGENCY = 'EMERGENCY'
}

export interface HIPAAActor {
    id: string;
    role: string;
    ipAddress: string;
    userAgent?: string;
}

export interface HIPAAAction {
    type: HIPAAActionType;
    status: 'SUCCESS' | 'FAILURE';
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
    details: Record<string, any>;
}

export interface HIPAAQueryFilters {
    startDate?: Date;
    endDate?: Date;
    eventType?: HIPAAEventType;
    actorId?: string;
    resourceType?: string;
    status?: 'SUCCESS' | 'FAILURE';
}

export interface HIPAAComplianceReport {
    period: {
        start: Date;
        end: Date;
    };
    summary: {
        totalEvents: number;
        totalViolations: number;
        complianceScore: number;
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        phiAccessEvents: number;
        phiModificationEvents: number;
        authenticationEvents: number;
    };
    violations: Array<HIPAAAuditEvent>;
    recommendations: Array<string>;
}

export interface HIPAAAlertConfig {
    eventTypes: HIPAAEventType[];
    threshold: number;
    timeWindow: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    notificationChannels: string[];
} 