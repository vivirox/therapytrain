import { supabase } from '@/lib/supabaseClient';

export type EmailEventType = 'sent' | 'delivered' | 'bounced' | 'spam' | 'opened' | 'clicked';

interface EmailEvent {
  email_id: string;
  type: EmailEventType;
  recipient: string;
  metadata?: Record<string, any>;
  error_message?: string;
  user_agent?: string;
  ip_address?: string;
  geolocation?: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
}

export class EmailTrackingService {
  /**
   * Record an email event in the database
   */
  static async trackEvent(event: EmailEvent): Promise<void> {
    try {
      const { error } = await supabase.from('email_events').insert([
        {
          email_id: event.email_id,
          type: event.type,
          recipient: event.recipient,
          metadata: event.metadata || {},
          error_message: event.error_message,
          user_agent: event.user_agent,
          ip_address: event.ip_address,
          geolocation: event.geolocation,
          delivered_at: event.type === 'delivered' ? new Date().toISOString() : null,
        },
      ]);

      if (error) {
        console.error('Failed to track email event:', error);
        throw error;
      }
    } catch (err) {
      console.error('Error tracking email event:', err);
      throw err;
    }
  }

  /**
   * Generate a tracking pixel URL for email opens
   */
  static getTrackingPixelUrl(emailId: string, recipient: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const params = new URLSearchParams({
      email_id: emailId,
      recipient: recipient,
    });
    return `${baseUrl}/api/email/track-open?${params.toString()}`;
  }

  /**
   * Generate a tracking URL for email link clicks
   */
  static getTrackingUrl(originalUrl: string, emailId: string, recipient: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const params = new URLSearchParams({
      email_id: emailId,
      recipient: recipient,
      url: originalUrl,
    });
    return `${baseUrl}/api/email/track-click?${params.toString()}`;
  }

  /**
   * Track email open event
   */
  static async trackOpen(emailId: string, recipient: string, userAgent?: string, ipAddress?: string): Promise<void> {
    await this.trackEvent({
      email_id: emailId,
      type: 'opened',
      recipient,
      user_agent: userAgent,
      ip_address: ipAddress,
    });
  }

  /**
   * Track email click event
   */
  static async trackClick(emailId: string, recipient: string, url: string, userAgent?: string, ipAddress?: string): Promise<void> {
    await this.trackEvent({
      email_id: emailId,
      type: 'clicked',
      recipient,
      metadata: { url },
      user_agent: userAgent,
      ip_address: ipAddress,
    });
  }

  /**
   * Track email delivery event
   */
  static async trackDelivery(emailId: string, recipient: string): Promise<void> {
    await this.trackEvent({
      email_id: emailId,
      type: 'delivered',
      recipient,
    });
  }

  /**
   * Track email bounce event
   */
  static async trackBounce(emailId: string, recipient: string, error: string): Promise<void> {
    await this.trackEvent({
      email_id: emailId,
      type: 'bounced',
      recipient,
      error_message: error,
    });
  }

  /**
   * Track spam report event
   */
  static async trackSpam(emailId: string, recipient: string): Promise<void> {
    await this.trackEvent({
      email_id: emailId,
      type: 'spam',
      recipient,
    });
  }
} 