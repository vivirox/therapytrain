import { SecurityAuditService } from '../services/SecurityAuditService';
import { IncidentType, IncidentSeverity, SecurityIncident } from './SecurityIncidentService';

interface NotificationChannel {
    type: 'email' | 'sms' | 'slack' | 'webhook';
    target: string;
    enabled: boolean;
}

interface NotificationTemplate {
    subject: string;
    body: string;
    severity: IncidentSeverity;
    type: IncidentType;
}

export class NotificationService {
    private readonly templates: Map<string, NotificationTemplate> = new Map();
    private readonly channels: Map<IncidentSeverity, NotificationChannel[]> = new Map();

    constructor(private readonly securityAuditService: SecurityAuditService) {
        this.initializeTemplates();
        this.initializeChannels();
    }

    private initializeTemplates(): void {
        // Initialize default templates for different incident types
        this.templates.set('BRUTE_FORCE', {
            subject: 'Brute Force Attack Detected',
            body: 'Multiple failed login attempts detected from IP: {sourceIp}. User: {userId}',
            severity: IncidentSeverity.HIGH,
            type: IncidentType.BRUTE_FORCE_ATTEMPT
        });

        this.templates.set('DATA_LEAK', {
            subject: 'Potential Data Leak Detected',
            body: 'Suspicious data access pattern detected. IP: {sourceIp}, User: {userId}',
            severity: IncidentSeverity.HIGH,
            type: IncidentType.DATA_LEAK_ATTEMPT
        });

        this.templates.set('CRITICAL_INCIDENT', {
            subject: 'CRITICAL: Security Incident Detected',
            body: 'Critical security incident detected. Type: {type}, IP: {sourceIp}',
            severity: IncidentSeverity.CRITICAL,
            type: IncidentType.UNAUTHORIZED_ACCESS
        });
    }

    private initializeChannels(): void {
        // Configure notification channels for different severity levels
        this.channels.set(IncidentSeverity.LOW, [
            { type: 'email', target: 'security-logs@company.com', enabled: true }
        ]);

        this.channels.set(IncidentSeverity.MEDIUM, [
            { type: 'email', target: 'security-team@company.com', enabled: true },
            { type: 'slack', target: '#security-alerts', enabled: true }
        ]);

        this.channels.set(IncidentSeverity.HIGH, [
            { type: 'email', target: 'security-team@company.com', enabled: true },
            { type: 'sms', target: '+1234567890', enabled: true },
            { type: 'slack', target: '#security-incidents', enabled: true }
        ]);

        this.channels.set(IncidentSeverity.CRITICAL, [
            { type: 'email', target: 'security-team@company.com', enabled: true },
            { type: 'email', target: 'cto@company.com', enabled: true },
            { type: 'sms', target: '+1234567890', enabled: true },
            { type: 'slack', target: '#security-critical', enabled: true },
            { type: 'webhook', target: 'https://api.pagerduty.com/incidents', enabled: true }
        ]);
    }

