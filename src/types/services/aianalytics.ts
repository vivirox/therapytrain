import type { AnalyticsEvent } from './analytics';

export interface AIModelMetrics {
  modelId: string;
  timestamp: Date;
  requestLatency: number;
  tokenCount: number;
  promptTokens: number;
  completionTokens: number;
  totalCost: number;
  success: boolean;
  errorType?: string;
  errorMessage?: string;
}

export interface ModelPerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: number[][];
  latencyPercentiles: Record<string, number>;
}

export interface AIAnalyticsService {
  trackModelUsage(metrics: AIModelMetrics): Promise<void>;
  getModelMetrics(modelId: string, startDate: Date, endDate: Date): Promise<AIModelMetrics[]>;
  getPerformanceMetrics(modelId: string): Promise<ModelPerformanceMetrics>;
  trackModelEvent(event: AnalyticsEvent & { modelId: string }): Promise<void>;
  getModelCosts(startDate: Date, endDate: Date): Promise<Record<string, number>>;
}

export interface AIAnalyticsConfig {
  enableDetailedLogging: boolean;
  costTracking: boolean;
  performanceMonitoring: boolean;
  alertThresholds: {
    errorRate: number;
    latency: number;
    costPerDay: number;
  };
} 