import { EmailTrackingService } from '../email-tracking';
import { supabase } from '@/lib/supabaseClient';

// Mock Supabase client
jest.mock('@/lib/supabaseclient', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ error: null }),
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

describe('EmailTrackingService', () => {
  const mockEvent = {
    email_id: '123',
    recipient: 'test@example.com',
    user_agent: 'test-agent',
    ip_address: '127.0.0.1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trackEvent', () => {
    it('should successfully track an email event', async () => {
      await EmailTrackingService.trackEvent({
        ...mockEvent,
        type: 'sent',
      });

      expect(supabase.from).toHaveBeenCalledWith('email_events');
      expect(supabase.from('email_events').insert).toHaveBeenCalledWith([
        expect.objectContaining({
          email_id: mockEvent.email_id,
          type: 'sent',
          recipient: mockEvent.recipient,
        }),
      ]);
    });

    it('should handle errors when tracking fails', async () => {
      const mockError = new Error('Database error');
      jest.spyOn(supabase, 'from').mockImplementationOnce(() => ({
        insert: jest.fn().mockResolvedValue({ error: mockError }),
      }));

      await expect(
        EmailTrackingService.trackEvent({
          ...mockEvent,
          type: 'sent',
        })
      ).rejects.toThrow('Database error');
    });

    it('should set delivered_at timestamp for delivery events', async () => {
      await EmailTrackingService.trackEvent({
        ...mockEvent,
        type: 'delivered',
      });

      expect(supabase.from('email_events').insert).toHaveBeenCalledWith([
        expect.objectContaining({
          delivered_at: expect.any(String),
        }),
      ]);
    });
  });

  describe('trackOpen', () => {
    it('should track an email open event', async () => {
      await EmailTrackingService.trackOpen(
        mockEvent.email_id,
        mockEvent.recipient,
        mockEvent.user_agent,
        mockEvent.ip_address
      );

      expect(supabase.from('email_events').insert).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'opened',
          email_id: mockEvent.email_id,
          recipient: mockEvent.recipient,
          user_agent: mockEvent.user_agent,
          ip_address: mockEvent.ip_address,
        }),
      ]);
    });
  });

  describe('trackClick', () => {
    it('should track an email click event with URL', async () => {
      const url = 'https://example.com';
      await EmailTrackingService.trackClick(
        mockEvent.email_id,
        mockEvent.recipient,
        url,
        mockEvent.user_agent,
        mockEvent.ip_address
      );

      expect(supabase.from('email_events').insert).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'clicked',
          email_id: mockEvent.email_id,
          recipient: mockEvent.recipient,
          metadata: { url },
          user_agent: mockEvent.user_agent,
          ip_address: mockEvent.ip_address,
        }),
      ]);
    });
  });

  describe('getTrackingPixelUrl', () => {
    it('should generate correct tracking pixel URL', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
      const url = EmailTrackingService.getTrackingPixelUrl(
        mockEvent.email_id,
        mockEvent.recipient
      );

      expect(url).toBe(
        'https://app.example.com/api/email/track-open?email_id=123&recipient=test%40example.com'
      );
    });

    it('should handle missing base URL', () => {
      process.env.NEXT_PUBLIC_APP_URL = '';
      const url = EmailTrackingService.getTrackingPixelUrl(
        mockEvent.email_id,
        mockEvent.recipient
      );

      expect(url).toBe('/api/email/track-open?email_id=123&recipient=test%40example.com');
    });
  });

  describe('getTrackingUrl', () => {
    it('should generate correct tracking URL for clicks', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
      const originalUrl = 'https://example.com';
      const url = EmailTrackingService.getTrackingUrl(
        originalUrl,
        mockEvent.email_id,
        mockEvent.recipient
      );

      expect(url).toBe(
        'https://app.example.com/api/email/track-click?email_id=123&recipient=test%40example.com&url=https%3A%2F%2Fexample.com'
      );
    });
  });

  describe('trackDelivery', () => {
    it('should track email delivery', async () => {
      await EmailTrackingService.trackDelivery(
        mockEvent.email_id,
        mockEvent.recipient
      );

      expect(supabase.from('email_events').insert).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'delivered',
          email_id: mockEvent.email_id,
          recipient: mockEvent.recipient,
          delivered_at: expect.any(String),
        }),
      ]);
    });
  });

  describe('trackBounce', () => {
    it('should track email bounce with error message', async () => {
      const errorMessage = 'Invalid recipient';
      await EmailTrackingService.trackBounce(
        mockEvent.email_id,
        mockEvent.recipient,
        errorMessage
      );

      expect(supabase.from('email_events').insert).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'bounced',
          email_id: mockEvent.email_id,
          recipient: mockEvent.recipient,
          error_message: errorMessage,
        }),
      ]);
    });
  });

  describe('trackSpam', () => {
    it('should track spam report', async () => {
      await EmailTrackingService.trackSpam(
        mockEvent.email_id,
        mockEvent.recipient
      );

      expect(supabase.from('email_events').insert).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'spam',
          email_id: mockEvent.email_id,
          recipient: mockEvent.recipient,
        }),
      ]);
    });
  });
}); 