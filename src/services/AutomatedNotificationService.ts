import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { WebClient } from '@slack/web-api';
import { EventEmitter } from 'events';
import { logger } from '@/lib/logger';

export type NotificationChannel = 'email' | 'slack' | 'sms' | 'webhook';
export type NotificationSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface NotificationTemplate {
  subject: string;
  body: string;
  channels: NotificationChannel[];
}

export interface NotificationConfig {
  enabled: boolean;
  channels: {
    email?: {
      enabled: boolean;
      recipients: string[];
      templates?: Record<string, string>;
    };
    slack?: {
      enabled: boolean;
      channel: string;
      templates?: Record<string, string>;
    };
    sms?: {
      enabled: boolean;
      numbers: string[];
      templates?: Record<string, string>;
    };
    webhook?: {
      enabled: boolean;
      url: string;
      headers?: Record<string, string>;
    };
  };
  throttling: {
    maxPerMinute: number;
    maxPerHour: number;
    cooldownPeriod: number;
  };
}

export interface Notification {
  id: string;
  type: string;
  severity: NotificationSeverity;
  message: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export class AutomatedNotificationService extends EventEmitter {
  private static instance: AutomatedNotificationService;
  private supabase;
  private emailTransport;
  private slackClient;
  private notificationHistory: Map<string, { count: number; lastSent: Date }>;
  private config: NotificationConfig;

  private constructor() {
    super();
    
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Initialize notification history
    this.notificationHistory = new Map();

    // Load initial configuration
    this.loadConfig().catch(error => {
      logger.error('Failed to load notification configuration', { error });
    });

    // Initialize email transport if configured
    if (process.env.SMTP_HOST) {
      this.emailTransport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }

    // Initialize Slack client if configured
    if (process.env.SLACK_TOKEN) {
      this.slackClient = new WebClient(process.env.SLACK_TOKEN);
    }

    // Start cleanup interval
    setInterval(() => this.cleanupHistory(), 3600000); // Clean up every hour
  }

  public static getInstance(): AutomatedNotificationService {
    if (!AutomatedNotificationService.instance) {
      AutomatedNotificationService.instance = new AutomatedNotificationService();
    }
    return AutomatedNotificationService.instance;
  }

  private async loadConfig(): Promise<void> {
    const { data, error } = await this.supabase
      .from('notification_config')
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    this.config = {
      enabled: data.enabled,
      channels: {
        email: {
          enabled: data.email_enabled,
          recipients: data.email_recipients,
        },
        slack: {
          enabled: data.slack_enabled,
          channel: data.slack_channel,
        },
      },
      throttling: {
        maxPerMinute: data.throttle_max_notifications,
        maxPerHour: data.throttle_max_notifications * 60,
        cooldownPeriod: data.throttle_window_ms,
      },
    };
  }

  public async notify(notification: Notification): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Notifications are disabled');
      return;
    }

    const key = `${notification.type}-${notification.severity}`;
    if (this.isThrottled(key)) {
      logger.info('Notification throttled', { key });
      return;
    }

