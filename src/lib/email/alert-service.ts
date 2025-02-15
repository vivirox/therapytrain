import { supabase } from '@/lib/supabaseclient';

type AlertType = 'hipaa_violation' | 'security_breach' | 'system_error';
type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  metadata: Record<string, any>;
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  status: 'new' | 'acknowledged' | 'resolved';
}

export class AlertService {
  /**
   * Create a new alert
   */
  static async createAlert(
    type: AlertType,
    severity: AlertSeverity,
    message: string,
    metadata: Record<string, any>
  ): Promise<Alert> {
    const alert: Alert = {
      id: crypto.randomUUID(),
      type,
      severity,
      message,
      metadata,
      created_at: new Date().toISOString(),
      status: 'new'
    };

    try {
      // Store alert in database
      await supabase.from('alerts').insert([alert]);

      // Send email notification for high and critical alerts
      if (severity === 'high' || severity === 'critical') {
        await this.sendAlertEmail(alert);
      }

      // For critical alerts, also send SMS
      if (severity === 'critical') {
        await this.sendAlertSMS(alert);
      }

      return alert;
    } catch (error) {
      console.error('Failed to create alert:', error);
      throw error;
    }
  }

  /**
   * Send alert email
   */
  private static async sendAlertEmail(alert: Alert): Promise<void> {
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'alert',
          data: {
            alert_type: alert.type,
            severity: alert.severity,
            message: alert.message,
            metadata: alert.metadata,
            created_at: alert.created_at
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send alert email');
      }
    } catch (error) {
      console.error('Failed to send alert email:', error);
      // Don't throw here - we don't want to fail the entire alert creation
      // if email sending fails
    }
  }

  /**
   * Send alert SMS
   */
  private static async sendAlertSMS(alert: Alert): Promise<void> {
    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'alert',
          data: {
            alert_type: alert.type,
            severity: alert.severity,
            message: alert.message,
            created_at: alert.created_at
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send alert SMS');
      }
    } catch (error) {
      console.error('Failed to send alert SMS:', error);
      // Don't throw here - we don't want to fail the entire alert creation
      // if SMS sending fails
    }
  }

  /**
   * Acknowledge an alert
   */
  static async acknowledgeAlert(alertId: string): Promise<void> {
    try {
      await supabase
        .from('alerts')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      throw error;
    }
  }

  /**
   * Resolve an alert
   */
  static async resolveAlert(
    alertId: string,
    resolution_notes?: string
  ): Promise<void> {
    try {
      await supabase
        .from('alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          metadata: supabase.rpc('jsonb_set', {
            resolution_notes
          })
        })
        .eq('id', alertId);
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      throw error;
    }
  }

  /**
   * Get all active alerts
   */
  static async getActiveAlerts(): Promise<Alert[]> {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .in('status', ['new', 'acknowledged'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get active alerts:', error);
      throw error;
    }
  }

  /**
   * Get alerts by type
   */
  static async getAlertsByType(type: AlertType): Promise<Alert[]> {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('type', type)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get alerts by type:', error);
      throw error;
    }
  }
} 