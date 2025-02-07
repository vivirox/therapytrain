export enum AlertType {
  AUTH_FAILURE = 'AUTH_FAILURE',
  UNUSUAL_ACCESS = 'UNUSUAL_ACCESS',
  DATA_VIOLATION = 'DATA_VIOLATION',
  RATE_LIMIT_BREACH = 'RATE_LIMIT_BREACH',
  SYSTEM_HEALTH = 'SYSTEM_HEALTH'
}

export enum AlertSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface AlertHandler {
  handleAlert(alert: Alert): Promise<void>;
}

export interface NotificationConfig {
  email?: {
    recipients: string[];
    template?: string;
  };
  webhook?: {
    url: string;
    headers?: Record<string, string>;
  };
  slack?: {
    webhookUrl: string;
    channel?: string;
  };
}
