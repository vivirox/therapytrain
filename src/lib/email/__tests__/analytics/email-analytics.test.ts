import { supabase } from '@/lib/supabaseClient';
import { EmailAnalyticsService } from '../../email-analytics';
import { PostgrestResponse } from '@supabase/supabase-js';

type MockResponse = Partial<PostgrestResponse<any>> & {
  data: any[];
  error: null;
  status: number;
  statusText: string;
  count: number | null;
};

// Mock Supabase client
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('EmailAnalyticsService', () => {
  const testPeriod = {
    startDate: '2024-01-01',
    endDate: '2024-01-31',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDeliveryMetrics', () => {
    it('should calculate correct delivery metrics', async () => {
      // Mock email events data
      const mockEvents = [
        { type: 'sent', count: 100 },
        { type: 'delivered', count: 95 },
        { type: 'bounced', count: 5 },
      ];

      // Setup mock response
      const mockSelect = jest.fn().mockResolvedValue({
        data: mockEvents,
        error: null,
        status: 200,
        statusText: 'OK',
        count: null,
      } as MockResponse);

      const mockChain = {
        select: mockSelect,
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const metrics = await EmailAnalyticsService.getDeliveryMetrics(testPeriod);

      expect(metrics).toEqual({
        totalSent: 100,
        delivered: 95,
        bounced: 5,
        deliveryRate: 0.95,
        bounceRate: 0.05,
      });

      expect(supabase.from).toHaveBeenCalledWith('email_events');
      expect(mockChain.gte).toHaveBeenCalledWith('created_at', testPeriod.startDate);
      expect(mockChain.lte).toHaveBeenCalledWith('created_at', testPeriod.endDate);
      expect(mockChain.in).toHaveBeenCalledWith('type', ['sent', 'delivered', 'bounced']);
      expect(mockSelect).toHaveBeenCalledWith('type, count');
    });

    it('should handle zero sent emails', async () => {
      const mockSelect = jest.fn().mockResolvedValue({
        data: [],
        error: null,
        status: 200,
        statusText: 'OK',
        count: null,
      } as MockResponse);

      const mockChain = {
        select: mockSelect,
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const metrics = await EmailAnalyticsService.getDeliveryMetrics(testPeriod);

      expect(metrics).toEqual({
        totalSent: 0,
        delivered: 0,
        bounced: 0,
        deliveryRate: 0,
        bounceRate: 0,
      });
    });
  });

  describe('getEngagementMetrics', () => {
    it('should calculate correct engagement metrics', async () => {
      // Mock email events data
      const mockEvents = [
        { type: 'delivered', count: 100 },
        { type: 'opened', count: 60 },
        { type: 'clicked', count: 30 },
      ];

      const mockSelect = jest.fn().mockResolvedValue({
        data: mockEvents,
        error: null,
        status: 200,
        statusText: 'OK',
        count: null,
      } as MockResponse);

      const mockChain = {
        select: mockSelect,
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const metrics = await EmailAnalyticsService.getEngagementMetrics(testPeriod);

      expect(metrics).toEqual({
        totalDelivered: 100,
        opened: 60,
        clicked: 30,
        openRate: 0.6,
        clickRate: 0.3,
        clickToOpenRate: 0.5,
      });
    });

    it('should handle zero delivered emails', async () => {
      const mockSelect = jest.fn().mockResolvedValue({
        data: [],
        error: null,
        status: 200,
        statusText: 'OK',
        count: null,
      } as MockResponse);

      const mockChain = {
        select: mockSelect,
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const metrics = await EmailAnalyticsService.getEngagementMetrics(testPeriod);

      expect(metrics).toEqual({
        totalDelivered: 0,
        opened: 0,
        clicked: 0,
        openRate: 0,
        clickRate: 0,
        clickToOpenRate: 0,
      });
    });
  });

  describe('getTimeBasedMetrics', () => {
    it('should calculate metrics by time period', async () => {
      const mockDailyData = [
        { date: '2024-01-01', sent: 50, delivered: 48, opened: 30, clicked: 15 },
        { date: '2024-01-02', sent: 60, delivered: 57, opened: 35, clicked: 20 },
      ];

      const mockSelect = jest.fn().mockResolvedValue({
        data: mockDailyData,
        error: null,
        status: 200,
        statusText: 'OK',
        count: null,
      } as MockResponse);

      const mockChain = {
        select: mockSelect,
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const metrics = await EmailAnalyticsService.getTimeBasedMetrics(testPeriod, 'daily');

      expect(metrics).toEqual({
        periods: [
          {
            date: '2024-01-01',
            metrics: {
              sent: 50,
              delivered: 48,
              opened: 30,
              clicked: 15,
              deliveryRate: 0.96,
              openRate: 0.625,
              clickRate: 0.3125,
            },
          },
          {
            date: '2024-01-02',
            metrics: {
              sent: 60,
              delivered: 57,
              opened: 35,
              clicked: 20,
              deliveryRate: 0.95,
              openRate: 0.614,
              clickRate: 0.351,
            },
          },
        ],
      });
    });
  });

  describe('getRecipientMetrics', () => {
    it('should calculate metrics by recipient domain', async () => {
      const mockDomainData = [
        { domain: 'example.com', sent: 100, delivered: 95, opened: 60, clicked: 30 },
        { domain: 'test.com', sent: 50, delivered: 48, opened: 25, clicked: 12 },
      ];

      const mockSelect = jest.fn().mockResolvedValue({
        data: mockDomainData,
        error: null,
        status: 200,
        statusText: 'OK',
        count: null,
      } as MockResponse);

      const mockChain = {
        select: mockSelect,
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const metrics = await EmailAnalyticsService.getRecipientMetrics(testPeriod);

      expect(metrics).toEqual({
        domains: [
          {
            domain: 'example.com',
            metrics: {
              sent: 100,
              delivered: 95,
              opened: 60,
              clicked: 30,
              deliveryRate: 0.95,
              openRate: 0.632,
              clickRate: 0.316,
            },
          },
          {
            domain: 'test.com',
            metrics: {
              sent: 50,
              delivered: 48,
              opened: 25,
              clicked: 12,
              deliveryRate: 0.96,
              openRate: 0.521,
              clickRate: 0.25,
            },
          },
        ],
      });
    });
  });
}); 