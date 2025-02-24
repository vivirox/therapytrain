import { Resend } from 'resend';
import { render } from '@/utils/template';
import { EmailTrackingService } from './email-tracking';
import { Logger } from '@/lib/logger';
import { env } from '@/utils/env';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  template: string;
  context: Record<string, any>;
  tags?: Array<{ name: string; value: string }>;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  trackOpens?: boolean;
  trackClicks?: boolean;
}

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  html: string;
  text: string;
  subject: string;
  createdAt: Date;
  updatedAt: Date;
  variables: string[];
  category: 'transactional' | 'marketing' | 'notification';
  locale: string;
}

export interface EmailEvent {
  id: string;
  emailId: string;
  type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'unsubscribed';
  timestamp: Date;
  metadata: Record<string, any>;
}

export class EmailService {
  private static instance: EmailService;
  private resend: Resend;
  private logger: Logger;

  private constructor() {
    this.resend = new Resend(env.RESEND_API_KEY);
    this.logger = Logger.getInstance();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Send an email using a template
   */
  public async sendEmail(options: EmailOptions): Promise<string> {
    try {
      // Validate email addresses
      const toEmails = Array.isArray(options.to) ? options.to : [options.to];
      const ccEmails = options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined;
      const bccEmails = options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined;

      // Add default tags
      const defaultTags = [
        { name: 'template', value: options.template },
        { name: 'environment', value: process.env.NODE_ENV || 'development' }
      ];

      // Generate a unique email ID
      const emailId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Add tracking pixels and click tracking if enabled
      let html = await render(options.template, options.context);
      
      if (options.trackOpens) {
        const trackingPixel = EmailTrackingService.getTrackingPixelUrl(emailId, toEmails[0]);
        html = html.replace('</body>', `<img src="${trackingPixel}" width="1" height="1" />\n</body>`);
      }

      if (options.trackClicks) {
        // Replace all links with tracking links
        html = html.replace(
          /<a([^>]*)href="([^"]*)"([^>]*)>/g,
          (match, before, href, after) => {
            const trackingUrl = EmailTrackingService.getTrackingUrl(href, emailId, toEmails[0]);
            return `<a${before}href="${trackingUrl}"${after}>`;
          }
        );
      }

      // Send email using Resend
      const { data, error } = await this.resend.emails.send({
        from: env.EMAIL_FROM,
        to: toEmails,
        subject: options.subject,
        html,
        replyTo: options.replyTo,
        cc: ccEmails,
        bcc: bccEmails,
        tags: [...defaultTags, ...(options.tags || [])],
      });

      if (error) {
        throw error;
      }

      // Log success
      await this.logger.info('Email sent successfully', {
        emailId,
        template: options.template,
        to: toEmails,
        subject: options.subject,
      });

      return emailId;
    } catch (error) {
      // Log error
      await this.logger.error('Failed to send email', error as Error, {
        template: options.template,
        to: options.to,
        subject: options.subject,
      });
      throw error;
    }
  }

  /**
   * Send a transactional email
   */
  public async sendTransactionalEmail(
    type: 'welcome' | 'password-reset' | 'password-updated' | 'password-reset-success',
    to: string,
    context: Record<string, any>
  ): Promise<string> {
    const templates = {
      'welcome': {
        template: 'welcome',
        subject: 'Welcome to Gradiant!',
      },
      'password-reset': {
        template: 'password-reset',
        subject: 'Reset Your Password',
      },
      'password-updated': {
        template: 'password-updated',
        subject: 'Password Updated Successfully',
      },
      'password-reset-success': {
        template: 'password-reset-success',
        subject: 'Password Reset Successful',
      },
    };

    const template = templates[type];
    if (!template) {
      throw new Error(`Invalid transactional email type: ${type}`);
    }

    return this.sendEmail({
      to,
      subject: template.subject,
      template: template.template,
      context,
      trackOpens: true,
      trackClicks: true,
      tags: [{ name: 'type', value: type }],
    });
  }

  /**
   * Send a notification email
   */
  public async sendNotificationEmail(
    to: string | string[],
    subject: string,
    message: string,
    context: Record<string, any> = {}
  ): Promise<string> {
    return this.sendEmail({
      to,
      subject,
      template: 'notification',
      context: {
        ...context,
        message,
      },
      trackOpens: true,
      tags: [{ name: 'type', value: 'notification' }],
    });
  }
} 