    try {
      const promises: Promise<void>[] = [];

      // Email notifications
      if (this.shouldSendEmail(notification)) {
        promises.push(this.sendEmailNotification(notification));
      }

      // Slack notifications
      if (this.shouldSendSlack(notification)) {
        promises.push(this.sendSlackNotification(notification));
      }

      // SMS notifications
      if (this.shouldSendSMS(notification)) {
        promises.push(this.sendSMSNotification(notification));
      }

      // Webhook notifications
      if (this.shouldSendWebhook(notification)) {
        promises.push(this.sendWebhookNotification(notification));
      }

      await Promise.all(promises);
      this.updateNotificationHistory(key);
      
      // Record successful notification
      await this.supabase.from('notification_history').insert([{
        notification_id: notification.id,
        type: notification.type,
        severity: notification.severity,
        channels: promises.length,
        metadata: notification.metadata,
      }]);

      this.emit('notification:sent', notification);
    } catch (error) {
      logger.error('Failed to send notification', { notification, error });
      this.emit('notification:error', { notification, error });
      throw error;
    }
  }

  private shouldSendEmail(notification: Notification): boolean {
    return (
      this.config.channels.email?.enabled &&
      this.config.channels.email.recipients.length > 0 &&
      this.emailTransport !== undefined
    );
  }

  private shouldSendSlack(notification: Notification): boolean {
    return (
      this.config.channels.slack?.enabled &&
      this.config.channels.slack.channel !== undefined &&
      this.slackClient !== undefined
    );
  }

  private shouldSendSMS(notification: Notification): boolean {
    return (
      this.config.channels.sms?.enabled &&
      this.config.channels.sms.numbers.length > 0 &&
      notification.severity === 'critical'
    );
  }

  private shouldSendWebhook(notification: Notification): boolean {
    return (
      this.config.channels.webhook?.enabled &&
      this.config.channels.webhook.url !== undefined
    );
  }

  private async sendEmailNotification(notification: Notification): Promise<void> {
    if (!this.emailTransport || !this.config.channels.email?.recipients.length) {
      return;
    }

    const template = this.config.channels.email.templates?.[notification.type] || this.getDefaultEmailTemplate();
    const content = this.formatTemplate(template, notification);

    try {
      await this.emailTransport.sendMail({
        from: process.env.SMTP_FROM,
        to: this.config.channels.email.recipients.join(','),
        subject: `[${notification.severity.toUpperCase()}] ${notification.type}`,
        html: content,
      });
      logger.info('Email notification sent', { id: notification.id });
    } catch (error) {
      logger.error('Failed to send email notification', { notification, error });
      throw error;
    }
  }

  private async sendSlackNotification(notification: Notification): Promise<void> {
    if (!this.slackClient || !this.config.channels.slack?.channel) {
      return;
    }

    const template = this.config.channels.slack.templates?.[notification.type] || this.getDefaultSlackTemplate();
    const content = this.formatTemplate(template, notification);

    try {
      await this.slackClient.chat.postMessage({
        channel: this.config.channels.slack.channel,
        text: content,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: content,
            },
          },
        ],
      });
      logger.info('Slack notification sent', { id: notification.id });
    } catch (error) {
      logger.error('Failed to send Slack notification', { notification, error });
      throw error;
    }
  }

  private async sendSMSNotification(notification: Notification): Promise<void> {
    // Implement SMS sending logic using your preferred provider
    logger.info('SMS notification would be sent', { id: notification.id });
  }

  private async sendWebhookNotification(notification: Notification): Promise<void> {
    if (!this.config.channels.webhook?.url) {
      return;
    }

    try {
      const response = await fetch(this.config.channels.webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.channels.webhook.headers,
        },
        body: JSON.stringify(notification),
      });

      if (!response.ok) {
        throw new Error(`Webhook responded with status ${response.status}`);
      }

      logger.info('Webhook notification sent', { id: notification.id });
    } catch (error) {
      logger.error('Failed to send webhook notification', { notification, error });
      throw error;
    }
  }

  private isThrottled(key: string): boolean {
    const history = this.notificationHistory.get(key);
    if (!history) {
      return false;
    }

    const now = new Date();
    const timeSinceLastSent = now.getTime() - history.lastSent.getTime();

    return (
      timeSinceLastSent < this.config.throttling.cooldownPeriod &&
      history.count >= this.config.throttling.maxPerMinute
    );
  }

  private updateNotificationHistory(key: string): void {
    const now = new Date();
    const history = this.notificationHistory.get(key) || { count: 0, lastSent: now };

    // Reset count if cooldown period has passed
    if (now.getTime() - history.lastSent.getTime() >= this.config.throttling.cooldownPeriod) {
      history.count = 0;
    }

    history.count++;
    history.lastSent = now;
    this.notificationHistory.set(key, history);
  }

  private cleanupHistory(): void {
    const now = new Date();
    for (const [key, history] of this.notificationHistory.entries()) {
      if (now.getTime() - history.lastSent.getTime() >= this.config.throttling.cooldownPeriod) {
        this.notificationHistory.delete(key);
      }
    }
  }

  private getDefaultEmailTemplate(): string {
    return `
      <h2>System Notification</h2>
      <p><strong>Type:</strong> {{type}}</p>
      <p><strong>Severity:</strong> {{severity}}</p>
      <p><strong>Message:</strong> {{message}}</p>
      <p><strong>Time:</strong> {{timestamp}}</p>
      {{#if metadata}}
      <h3>Additional Information</h3>
      <pre>{{metadata}}</pre>
      {{/if}}
    `;
  }

  private getDefaultSlackTemplate(): string {
    return `
*System Notification*
Type: {{type}}
Severity: {{severity}}
Message: {{message}}
Time: {{timestamp}}
{{#if metadata}}
Additional Information:
\`\`\`
{{metadata}}
\`\`\`
{{/if}}
    `;
  }

  private formatTemplate(template: string, notification: Notification): string {
    return template
      .replace(/{{type}}/g, notification.type)
      .replace(/{{severity}}/g, notification.severity)
      .replace(/{{message}}/g, notification.message)
      .replace(/{{timestamp}}/g, notification.timestamp.toISOString())
      .replace(/{{#if metadata}}([\s\S]*?){{\/if}}/g, notification.metadata ? 
        `$1`.replace(/{{metadata}}/g, JSON.stringify(notification.metadata, null, 2)) : 
        ''
      );
  }
} 