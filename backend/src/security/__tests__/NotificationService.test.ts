import { NotificationService } from '../NotificationService';
import { SecurityAuditService } from '../../services/SecurityAuditService';
import { IncidentType, IncidentSeverity } from '../SecurityIncidentService';

jest.mock('../../services/SecurityAuditService');

describe('NotificationService', () => {
    let notificationService: NotificationService;
    let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;

    const mockIncident = {
        type: IncidentType.BRUTE_FORCE_ATTEMPT,
        severity: IncidentSeverity.HIGH,
        timestamp: new Date(),
        sourceIp: '192.168.1.1',
        userId: 'test-user',
        details: { attempts: 5 },
        resolved: false
    };

    beforeEach(() => {
        mockSecurityAuditService = {
            recordAlert: jest.fn()
        } as any;

        notificationService = new NotificationService(mockSecurityAuditService);

        // Spy on console.log for notification testing
        jest.spyOn(console, 'log').mockImplementation();

        jest.clearAllMocks();
    });

    describe('Incident Notifications', () => {
        it('should send notifications for an incident', async () => {
            await notificationService.notifyIncident(mockIncident);

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'NOTIFICATIONS_SENT',
                'LOW',
                expect.objectContaining({
                    incidentType: mockIncident.type,
                    severity: mockIncident.severity
                })
            );

            // Verify console.log was called for each notification channel
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('[Email to security-team@company.com]')
            );
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('[SMS to +1234567890]')
            );
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('[Slack #security-incidents]')
            );
        });

        it('should handle notification errors', async () => {
            // Mock console.log to throw an error for email
            (console.log as jest.Mock)
                .mockImplementationOnce(() => { throw new Error('Email failed'); });

            await notificationService.notifyIncident(mockIncident);

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'NOTIFICATION_CHANNEL_ERROR',
                'HIGH',
                expect.objectContaining({
                    channelType: 'email',
                    error: 'Email failed'
                })
            );
        });

        it('should use appropriate template for incident type', async () => {
            await notificationService.notifyIncident({
                ...mockIncident,
                type: IncidentType.DATA_LEAK_ATTEMPT
            });

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Potential Data Leak Detected')
            );
        });

        it('should fall back to default template if no specific template exists', async () => {
            await notificationService.notifyIncident({
                ...mockIncident,
                type: IncidentType.UNAUTHORIZED_ACCESS
            });

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('HIGH: Security Incident')
            );
        });
    });

    describe('Channel Management', () => {
        it('should add new notification channel', async () => {
            const newChannel = {
                type: 'email' as const,
                target: 'new-team@company.com',
                enabled: true
            };

            await notificationService.addNotificationChannel(
                IncidentSeverity.HIGH,
                newChannel
            );

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'NOTIFICATION_CHANNEL_ADDED',
                'LOW',
                expect.objectContaining({
                    severity: IncidentSeverity.HIGH,
                    channelType: newChannel.type,
                    target: newChannel.target
                })
            );

            // Verify the new channel is used
            await notificationService.notifyIncident(mockIncident);
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('[Email to new-team@company.com]')
            );
        });

        it('should remove notification channel', async () => {
            await notificationService.removeNotificationChannel(
                IncidentSeverity.HIGH,
                'email',
                'security-team@company.com'
            );

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'NOTIFICATION_CHANNEL_REMOVED',
                'LOW',
                expect.objectContaining({
                    severity: IncidentSeverity.HIGH,
                    channelType: 'email',
                    target: 'security-team@company.com'
                })
            );

            // Verify the channel is not used
            await notificationService.notifyIncident(mockIncident);
            expect(console.log).not.toHaveBeenCalledWith(
                expect.stringContaining('[Email to security-team@company.com]')
            );
        });
    });

    describe('Template Management', () => {
        it('should add new notification template', async () => {
            const newTemplate = {
                subject: 'Custom Alert: {type}',
                body: 'Custom alert for {sourceIp}',
                severity: IncidentSeverity.HIGH,
                type: IncidentType.SUSPICIOUS_ACTIVITY
            };

            await notificationService.addTemplate('CUSTOM_ALERT', newTemplate);

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'NOTIFICATION_TEMPLATE_ADDED',
                'LOW',
                expect.objectContaining({
                    key: 'CUSTOM_ALERT',
                    type: newTemplate.type,
                    severity: newTemplate.severity
                })
            );

            // Verify the new template is used
            await notificationService.notifyIncident({
                ...mockIncident,
                type: IncidentType.SUSPICIOUS_ACTIVITY
            });

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Custom Alert:')
            );
        });
    });

    describe('Message Formatting', () => {
        it('should format messages with incident details', async () => {
            await notificationService.notifyIncident(mockIncident);

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining(mockIncident.sourceIp)
            );
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining(mockIncident.userId!)
            );
        });

        it('should handle missing optional fields', async () => {
            const incidentWithoutUser = {
                ...mockIncident,
                userId: undefined
            };

            await notificationService.notifyIncident(incidentWithoutUser);

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('N/A')
            );
        });
    });
}); 