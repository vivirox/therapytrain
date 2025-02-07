export type IncidentType = 
    | 'WEBAUTHN_VIOLATION'
    | 'AUTHENTICATION_FAILURE'
    | 'CSP_VIOLATION'
    | 'UNAUTHORIZED_ACCESS'
    | 'RATE_LIMIT_EXCEEDED'
    | 'SUSPICIOUS_ACTIVITY'
    | 'DATA_ACCESS_VIOLATION'
    | 'CONFIGURATION_ERROR';

export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface SecurityIncident {
    type: IncidentType;
    severity: SecuritySeverity;
    timestamp: Date;
    sourceIp: string;
    userId?: string;
    details: Record<string, unknown>;
    resolved: boolean;
}

export interface SecurityAlert {
    type: string;
    severity: SecuritySeverity;
    details: Record<string, unknown>;
    timestamp: Date;
}

export interface SecurityAuditLog {
    id: string;
    type: string;
    timestamp: Date;
    userId?: string;
    action: string;
    details: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

export interface SecurityConfig {
    maxLoginAttempts: number;
    lockoutDuration: number;
    passwordPolicy: {
        minLength: number;
        requireUppercase: boolean;
        requireLowercase: boolean;
        requireNumbers: boolean;
        requireSpecialChars: boolean;
        maxAge: number;
    };
    sessionConfig: {
        maxAge: number;
        secure: boolean;
        sameSite: boolean | 'lax' | 'strict' | 'none';
    };
    rateLimiting: {
        windowMs: number;
        maxRequests: number;
    };
} 