import { AlertHandler, Alert, NotificationConfig } from "./types";
import { logger } from "@/utils/logger";
import * as nodemailer from 'nodemailer';
import axios from 'axios';
export class NotificationHandler implements AlertHandler {
    private config: NotificationConfig;
    constructor(config: NotificationConfig) {
        this.config = config;
    }
    public async handleAlert(alert: Alert): Promise<void> {
        const promises: Promise<void>[] = [];
        if (this.config.email) {
            promises.push(this.sendEmailNotification(alert));
        }
        if (this.config.webhook) {
            promises.push(this.sendWebhookNotification(alert));
        }
        if (this.config.slack) {
            promises.push(this.sendSlackNotification(alert));
        }
        try {
            await Promise.all(promises);
        }
        catch (error) {
            logger.error('Failed to send notifications', { alert, error });
            throw error;
        }
    }
    private async sendEmailNotification(alert: Alert): Promise<void> {
        if (!this.config.email?.recipients.length) {
            return;
        }
        const transporter = nodemailer.createTransport({
            // Configure based on environment variables
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        const emailContent = this.formatEmailContent(alert);
        try {
            await transporter.sendMail({
                from: process.env.SMTP_FROM,
                to: this.config.email.recipients.join(','),
                subject: `[${alert.severity}] Security Alert: ${alert.type}`,
                html: emailContent
            });
            logger.info('Email notification sent', { alertId: alert.id });
        }
        catch (error) {
            logger.error('Failed to send email notification', { alert, error });
            throw error;
        }
    }
    private async sendWebhookNotification(alert: Alert): Promise<void> {
        if (!this.config.webhook?.url) {
            return;
        }
        try {
            await axios.post(this.config.webhook.url, { alert }, { headers: this.config.webhook.headers });
            logger.info('Webhook notification sent', { alertId: alert.id });
        }
        catch (error) {
            logger.error('Failed to send webhook notification', { alert, error });
            throw error;
        }
    }
    private async sendSlackNotification(alert: Alert): Promise<void> {
        if (!this.config.slack?.webhookUrl) {
            return;
        }
        const slackMessage = this.formatSlackMessage(alert);
        try {
            await axios.post(this.config.slack.webhookUrl, slackMessage);
            logger.info('Slack notification sent', { alertId: alert.id });
        }
        catch (error) {
            logger.error('Failed to send Slack notification', { alert, error });
            throw error;
        }
    }
    private formatEmailContent(alert: Alert): string {
        return `
      <h2>Security Alert</h2>
      <p><strong>Type:</strong> ${alert.type}</p>
      <p><strong>Severity:</strong> ${alert.severity}</p>
      <p><strong>Message:</strong> ${alert.message}</p>
      <p><strong>Timestamp:</strong> ${alert.timestamp.toISOString()}</p>
      <h3>Additional Information</h3>
      <pre>${JSON.stringify(alert.metadata, null, 2)}</pre>
    `;
    }
    private formatSlackMessage(alert: Alert): object {
        return {
            text: `🚨 Security Alert: ${alert.type}`,
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: `🚨 Security Alert: ${alert.type}`
                    }
                },
                {
                    type: 'section',
                    fields: [
                        {
                            type: 'mrkdwn',
                            text: `*Severity:*\n${alert.severity}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Time:*\n${alert.timestamp.toISOString()}`
                        }
                    ]
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Message:*\n${alert.message}`
                    }
                }
            ]
        };
    }
}
