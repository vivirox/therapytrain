import { AutomatedNotificationService, Notification, NotificationConfig } from '../AutomatedNotificationService';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { WebClient } from '@slack/web-api';
import { EventEmitter } from 'events';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('nodemailer');
jest.mock('@slack/web-api');

describe('AutomatedNotificationService', () => {
  let service: AutomatedNotificationService;
  let mockSupabase: any;
  let mockEmailTransport: any;
  let mockSlackClient: any;

  const mockNotification: Notification = {
    id: 'test-id',
    type: 'test-notification',
    severity: 'high',
    message: 'Test notification message',
    metadata: { test: 'data' },
    timestamp: new Date(),
  };

  const mockConfig: NotificationConfig = {
    enabled: true,
    channels: {
      email: {
        enabled: true,
        recipients: ['test@example.com'],
      },
      slack: {
        enabled: true,
        channel: '#test-channel',
      },
      sms: {
        enabled: true,
        numbers: ['+1234567890'],
      },
      webhook: {
        enabled: true,
        url: 'https://test.webhook.com',
      },
    },
    throttling: {
      maxPerMinute: 10,
      maxPerHour: 100,
      cooldownPeriod: 60000,
    },
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock Supabase
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockConfig }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    // Mock email transport
    mockEmailTransport = {
      sendMail: jest.fn().mockResolvedValue(undefined),
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockEmailTransport);

    // Mock Slack client
    mockSlackClient = {
      chat: {
        postMessage: jest.fn().mockResolvedValue({ ok: true }),
      },
    };
    (WebClient as unknown as jest.Mock).mockReturnValue(mockSlackClient);

    // Set environment variables
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'test@test.com';
    process.env.SMTP_PASS = 'password';
    process.env.SMTP_FROM = 'alerts@test.com';
    process.env.SLACK_TOKEN = 'test-token';

    // Initialize service
    service = AutomatedNotificationService.getInstance();
  });

  afterEach(() => {
    // Reset environment variables
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_FROM;
    delete process.env.SLACK_TOKEN;
  });

  describe('Configuration', () => {
    it('should load configuration from Supabase', async () => {
      expect(mockSupabase.from).toHaveBeenCalledWith('notification_config');
      expect(mockSupabase.select).toHaveBeenCalled();
      expect(mockSupabase.single).toHaveBeenCalled();
    });

    it('should handle configuration loading errors', async () => {
      mockSupabase.single.mockRejectedValueOnce(new Error('Config error'));
      const consoleSpy = jest.spyOn(console, 'error');
      
      service = AutomatedNotificationService.getInstance();
      
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Notification Sending', () => {
    it('should send notifications through all enabled channels', async () => {
      await service.notify(mockNotification);

      // Check email
      expect(mockEmailTransport.sendMail).toHaveBeenCalled();
      
      // Check Slack
      expect(mockSlackClient.chat.postMessage).toHaveBeenCalled();
      
      // Check notification history
      expect(mockSupabase.from).toHaveBeenCalledWith('notification_history');
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should handle disabled notifications', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockConfig, enabled: false },
      });
      
      service = AutomatedNotificationService.getInstance();
      await service.notify(mockNotification);

      expect(mockEmailTransport.sendMail).not.toHaveBeenCalled();
      expect(mockSlackClient.chat.postMessage).not.toHaveBeenCalled();
    });

    it('should respect channel-specific settings', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          ...mockConfig,
          channels: {
            ...mockConfig.channels,
            email: { ...mockConfig.channels.email, enabled: false },
          },
        },
      });
      
      service = AutomatedNotificationService.getInstance();
      await service.notify(mockNotification);

      expect(mockEmailTransport.sendMail).not.toHaveBeenCalled();
      expect(mockSlackClient.chat.postMessage).toHaveBeenCalled();
    });

    it('should handle notification errors', async () => {
      mockEmailTransport.sendMail.mockRejectedValueOnce(new Error('Email error'));
      
      const errorHandler = jest.fn();
      service.on('notification:error', errorHandler);

      await expect(service.notify(mockNotification)).rejects.toThrow('Email error');
      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe('Throttling', () => {
    it('should throttle notifications based on configuration', async () => {
      // Send notifications up to the limit
      for (let i = 0; i < mockConfig.throttling.maxPerMinute; i++) {
        await service.notify(mockNotification);
      }

      // This one should be throttled
      await service.notify(mockNotification);

      expect(mockEmailTransport.sendMail).toHaveBeenCalledTimes(
        mockConfig.throttling.maxPerMinute
      );
    });

    it('should reset throttling after cooldown period', async () => {
      jest.useFakeTimers();

      // Send notifications up to the limit
      for (let i = 0; i < mockConfig.throttling.maxPerMinute; i++) {
        await service.notify(mockNotification);
      }

      // Advance time past cooldown period
      jest.advanceTimersByTime(mockConfig.throttling.cooldownPeriod + 1000);

      // Should be able to send again
      await service.notify(mockNotification);

      expect(mockEmailTransport.sendMail).toHaveBeenCalledTimes(
        mockConfig.throttling.maxPerMinute + 1
      );

      jest.useRealTimers();
    });
  });

  describe('Template Formatting', () => {
    it('should format email templates correctly', async () => {
      await service.notify(mockNotification);

      const emailCall = mockEmailTransport.sendMail.mock.calls[0][0];
      expect(emailCall.html).toContain(mockNotification.type);
      expect(emailCall.html).toContain(mockNotification.message);
      expect(emailCall.html).toContain(mockNotification.severity);
    });

    it('should format Slack templates correctly', async () => {
      await service.notify(mockNotification);

      const slackCall = mockSlackClient.chat.postMessage.mock.calls[0][0];
      expect(slackCall.text).toContain(mockNotification.type);
      expect(slackCall.text).toContain(mockNotification.message);
      expect(slackCall.text).toContain(mockNotification.severity);
    });

    it('should handle custom templates', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          ...mockConfig,
          channels: {
            ...mockConfig.channels,
            email: {
              ...mockConfig.channels.email,
              templates: {
                'test-notification': 'Custom template: {{message}}',
              },
            },
          },
        },
      });

      service = AutomatedNotificationService.getInstance();
      await service.notify(mockNotification);

      const emailCall = mockEmailTransport.sendMail.mock.calls[0][0];
      expect(emailCall.html).toBe(`Custom template: ${mockNotification.message}`);
    });
  });

  describe('Event Emission', () => {
    it('should emit events on successful notification', async () => {
      const successHandler = jest.fn();
      service.on('notification:sent', successHandler);

      await service.notify(mockNotification);

      expect(successHandler).toHaveBeenCalledWith(mockNotification);
    });

    it('should emit events on notification error', async () => {
      mockEmailTransport.sendMail.mockRejectedValueOnce(new Error('Email error'));

      const errorHandler = jest.fn();
      service.on('notification:error', errorHandler);

      await expect(service.notify(mockNotification)).rejects.toThrow();
      expect(errorHandler).toHaveBeenCalledWith({
        notification: mockNotification,
        error: expect.any(Error),
      });
    });
  });
}); 