    async notifyIncident(incident: SecurityIncident): Promise<void> {
        try {
            const channels = this.channels.get(incident.severity) || [];
            const template = this.getTemplateForIncident(incident);

            if (!template) {
                throw new Error(`No template found for incident type: ${incident.type}`);
            }

            const message = this.formatMessage(template, incident);
            const notificationPromises = channels
                .filter(channel => channel.enabled)
                .map(channel => this.sendNotification(channel, message));

            await Promise.all(notificationPromises);

            await this.securityAuditService.recordAlert(
                'NOTIFICATIONS_SENT',
                'LOW',
                {
                    incidentType: incident.type,
                    severity: incident.severity,
                    channelCount: channels.length
                }
            );
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'NOTIFICATION_ERROR',
                'HIGH',
                {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    incidentType: incident.type
                }
            );
            throw error;
        }
    }

    private getTemplateForIncident(incident: SecurityIncident): NotificationTemplate | undefined {
        // Find specific template for incident type
        const template = Array.from(this.templates.values()).find(t =>
            t.type === incident.type && t.severity === incident.severity
        );

        // Fall back to severity-based template if no specific template exists
        if (!template) {
            return {
                subject: `${incident.severity}: Security Incident`,
                body: `Security incident detected. Type: {type}, IP: {sourceIp}`,
                severity: incident.severity,
                type: incident.type
            };
        }

        return template;
    }

    private formatMessage(
        template: NotificationTemplate,
        incident: SecurityIncident
    ): { subject: string; body: string } {
        let subject = template.subject;
        let body = template.body;

        // Replace placeholders with actual values
        const replacements = {
            '{type}': incident.type,
            '{sourceIp}': incident.sourceIp,
            '{userId}': incident.userId || 'N/A',
            '{timestamp}': incident.timestamp.toISOString(),
            '{details}': JSON.stringify(incident.details, null, 2)
        };

        Object.entries(replacements).forEach(([key, value]) => {
            subject = subject.replace(key, value);
            body = body.replace(key, value);
        });

        return { subject, body };
    }

    private async sendNotification(
        channel: NotificationChannel,
        message: { subject: string; body: string }
    ): Promise<void> {
        try {
            switch (channel.type) {
                case 'email':
                    await this.sendEmail(channel.target, message);
                    break;
                case 'sms':
                    await this.sendSMS(channel.target, message);
                    break;
                case 'slack':
                    await this.sendSlackMessage(channel.target, message);
                    break;
                case 'webhook':
                    await this.sendWebhook(channel.target, message);
                    break;
            }
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'NOTIFICATION_CHANNEL_ERROR',
                'HIGH',
                {
                    channelType: channel.type,
                    target: channel.target,
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
            );
        }
    }

    private async sendEmail(target: string, message: { subject: string; body: string }): Promise<void> {
        // Implement email sending logic
        console.log(`[Email to ${target}] ${message.subject}: ${message.body}`);
    }

    private async sendSMS(target: string, message: { subject: string; body: string }): Promise<void> {
        // Implement SMS sending logic
        console.log(`[SMS to ${target}] ${message.subject}: ${message.body}`);
    }

    private async sendSlackMessage(
        channel: string,
        message: { subject: string; body: string }
    ): Promise<void> {
        // Implement Slack message sending logic
        console.log(`[Slack ${channel}] ${message.subject}: ${message.body}`);
    }

    private async sendWebhook(
        url: string,
        message: { subject: string; body: string }
    ): Promise<void> {
        // Implement webhook sending logic
        console.log(`[Webhook ${url}] ${message.subject}: ${message.body}`);
    }

    async addNotificationChannel(
        severity: IncidentSeverity,
        channel: NotificationChannel
    ): Promise<void> {
        const channels = this.channels.get(severity) || [];
        channels.push(channel);
        this.channels.set(severity, channels);

        await this.securityAuditService.recordAlert(
            'NOTIFICATION_CHANNEL_ADDED',
            'LOW',
            {
                severity,
                channelType: channel.type,
                target: channel.target
            }
        );
    }

    async removeNotificationChannel(
        severity: IncidentSeverity,
        channelType: string,
        target: string
    ): Promise<void> {
        const channels = this.channels.get(severity) || [];
        const index = channels.findIndex(c => c.type === channelType && c.target === target);

        if (index !== -1) {
            channels.splice(index, 1);
            this.channels.set(severity, channels);

            await this.securityAuditService.recordAlert(
                'NOTIFICATION_CHANNEL_REMOVED',
                'LOW',
                {
                    severity,
                    channelType,
                    target
                }
            );
        }
    }

    async addTemplate(
        key: string,
        template: NotificationTemplate
    ): Promise<void> {
        this.templates.set(key, template);

        await this.securityAuditService.recordAlert(
            'NOTIFICATION_TEMPLATE_ADDED',
            'LOW',
            {
                key,
                type: template.type,
                severity: template.severity
            }
        );
    }
} 