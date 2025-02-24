import { BaseEntity, Metadata } from './common';

export interface HIPAAEvent extends BaseEntity {
  type: HIPAAEventType;
  action: HIPAAActionType;
  user_id: string;
  resource_id: string;
  resource_type: string;
  details: Record<string, unknown>;
  status: 'success' | 'failure';
  metadata?: Metadata;
}

export type HIPAAEventType =
  | 'phi_access'
  | 'phi_modification'
  | 'phi_deletion'
  | 'phi_export'
  | 'authentication'
  | 'authorization'
  | 'security_incident'
  | 'policy_change'
  | 'system_access'
  | 'data_backup'
  | 'emergency_access';

export type HIPAAActionType =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'export'
  | 'import'
  | 'share'
  | 'print'
  | 'download'
  | 'upload'
  | 'access_granted'
  | 'access_denied'
  | 'login'
  | 'logout'
  | 'password_change'
  | 'policy_update'
  | 'system_update';

export interface HIPAAComplianceReport {
  id: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    total_events: number;
    violations: number;
    incidents: number;
    compliance_score: number;
  };
  events: {
    by_type: Record<string, number>;
    by_action: Record<string, number>;
    by_status: Record<string, number>;
  };
  violations: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    count: number;
  }>;
  recommendations: Array<{
    category: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    status: 'pending' | 'in_progress' | 'completed';
  }>;
  metadata?: Metadata;
}

export interface HIPAAPolicy {
  id: string;
  name: string;
  description: string;
  type: HIPAAPolicyType;
  rules: Array<{
    id: string;
    description: string;
    conditions: Array<{
      field: string;
      operator: string;
      value: unknown;
    }>;
    actions: Array<{
      type: string;
      params: Record<string, unknown>;
    }>;
    enabled: boolean;
  }>;
  version: string;
  effective_date: string;
  review_date: string;
  metadata?: Metadata;
}

export type HIPAAPolicyType =
  | 'access_control'
  | 'audit_logging'
  | 'data_encryption'
  | 'backup_recovery'
  | 'incident_response'
  | 'business_associates'
  | 'training_awareness'
  | 'device_media'
  | 'facility_access'
  | 'workstation_security';

export interface HIPAAQueryFilters {
  type?: HIPAAEventType;
  action?: HIPAAActionType;
  user_id?: string;
  resource_id?: string;
  resource_type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  metadata?: Record<string, unknown>;
}

export interface HIPAAManager {
  logEvent: (event: Omit<HIPAAEvent, 'id' | 'created_at'>) => Promise<HIPAAEvent>;
  getEvent: (event_id: string) => Promise<HIPAAEvent>;
  getEvents: (filters: HIPAAQueryFilters) => Promise<HIPAAEvent[]>;
  generateReport: (period: { start: string; end: string }) => Promise<HIPAAComplianceReport>;
  createPolicy: (policy: Omit<HIPAAPolicy, 'id'>) => Promise<HIPAAPolicy>;
  updatePolicy: (policy_id: string, updates: Partial<HIPAAPolicy>) => Promise<HIPAAPolicy>;
  getPolicies: () => Promise<HIPAAPolicy[]>;
  validateCompliance: (resource_type: string, action: HIPAAActionType) => Promise<{
    compliant: boolean;
    violations: Array<{
      policy_id: string;
      rule_id: string;
      description: string;
    }>;
  }>;
} 