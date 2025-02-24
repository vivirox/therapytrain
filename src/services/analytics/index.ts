import {
  AnalyticsEvent,
  AnalyticsFilter,
  AnalyticsReport,
  LearningAnalytics,
  SessionAnalytics,
  UserAnalytics
} from '@/types';

export class AnalyticsService {
  private static instance: AnalyticsService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  public static async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const instance = AnalyticsService.getInstance();
      await fetch(`${instance.baseUrl}/api/analytics/events`, {
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

  public static async getMetrics(userId: string, startDate?: number, endDate?: number): Promise<LearningAnalytics> {
    try {
      const instance = AnalyticsService.getInstance();
      const response = await fetch(
        `${instance.baseUrl}/api/analytics/metrics?userId=${userId}${startDate ? `&startDate=${startDate}` : ''}${endDate ? `&endDate=${endDate}` : ''}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching analytics metrics:', error);
      throw error;
    }
  }

  public static async generateReport(filter: AnalyticsFilter): Promise<AnalyticsReport> {
    try {
      const instance = AnalyticsService.getInstance();
      const queryParams = new URLSearchParams();
      
      if (filter.startDate) queryParams.append('startDate', filter.startDate.toString());
      if (filter.endDate) queryParams.append('endDate', filter.endDate.toString());
      if (filter.userId) queryParams.append('userId', filter.userId);
      if (filter.eventTypes) filter.eventTypes.forEach((type: any) => queryParams.append('eventTypes[]', type));
      if (filter.metrics) filter.metrics.forEach((metric: any) => queryParams.append('metrics[]', metric));

      const response = await fetch(
        `${instance.baseUrl}/api/analytics/report?${queryParams.toString()}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating analytics report:', error);
      throw error;
    }
  }

  public static async getUserAnalytics(userId: string): Promise<UserAnalytics> {
    try {
      const instance = AnalyticsService.getInstance();
      const response = await fetch(
        `${instance.baseUrl}/api/analytics/users/${userId}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch user analytics');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      throw error;
    }
  }

  public static async getSessionAnalytics(sessionId: string): Promise<SessionAnalytics> {
    try {
      const instance = AnalyticsService.getInstance();
      const response = await fetch(
        `${instance.baseUrl}/api/analytics/sessions/${sessionId}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch session analytics');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching session analytics:', error);
      throw error;
    }
  }

  public static async trackTutorialProgress(
    userId: string,
    tutorialId: string,
    progress: number,
    data?: Record<string, unknown>
  ): Promise<void> {
    await AnalyticsService.trackEvent({
      type: 'tutorial_progress',
      userId,
      timestamp: Date.now(),
      data: {
        tutorialId,
        progress,
        ...data
      }
    });
  }

  public static async trackResourceEngagement(
    userId: string,
    resourceId: string,
    resourceType: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    await AnalyticsService.trackEvent({
      type: 'resource_engagement',
      userId,
      timestamp: Date.now(),
      data: {
        resourceId,
        resourceType,
        ...data
      }
    });
  }
} 