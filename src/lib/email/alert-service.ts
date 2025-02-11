import { supabase } from '@/lib/supabaseclient';

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertType = 'bounce_rate' | 'spam_reports' | 'rapid_sending' | 'suspicious_pattern';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  details: Record<string, any>;
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  sender?: string;
}

export class AlertService {
  private static BOUNCE_RATE_WARNING = 0.03; // 3%
  private static BOUNCE_RATE_CRITICAL = 0.05; // 5%
  private static SPAM_REPORTS_WARNING = 0.01; // 1%
  private static SPAM_REPORTS_CRITICAL = 0.02; // 2%

  /**
   * Create a new alert
   */
  static async createAlert(
    type: AlertType,
    severity: AlertSeverity,
    message: string,
    details: Record<string, any>,
    sender?: string
  ): Promise<void> {
    try {
      const { error } = await supabase.from('alerts').insert([{
        type,
        severity,
        message,
        details,
        sender,
        created_at: new Date().toISOString(),
      }]);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to create alert:', err);
      throw err;
    }
  }

  /**
   * Check metrics and create alerts if thresholds are exceeded
   */
  static async checkMetricsAndAlert(sender: string): Promise<void> {
    const timeWindow = new Date();
    timeWindow.setHours(timeWindow.getHours() - 24); // Last 24 hours

    // Get total emails sent
    const { count: totalSent } = await supabase
      .from('email_events')
      .select('*', { count: 'exact' })
      .eq('type', 'sent')
      .eq('sender', sender)
      .gte('created_at', timeWindow.toISOString());

    if (!totalSent) return;

    // Check bounce rate
    const { count: bounces } = await supabase
      .from('email_events')
      .select('*', { count: 'exact' })
      .eq('type', 'bounced')
      .eq('sender', sender)
      .gte('created_at', timeWindow.toISOString());

    const bounceRate = bounces / totalSent;

    if (bounceRate >= this.BOUNCE_RATE_CRITICAL) {
      await this.createAlert(
        'bounce_rate',
        'critical',
        `Critical: High bounce rate detected (${(bounceRate * 100).toFixed(1)}%)`,
        { bounceRate, threshold: this.BOUNCE_RATE_CRITICAL },
        sender
      );
    } else if (bounceRate >= this.BOUNCE_RATE_WARNING) {
      await this.createAlert(
        'bounce_rate',
        'warning',
        `Warning: Elevated bounce rate (${(bounceRate * 100).toFixed(1)}%)`,
        { bounceRate, threshold: this.BOUNCE_RATE_WARNING },
        sender
      );
    }

    // Check spam reports
    const { count: spamReports } = await supabase
      .from('email_events')
      .select('*', { count: 'exact' })
      .eq('type', 'spam')
      .eq('sender', sender)
      .gte('created_at', timeWindow.toISOString());

    const spamRate = spamReports / totalSent;

    if (spamRate >= this.SPAM_REPORTS_CRITICAL) {
      await this.createAlert(
        'spam_reports',
        'critical',
        `Critical: High spam report rate (${(spamRate * 100).toFixed(1)}%)`,
        { spamRate, threshold: this.SPAM_REPORTS_CRITICAL },
        sender
      );
    } else if (spamRate >= this.SPAM_REPORTS_WARNING) {
      await this.createAlert(
        'spam_reports',
        'warning',
        `Warning: Elevated spam reports (${(spamRate * 100).toFixed(1)}%)`,
        { spamRate, threshold: this.SPAM_REPORTS_WARNING },
        sender
      );
    }
  }

  /**
   * Get active alerts for a sender
   */
  static async getActiveAlerts(sender?: string): Promise<Alert[]> {
    try {
      let query = supabase
        .from('alerts')
        .select('*')
        .is('resolved_at', null)
        .order('created_at', { ascending: false });

      if (sender) {
        query = query.eq('sender', sender);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      throw err;
    }
  }

  /**
   * Acknowledge an alert
   */
  static async acknowledgeAlert(alertId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ acknowledged_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
      throw err;
    }
  }

  /**
   * Resolve an alert
   */
  static async resolveAlert(alertId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to resolve alert:', err);
      throw err;
    }
  }
} 