import { HIPAAEventType, HIPAAActionType } from '@/hipaa'
import { BaseEntity, Metadata } from './common'

export type SecurityEventType = 
  | 'SECURITY_INCIDENT'
  | 'HIPAA_VIOLATION'
  | 'UNAUTHORIZED_ACCESS'
  | 'AUTHENTICATION_FAILURE'
  | 'SUSPICIOUS_ACTIVITY'
  | 'DATA_BREACH'
  | 'COMPLIANCE_VIOLATION'
  | 'PHI_ACCESS'
  | 'SYSTEM_ALERT'
  | 'AUDIT_ALERT'

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical'

export interface SecurityEvent {
  id?: string
  type: SecurityEventType
  timestamp: string
  severity: SecuritySeverity
  userId?: string
  resourceId?: string
  resourceType?: string
  description: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  location?: {
    country?: string
    region?: string
    city?: string
  }
  resolution?: {
    status: 'open' | 'in_progress' | 'resolved' | 'dismissed'
    resolvedBy?: string
    resolvedAt?: string
    notes?: string
  }
}

export interface SecurityMetrics {
  totalEvents: number
  openIncidents: number
  resolvedIncidents: number
  averageResolutionTime: number
  severityDistribution: {
    low: number
    medium: number
    high: number
    critical: number
  }
  typeDistribution: Record<SecurityEventType, number>
  riskScore: number
  complianceScore: number
}

export interface SecurityFilter {
  startDate?: Date
  endDate?: Date
  eventTypes?: SecurityEventType[]
  severity?: SecuritySeverity[]
  userId?: string
  resourceId?: string
  resourceType?: string
  status?: 'open' | 'in_progress' | 'resolved' | 'dismissed'
}

export interface SecurityConfig {
  maxLoginAttempts: number
  passwordExpiryDays: number
  mfaRequired: boolean
  sessionTimeoutMinutes: number
  ipWhitelist?: string[]
  auditLogRetentionDays: number
  encryptionAlgorithm: string
  minimumPasswordLength: number
  passwordRequirements: {
    uppercase: boolean
    lowercase: boolean
    numbers: boolean
    specialCharacters: boolean
  }
}

export interface SecurityIncident extends BaseEntity {
  type: IncidentType
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'investigating' | 'resolved' | 'closed'
  source: {
    ip: string
    user_agent?: string
    location?: {
      country?: string
      region?: string
      city?: string
    }
  }
  details: Record<string, unknown>
  resolution?: {
    action: string
    timestamp: string
    notes?: string
  }
  metadata?: Metadata
}

export type IncidentType =
  | 'unauthorized_access'
  | 'data_breach'
  | 'suspicious_activity'
  | 'policy_violation'
  | 'system_compromise'
  | 'malware_detected'
  | 'ddos_attack'
  | 'configuration_error'

export interface SecurityAlert {
  id: string
  type: SecurityEventType
  severity: SecuritySeverity
  timestamp: string
  message: string
  source: string
  metadata?: Record<string, any>
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: string
}

export interface SecurityReport {
  id: string
  type: 'incident' | 'audit' | 'compliance'
  period: {
    start: string
    end: string
  }
  metrics: SecurityMetrics
  incidents: SecurityIncident[]
  alerts: SecurityAlert[]
  recommendations: Array<{
    priority: 'low' | 'medium' | 'high'
    description: string
    impact: string
    implementation: string
  }>
  complianceStatus: {
    hipaa: boolean
    gdpr: boolean
    hitech: boolean
    pci?: boolean
  }
  generatedAt: string
  generatedBy: string
}

export interface EncryptedData {
  data: string
  iv: string
  tag: string
  algorithm: string
}

export interface SecurityAuditEntry {
  id: string
  timestamp: string
  userId?: string
  action: string
  resource: {
    type: string
    id: string
  }
  changes?: {
    before: Record<string, any>
    after: Record<string, any>
  }
  metadata?: Record<string, any>
}

export interface SecurityPolicy {
  id: string
  name: string
  description: string
  type: PolicyType
  rules: SecurityRule[]
  enabled: boolean
  created_at: string
  updated_at: string
  metadata?: Metadata
}

export type PolicyType =
  | 'access_control'
  | 'data_protection'
  | 'authentication'
  | 'network_security'
  | 'incident_response'
  | 'compliance'

export interface SecurityRule {
  id: string
  policy_id: string
  name: string
  description: string
  conditions: Array<{
    field: string
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than'
    value: unknown
  }>
  actions: Array<{
    type: string
    params: Record<string, unknown>
  }>
  enabled: boolean
  priority: number
  metadata?: Metadata
}

export interface SecurityAudit {
  id: string
  type: AuditType
  user_id?: string
  resource_id?: string
  resource_type?: string
  action: string
  status: 'success' | 'failure'
  details: Record<string, unknown>
  timestamp: string
  metadata?: Metadata
}

export type AuditType =
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'configuration_change'
  | 'security_alert'
  | 'policy_change'

export interface SecurityManager {
  reportIncident: (incident: Omit<SecurityIncident, 'id' | 'created_at'>) => Promise<SecurityIncident>
  getIncident: (incident_id: string) => Promise<SecurityIncident>
  updateIncident: (incident_id: string, updates: Partial<SecurityIncident>) => Promise<SecurityIncident>
  getIncidents: (options?: {
    type?: IncidentType
    severity?: string
    status?: string
    start_date?: string
    end_date?: string
  }) => Promise<SecurityIncident[]>
  createPolicy: (policy: Omit<SecurityPolicy, 'id' | 'created_at' | 'updated_at'>) => Promise<SecurityPolicy>
  updatePolicy: (policy_id: string, updates: Partial<SecurityPolicy>) => Promise<SecurityPolicy>
  getPolicies: () => Promise<SecurityPolicy[]>
  createAudit: (audit: Omit<SecurityAudit, 'id' | 'timestamp'>) => Promise<SecurityAudit>
  getAudits: (options?: {
    type?: AuditType
    user_id?: string
    resource_id?: string
    start_date?: string
    end_date?: string
  }) => Promise<SecurityAudit[]>
  getMetrics: () => Promise<SecurityMetrics>
} 