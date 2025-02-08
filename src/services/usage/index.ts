export interface UsageMetrics {
  totalSessions: number;
  totalMessages: number;
  totalDuration: number;
  activeUsers: number;
  averageSessionDuration: number;
  peakConcurrentUsers: number;
  timestamp: Date;
}

export interface UsageData {
  userId: string;
  sessionCount: number;
  messageCount: number;
  totalDuration: number;
  lastActivity: Date;
  features: {
    name: string;
    usageCount: number;
    lastUsed: Date;
  }[];
  metadata?: Record<string, unknown>;
}

export interface UsageConfig {
  trackingEnabled: boolean;
  retentionPeriod: number;
  aggregationInterval: number;
  samplingRate: number;
  features: {
    name: string;
    enabled: boolean;
    quota?: number;
    resetPeriod?: 'daily' | 'weekly' | 'monthly';
  }[];
}

export interface UsageStatus {
  quotaUsed: number;
  quotaLimit: number;
  quotaResetDate: Date;
  isLimited: boolean;
  features: {
    name: string;
    enabled: boolean;
    usage: number;
    limit?: number;
  }[];
}

export interface UsageService {
  trackUsage(userId: string, feature: string, metadata?: Record<string, unknown>): Promise<void>;
  getUsageMetrics(startDate: Date, endDate: Date): Promise<UsageMetrics>;
  getUserUsage(userId: string): Promise<UsageData>;
  checkQuota(userId: string, feature: string): Promise<boolean>;
  getUsageStatus(userId: string): Promise<UsageStatus>;
  updateConfig(config: Partial<UsageConfig>): Promise<void>;
}

export * from '@/services/analytics';
export * from '@/services/sessionanalytics';
export * from '@/services/realtimeanalytics'; 