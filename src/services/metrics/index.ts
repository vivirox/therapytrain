export interface MetricValue {
  value: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface MetricConfig {
  name: string;
  description: string;
  unit: string;
  thresholds?: {
    warning: number;
    critical: number;
  };
  aggregation: 'sum' | 'average' | 'max' | 'min';
  retention: {
    raw: number;
    aggregated: number;
  };
}

export interface MetricReport {
  metricName: string;
  values: MetricValue[];
  summary: {
    min: number;
    max: number;
    average: number;
    total: number;
    count: number;
  };
  period: {
    start: Date;
    end: Date;
  };
  config: MetricConfig;
}

export interface MetricsService {
  recordMetric(name: string, value: number, metadata?: Record<string, unknown>): Promise<void>;
  getMetrics(name: string, startDate: Date, endDate: Date): Promise<MetricValue[]>;
  getReport(name: string, startDate: Date, endDate: Date): Promise<MetricReport>;
  listMetrics(): Promise<MetricConfig[]>;
  createMetric(config: MetricConfig): Promise<void>;
  deleteMetric(name: string): Promise<void>;
}

export * from '@/services/sessionanalytics';
export * from '@/services/interventionmetrics';
export * from '@/services/realtimeanalytics'; 