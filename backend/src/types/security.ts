export interface SecurityIncident {
  id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  timestamp: Date;
  sourceIp: string;
  userId?: string;
  details: Record<string, unknown>;
  resolved: boolean;
  resolutionDetails?: {
    resolvedBy: string;
    resolvedAt: Date;
    resolution: string;
    notes?: string;
  };
  metadata?: Record<string, unknown>;
}

export enum IncidentType {
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  BRUTE_FORCE = 'BRUTE_FORCE',
  DATA_LEAK = 'DATA_LEAK',
  MALWARE = 'MALWARE',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  POLICY_VIOLATION = 'POLICY_VIOLATION',
  SYSTEM_ERROR = 'SYSTEM_ERROR'
}

export enum IncidentSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: Date;
  sourceIp: string;
  userId?: string;
  details: Record<string, unknown>;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  metadata?: Record<string, unknown>;
}

export enum AlertType {
  SECURITY = 'SECURITY',
  PERFORMANCE = 'PERFORMANCE',
  AVAILABILITY = 'AVAILABILITY',
  COMPLIANCE = 'COMPLIANCE',
  SYSTEM = 'SYSTEM'
}

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export interface AlertHandler {
  handleAlert(alert: Alert): Promise<void>;
  canHandle(alert: Alert): boolean;
}

export interface NotificationConfig {
  enabled: boolean;
  channels: Array<{
    type: 'email' | 'sms' | 'slack' | 'webhook';
    config: Record<string, unknown>;
  }>;
  filters: {
    minSeverity: AlertSeverity;
    types?: AlertType[];
    excludeTypes?: AlertType[];
  };
  throttling?: {
    maxPerMinute: number;
    maxPerHour: number;
    cooldownPeriod: number;
  };
  templates?: Record<string, string>;
}

export interface SecurityHeaders {
  'Content-Security-Policy': string;
  'Strict-Transport-Security': string;
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'X-XSS-Protection': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
}

export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH';

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