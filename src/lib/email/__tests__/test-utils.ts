import { vi } from 'vitest';
import { Resend, SendEmailResponse } from 'resend';
import { EmailService } from '../email-service';
import { EmailTrackingService } from '../email-tracking';
import { render } from '@/utils/template';
import { Logger } from '@/lib/logger';

// Mock responses
export const mockEmailResponse = {
  data: { id: 'test-email-id' },
  error: null,
} as SendEmailResponse;

export const mockErrorResponse = {
  data: null,
  error: {
    message: 'Failed to send email',
    statusCode: 500,
  },
} as SendEmailResponse;

export const mockRateLimitResponse = {
  data: null,
  error: {
    message: 'Rate limit exceeded',
    statusCode: 429,
  },
} as SendEmailResponse;

// Mock functions
export const mockSend = vi.fn().mockResolvedValue(mockEmailResponse);
export const mockRender = vi.fn().mockResolvedValue('<html><body>Rendered template</body></html>');
export const mockTrackEvent = vi.fn().mockResolvedValue(undefined);
export const mockLoggerInfo = vi.fn().mockResolvedValue(undefined);
export const mockLoggerError = vi.fn().mockResolvedValue(undefined);

// Setup mocks
export function setupEmailMocks() {
  vi.mock('resend', () => ({
    Resend: vi.fn(() => ({
      emails: {
        send: mockSend,
      },
    })),
  }));

  vi.mock('@/utils/template', () => ({
    render: mockRender,
  }));

  vi.mock('../email-tracking', () => ({
    EmailTrackingService: {
      trackEvent: mockTrackEvent,
      getTrackingPixelUrl: vi.fn().mockReturnValue('tracking-pixel-url'),
      getTrackingUrl: vi.fn().mockImplementation((url) => `tracking-${url}`),
    },
  }));

  vi.mock('@/lib/logger', () => ({
    Logger: {
      getInstance: vi.fn().mockReturnValue({
        info: mockLoggerInfo,
        error: mockLoggerError,
      }),
    },
  }));
}

// Reset mocks
export function resetEmailMocks() {
  vi.clearAllMocks();
}

// Test data generators
export function generateTestEmail(overrides: Partial<any> = {}) {
  return {
    to: 'test@example.com',
    subject: 'Test Email',
    template: 'test-template',
    context: { name: 'Test User' },
    ...overrides,
  };
}

export function generateTestTemplate(overrides: Partial<any> = {}) {
  return {
    id: 'test-template-id',
    name: 'Test Template',
    description: 'A test template',
    version: '1.0.0',
    html: '<html><body>{{name}}</body></html>',
    text: '{{name}}',
    subject: 'Test Subject',
    variables: ['name'],
    category: 'transactional',
    locale: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Test assertions
export function expectEmailToBeSent(options: any) {
  expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
    to: options.to,
    subject: options.subject,
    html: expect.any(String),
    ...(options.cc && { cc: options.cc }),
    ...(options.bcc && { bcc: options.bcc }),
    ...(options.replyTo && { replyTo: options.replyTo }),
  }));
}

export function expectEmailTracking(emailId: string, recipient: string) {
  expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
    email_id: emailId,
    recipient,
  }));
}

export function expectEmailLogging(type: 'success' | 'error', data: any) {
  if (type === 'success') {
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      'Email sent successfully',
      expect.objectContaining(data)
    );
  } else {
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Failed to send email',
      expect.any(Error),
      expect.objectContaining(data)
    );
  }
}

// Rate limit simulation
export function simulateRateLimit() {
  mockSend.mockResolvedValueOnce(mockRateLimitResponse);
}

// Error simulation
export function simulateError(message: string = 'Failed to send email', statusCode: number = 500) {
  mockSend.mockResolvedValueOnce({
    data: null,
    error: {
      message,
      statusCode,
    },
  } as SendEmailResponse);
}

// Template rendering simulation
export function simulateTemplateRenderError(message: string = 'Template rendering failed') {
  mockRender.mockRejectedValueOnce(new Error(message));
}

// Delivery verification simulation
export function simulateDeliveryEvent(emailId: string, recipient: string) {
  return EmailTrackingService.trackDelivery(emailId, recipient);
}

// Bounce simulation
export function simulateBounceEvent(emailId: string, recipient: string, error: string) {
  return EmailTrackingService.trackBounce(emailId, recipient, error);
} 