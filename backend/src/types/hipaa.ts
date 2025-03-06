export enum HIPAAEventType {
  SYSTEM = "SYSTEM",
  ADMINISTRATIVE = "ADMINISTRATIVE",
  ACCESS = "ACCESS",
  SECURITY = "SECURITY",
  SYSTEM_OPERATION = "SYSTEM_OPERATION",
  PHI_ACCESS = "PHI_ACCESS",
  PHI_MODIFICATION = "PHI_MODIFICATION",
  AUTHENTICATION = "AUTHENTICATION",
}

export enum HIPAAActionType {
  CREATE = "CREATE",
  READ = "READ",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  LOGIN = "LOGIN",
  EMERGENCY_ACCESS = "EMERGENCY_ACCESS",
}

export interface HIPAAActor {
  id: string;
  role: string;
  ipAddress: string;
  userAgent?: string;
}

export interface HIPAAAction {
  type: HIPAAActionType;
  status: "SUCCESS" | "FAILURE";
  details: Record<string, any>;
}

export interface HIPAAResource {
  type: "SYSTEM" | "PHI" | "USER";
  id: string;
  description: string;
}

export interface HIPAAEvent {
  eventType: HIPAAEventType;
  timestamp: Date;
  actor: {
    id: string;
    role: string;
    ipAddress: string;
  };
  action: {
    type: HIPAAActionType;
    status: string;
    details: Record<string, unknown>;
  };
  resource: {
    type: string;
    id: string;
    description: string;
  };
}

export interface HIPAAQueryFilters {
  startDate?: Date;
  endDate?: Date;
  eventType?: HIPAAEventType;
  actorId?: string;
  resourceType?: string;
  status?: "SUCCESS" | "FAILURE";
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
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    phiAccessEvents: number;
    phiModificationEvents: number;
    authenticationEvents: number;
  };
  violations: Array<HIPAAEvent>;
  recommendations: Array<string>;
}

export interface HIPAAAlertConfig {
  eventTypes: HIPAAEventType[];
  threshold: number;
  timeWindow: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  notificationChannels: string[];
}
