import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EmailService } from '../email-service';
import { Resend, SendEmailResponse } from 'resend';
import { Logger } from '@/lib/logger';
import { EmailTrackingService } from '../email-tracking';
import { render } from '@/utils/template';

// Mock dependencies
const mockSend = vi.fn().mockResolvedValue({
  data: { id: 'test-email-id' },
  error: null,
} as SendEmailResponse);

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

const mockRender = vi.fn().mockResolvedValue('<html><body>Rendered template</body></html>');
vi.mock('@/utils/template', () => ({
  render: mockRender,
}));

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};
vi.mock('@/lib/logger', () => ({
  Logger: {
    getInstance: vi.fn(() => mockLogger),
  },
}));

const mockTrackingPixelUrl = vi.fn().mockReturnValue('https://track.example.com/pixel.gif');
const mockTrackingUrl = vi.fn((url) => `https://track.example.com/click?url=${encodeURIComponent(url)}`);
vi.mock('../email-tracking', () => ({
  EmailTrackingService: {
    getTrackingPixelUrl: mockTrackingPixelUrl,
    getTrackingUrl: mockTrackingUrl,
  },
}));

describe('EmailService', () => {
  let emailService: EmailService;

  beforeEach(() => {
    vi.clearAllMocks();
    emailService = EmailService.getInstance();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('sendEmail', () => {
    it('should send an email successfully', async () => {
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Email',
        template: 'welcome',
        context: { name: 'John' },
      };

      const emailId = await emailService.sendEmail(emailOptions);

      expect(emailId).toBeDefined();
      expect(mockRender).toHaveBeenCalledWith('welcome', { name: 'John' });
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        to: 'test@example.com',
        subject: 'Test Email',
        html: expect.any(String),
      }));
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Email sent successfully',
        expect.objectContaining({
          template: 'welcome',
          to: ['test@example.com'],
          subject: 'Test Email',
        })
      );
    });

    it('should handle multiple recipients', async () => {
      const emailOptions = {
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Test Email',
        template: 'welcome',
        context: { name: 'Team' },
      };

      await emailService.sendEmail(emailOptions);

      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        to: ['user1@example.com', 'user2@example.com'],
      }));
    });

    it('should add tracking pixel when trackOpens is true', async () => {
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Email',
        template: 'welcome',
        context: { name: 'John' },
        trackOpens: true,
      };

      await emailService.sendEmail(emailOptions);

      expect(mockTrackingPixelUrl).toHaveBeenCalled();
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.stringContaining('track.example.com/pixel.gif'),
      }));
    });

    it('should add click tracking when trackClicks is true', async () => {
      mockRender.mockResolvedValueOnce(
        '<html><body><a href="https://example.com">Click me</a></body></html>'
      );

      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Email',
        template: 'welcome',
        context: { name: 'John' },
        trackClicks: true,
      };

      await emailService.sendEmail(emailOptions);

      expect(mockTrackingUrl).toHaveBeenCalledWith(
        'https://example.com',
        expect.any(String),
        'test@example.com'
      );
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.stringContaining('track.example.com/click'),
      }));
    });

    it('should handle email sending errors', async () => {
      const error = new Error('Failed to send email');
      mockSend.mockRejectedValueOnce(error);

      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Email',
        template: 'welcome',
        context: { name: 'John' },
      };

      await expect(emailService.sendEmail(emailOptions)).rejects.toThrow('Failed to send email');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to send email',
        error,
        expect.objectContaining({
          template: 'welcome',
          to: 'test@example.com',
          subject: 'Test Email',
        })
      );
    });

    it('should handle template rendering errors', async () => {
      const error = new Error('Template rendering failed');
      mockRender.mockRejectedValueOnce(error);

      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Email',
        template: 'welcome',
        context: { name: 'John' },
      };

      await expect(emailService.sendEmail(emailOptions)).rejects.toThrow('Template rendering failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to send email',
        error,
        expect.any(Object)
      );
    });
  });

  describe('sendTransactionalEmail', () => {
    it('should send a welcome email', async () => {
      await emailService.sendTransactionalEmail(
        'welcome',
        'test@example.com',
        { name: 'John' }
      );

      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        to: 'test@example.com',
        subject: 'Welcome to TherapyTrain!',
        tags: [{ name: 'type', value: 'welcome' }],
      }));
    });

    it('should send a password reset email', async () => {
      await emailService.sendTransactionalEmail(
        'password-reset',
        'test@example.com',
        { resetUrl: 'https://example.com/reset' }
      );

      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        to: 'test@example.com',
        subject: 'Reset Your Password',
        tags: [{ name: 'type', value: 'password-reset' }],
      }));
    });

    it('should throw error for invalid template type', async () => {
      await expect(
        emailService.sendTransactionalEmail(
          'invalid-template' as any,
          'test@example.com',
          {}
        )
      ).rejects.toThrow('Invalid transactional email type');
    });
  });

  describe('sendNotificationEmail', () => {
    it('should send a notification email', async () => {
      await emailService.sendNotificationEmail(
        'test@example.com',
        'Important Update',
        'Your account has been updated.',
        { timestamp: new Date() }
      );

      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        to: 'test@example.com',
        subject: 'Important Update',
        tags: [{ name: 'type', value: 'notification' }],
      }));
    });

    it('should handle multiple recipients for notifications', async () => {
      await emailService.sendNotificationEmail(
        ['user1@example.com', 'user2@example.com'],
        'System Update',
        'The system will be down for maintenance.',
      );

      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'System Update',
      }));
    });
  });
}); 