import type { AnalyticsEvent } from './analytics';

export interface RealtimeMetric {
  name: string;
  value: number;
  timestamp: Date;
  dimensions?: Record<string, string>;
}

export interface RealtimeAnalyticsService {
  trackMetric(metric: RealtimeMetric): Promise<void>;
  subscribeToMetric(metricName: string, callback: (metric: RealtimeMetric) => void): () => void;
  getRealtimeEvents(): Promise<AnalyticsEvent[]>;
  getActiveUsers(): Promise<number>;
  getRealtimeMetrics(metricNames: string[]): Promise<RealtimeMetric[]>;
}

export interface RealtimeAnalyticsConfig {
  updateInterval: number;
  bufferSize: number;
  retentionPeriod: number;
  enableAggregation: boolean;
} 