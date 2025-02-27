import { dataService } from '@/lib/data';
import { logger } from '@/lib/logger';

export interface AnalyticsEvent {
  type: string;
  timestamp: Date;
  data: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

export class AnalyticsService {
  private static instance: AnalyticsService;

  private constructor() {}

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      await dataService.create('analytics_events', {
        ...event,
        timestamp: event.timestamp.toISOString(),
      });
      logger.info('Analytics event tracked', { event });
    } catch (error) {
      logger.error('Failed to track analytics event', { event, error });
      throw error;
    }
  }

  async getEvents(filter: Partial<AnalyticsEvent>): Promise<AnalyticsEvent[]> {
    try {
      const events = await dataService.list('analytics_events', filter);
      return events.map(event => ({
        ...event,
        timestamp: new Date(event.timestamp),
      }));
    } catch (error) {
      logger.error('Failed to get analytics events', { filter, error });
      throw error;
    }
  }
}

export const analyticsService = AnalyticsService.getInstance(); 