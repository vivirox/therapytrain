import { EventEmitter } from 'events';
import type { 
  AnalyticsEvent,
  AnalyticsConfig,
  LearningAnalytics,
  PerformanceMetrics,
  AIModelMetrics,
  RealTimeMetrics
} from '@/types/services/analytics';

export class AnalyticsService extends EventEmitter {
  private static instance: AnalyticsService;
  private readonly baseUrl: string;
  private readonly config: AnalyticsConfig;

  private constructor() {
    super();
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    this.config = {
      enabled: true,
      samplingRate: 1.0,
      customDimensions: {}
    };
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  public async trackEvent(event: AnalyticsEvent): Promise<void> {
    if (!this.config.enabled) return;

    try {
      await fetch(`${this.baseUrl}/api/analytics/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error('Error tracking analytics event:', error);
    }
  }

  public async getEvents(userId: string, startDate: Date, endDate: Date): Promise<AnalyticsEvent[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/analytics/events?userId=${userId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics events');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching analytics events:', error);
      return [];
    }
  }

  public async getAggregatedMetrics(metric: string, startDate: Date, endDate: Date): Promise<Record<string, number>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/analytics/metrics/${metric}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch aggregated metrics');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching aggregated metrics:', error);
      return {};
    }
  }

  public getConfig(): AnalyticsConfig {
    return this.config;
  }

  public updateConfig(config: Partial<AnalyticsConfig>): void {
    Object.assign(this.config, config);
  }
}

export const analyticsService = AnalyticsService.getInstance(); 