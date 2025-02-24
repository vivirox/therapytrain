import { WebhookService } from '../WebhookService';
import { HIPAACompliantAuditService } from '../../HIPAACompliantAuditService';
import { SecurityAuditService } from '../../SecurityAuditService';
import { QualityMetricsService } from '../../QualityMetricsService';
import { createHmac } from 'crypto';

jest.mock('../../HIPAACompliantAuditService');
jest.mock('../../SecurityAuditService');
jest.mock('../../QualityMetricsService');

describe('WebhookService', () => {
  let service: WebhookService;
  let mockHipaaAuditService: jest.Mocked<HIPAACompliantAuditService>;
  let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
  let mockQualityMetricsService: jest.Mocked<QualityMetricsService>;
  let mockFetch: jest.SpyInstance;

  const mockWebhookId = 'test-webhook';
  const mockWebhookConfig = {
    url: 'https://test.webhook.com/endpoint',
    secret: 'test-secret',
    events: ['patient.created', 'patient.updated'],
  };

  beforeEach(() => {
    mockHipaaAuditService = new HIPAACompliantAuditService() as jest.Mocked<HIPAACompliantAuditService>;
    mockSecurityAuditService = new SecurityAuditService() as jest.Mocked<SecurityAuditService>;
    mockQualityMetricsService = new QualityMetricsService() as jest.Mocked<QualityMetricsService>;

    // Mock HIPAA audit logging
    mockHipaaAuditService.logEvent.mockResolvedValue();
    mockSecurityAuditService.recordAlert.mockResolvedValue();
    mockQualityMetricsService.recordMetric.mockResolvedValue();

    // Mock fetch globally
    mockFetch = jest.spyOn(global, 'fetch');
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
      })
    );

    service = new WebhookService(
      mockHipaaAuditService,
      mockSecurityAuditService,
      mockQualityMetricsService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerWebhook', () => {
    it('should register webhook with valid configuration', async () => {
      const webhookRegisteredHandler = jest.fn();
      service.on('webhookRegistered', webhookRegisteredHandler);

      await service.registerWebhook(mockWebhookId, mockWebhookConfig);

      expect(webhookRegisteredHandler).toHaveBeenCalledWith({
        id: mockWebhookId,
        config: expect.objectContaining(mockWebhookConfig),
      });

      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SYSTEM_OPERATION',
          action: expect.objectContaining({
            type: 'CREATE',
            status: 'SUCCESS',
            details: expect.objectContaining({
              operation: 'REGISTER_WEBHOOK',
              webhookId: mockWebhookId,
            }),
          }),
        })
      );
    });

    it('should throw error when URL is missing', async () => {
      const invalidConfig = { ...mockWebhookConfig, url: '' };

      await expect(service.registerWebhook(mockWebhookId, invalidConfig))
        .rejects
        .toThrow('Webhook URL is required');

      expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
        'WEBHOOK_REGISTRATION_ERROR',
        'HIGH',
        expect.any(Object)
      );
    });

    it('should throw error when secret is missing', async () => {
      const invalidConfig = { ...mockWebhookConfig, secret: '' };

      await expect(service.registerWebhook(mockWebhookId, invalidConfig))
        .rejects
        .toThrow('Webhook secret is required');
    });

    it('should throw error when events array is empty', async () => {
      const invalidConfig = { ...mockWebhookConfig, events: [] };

      await expect(service.registerWebhook(mockWebhookId, invalidConfig))
        .rejects
        .toThrow('At least one event type is required');
    });

    it('should throw error when URL format is invalid', async () => {
      const invalidConfig = { ...mockWebhookConfig, url: 'invalid-url' };

      await expect(service.registerWebhook(mockWebhookId, invalidConfig))
        .rejects
        .toThrow('Invalid webhook URL format');
    });
  });

  describe('deregisterWebhook', () => {
    beforeEach(async () => {
      await service.registerWebhook(mockWebhookId, mockWebhookConfig);
    });

    it('should deregister existing webhook', async () => {
      const webhookDeregisteredHandler = jest.fn();
      service.on('webhookDeregistered', webhookDeregisteredHandler);

      await service.deregisterWebhook(mockWebhookId);

      expect(webhookDeregisteredHandler).toHaveBeenCalledWith({
        id: mockWebhookId,
      });

      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SYSTEM_OPERATION',
          action: expect.objectContaining({
            type: 'DELETE',
            status: 'SUCCESS',
            details: expect.objectContaining({
              operation: 'DEREGISTER_WEBHOOK',
              webhookId: mockWebhookId,
            }),
          }),
        })
      );
    });

    it('should throw error when webhook does not exist', async () => {
      await expect(service.deregisterWebhook('non-existent'))
        .rejects
        .toThrow('Webhook non-existent not found');
    });
  });

  describe('event emission', () => {
    beforeEach(async () => {
      await service.registerWebhook(mockWebhookId, mockWebhookConfig);
    });

    it('should deliver events to subscribed webhooks', async () => {
      const payload = { id: 'test-patient', name: 'John Doe' };
      const event = 'patient.created';

      await service.emit(event, payload);

      expect(mockFetch).toHaveBeenCalledWith(
        mockWebhookConfig.url,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-Event': event,
          }),
          body: expect.any(String),
        })
      );

      // Verify signature
      const call = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(call[1].body);
      const signature = call[1].headers['X-Webhook-Signature'];

      const hmac = createHmac('sha256', mockWebhookConfig.secret);
      hmac.update(JSON.stringify(requestBody));
      const expectedSignature = hmac.digest('hex');

      expect(signature).toBe(expectedSignature);
    });

    it('should not deliver events to unsubscribed webhooks', async () => {
      await service.emit('unsubscribed.event', { data: 'test' });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle delivery failures and retry', async () => {
      mockFetch
        .mockImplementationOnce(() => Promise.reject(new Error('Network error')))
        .mockImplementationOnce(() => Promise.resolve({ ok: true }));

      const deliveryAttemptedHandler = jest.fn();
      const deliveryFailedHandler = jest.fn();
      const deliverySucceededHandler = jest.fn();

      service.on('deliveryAttempted', deliveryAttemptedHandler);
      service.on('deliveryFailed', deliveryFailedHandler);
      service.on('deliverySucceeded', deliverySucceededHandler);

      await service.emit('patient.created', { id: 'test' });

      // Wait for retry
      await new Promise(resolve => setTimeout(resolve, 5000));

      expect(deliveryAttemptedHandler).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(deliverySucceededHandler).toHaveBeenCalled();
    });

    it('should handle permanent delivery failures', async () => {
      mockFetch.mockImplementation(() => Promise.reject(new Error('Network error')));

      const deliveryFailedHandler = jest.fn();
      service.on('deliveryFailed', deliveryFailedHandler);

      await service.emit('patient.created', { id: 'test' });

      // Wait for all retries
      await new Promise(resolve => setTimeout(resolve, 15000));

      expect(deliveryFailedHandler).toHaveBeenCalled();
      expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
        'WEBHOOK_DELIVERY_ERROR',
        'HIGH',
        expect.any(Object)
      );
    });
  });

  describe('webhook status', () => {
    beforeEach(async () => {
      await service.registerWebhook(mockWebhookId, mockWebhookConfig);
    });

    it('should track successful deliveries', async () => {
      await service.emit('patient.created', { id: 'test' });

      const status = service.getWebhookStatus(mockWebhookId);
      expect(status).toBeDefined();
      expect(status?.successCount).toBe(1);
      expect(status?.failureCount).toBe(0);
      expect(status?.lastDelivery).toBeInstanceOf(Date);
    });

    it('should track failed deliveries', async () => {
      mockFetch.mockImplementation(() => Promise.reject(new Error('Network error')));

      await service.emit('patient.created', { id: 'test' });

      // Wait for all retries
      await new Promise(resolve => setTimeout(resolve, 15000));

      const status = service.getWebhookStatus(mockWebhookId);
      expect(status).toBeDefined();
      expect(status?.successCount).toBe(0);
      expect(status?.failureCount).toBe(1);
      expect(status?.lastError).toBe('Network error');
    });
  });

  describe('metrics and monitoring', () => {
    beforeEach(async () => {
      await service.registerWebhook(mockWebhookId, mockWebhookConfig);
    });

    it('should record metrics for webhook registration', async () => {
      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'webhook_registered',
        expect.objectContaining({
          webhookId: mockWebhookId,
          events: mockWebhookConfig.events,
        })
      );
    });

    it('should record metrics for successful delivery', async () => {
      await service.emit('patient.created', { id: 'test' });

      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'webhook_delivery_succeeded',
        expect.any(Object)
      );
    });

    it('should record metrics for failed delivery', async () => {
      mockFetch.mockImplementation(() => Promise.reject(new Error('Network error')));

      await service.emit('patient.created', { id: 'test' });

      // Wait for all retries
      await new Promise(resolve => setTimeout(resolve, 15000));

      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'webhook_delivery_failed',
        expect.objectContaining({
          error: 'Network error',
        })
      );
    });
  });
}); 