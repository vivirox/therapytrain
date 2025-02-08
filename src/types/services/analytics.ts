export interface AnalyticsEvent {
  type: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  data: Record<string, unknown>;
}

export interface AnalyticsService {
  trackEvent(event: AnalyticsEvent): Promise<void>;
  getEvents(userId: string, startDate: Date, endDate: Date): Promise<AnalyticsEvent[]>;
  getAggregatedMetrics(metric: string, startDate: Date, endDate: Date): Promise<Record<string, number>>;
}

export interface AnalyticsConfig {
  enabled: boolean;
  trackingId?: string;
  samplingRate?: number;
  customDimensions?: Record<string, string>;
} 