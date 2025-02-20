import { EventEmitter } from 'events';
import { HIPAACompliantAuditService } from '../HIPAACompliantAuditService';
import { SecurityAuditService } from '../SecurityAuditService';
import { QualityMetricsService } from '../QualityMetricsService';
import { HIPAAEventType, HIPAAActionType } from '@/types/hipaa';
import { createHmac } from 'crypto';

interface WebhookConfig {
  url: string;
  secret: string;
  events: string[];
  version: string;
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  rateLimitPerMinute: number;
}

interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: unknown;
  timestamp: Date;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  nextAttempt?: Date;
  error?: string;
}

interface WebhookStatus {
  lastDelivery: Date | null;
  successCount: number;
  failureCount: number;
  lastError?: string;
}

@singleton()
export class WebhookService extends EventEmitter {
  private readonly webhooks: Map<string, WebhookConfig> = new Map();
  private readonly deliveries: Map<string, WebhookDelivery> = new Map();
  private readonly status: Map<string, WebhookStatus> = new Map();
  private readonly defaultConfig = {
    maxRetries: 3,
    retryDelay: 5000,
    timeout: 10000,
    rateLimitPerMinute: 60,
    version: '1.0',
  };

  constructor(
    private readonly hipaaAuditService: HIPAACompliantAuditService,
    private readonly securityAuditService: SecurityAuditService,
    private readonly qualityMetricsService: QualityMetricsService
  ) {
    super();
    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    this.on('webhookRegistered', this.handleWebhookRegistered.bind(this));
    this.on('webhookDeregistered', this.handleWebhookDeregistered.bind(this));
    this.on('deliveryAttempted', this.handleDeliveryAttempted.bind(this));
    this.on('deliverySucceeded', this.handleDeliverySucceeded.bind(this));
    this.on('deliveryFailed', this.handleDeliveryFailed.bind(this));
  }

  async registerWebhook(id: string, config: Partial<WebhookConfig>): Promise<void> {
    try {
      // Validate webhook configuration
      this.validateConfig(config);

      // Create webhook configuration
      const webhookConfig: WebhookConfig = {
        ...this.defaultConfig,
        ...config,
        url: config.url!,
        secret: config.secret!,
        events: config.events!,
      };

      // Store webhook configuration
      this.webhooks.set(id, webhookConfig);

      // Initialize status
      this.status.set(id, {
        lastDelivery: null,
        successCount: 0,
        failureCount: 0,
      });

      this.emit('webhookRegistered', { id, config: webhookConfig });

      await this.hipaaAuditService.logEvent({
        eventType: HIPAAEventType.SYSTEM_OPERATION,
        timestamp: new Date(),
        actor: {
          id: 'SYSTEM',
          role: 'SYSTEM',
          ipAddress: '127.0.0.1'
        },
        action: {
          type: HIPAAActionType.CREATE,
          status: 'SUCCESS',
          details: {
            operation: 'REGISTER_WEBHOOK',
            webhookId: id,
            events: webhookConfig.events,
          }
        },
        resource: {
          type: 'SYSTEM',
          id,
          description: 'Webhook Registration'
        }
      });
    } catch (error) {
      await this.handleError('WEBHOOK_REGISTRATION_ERROR', error, { webhookId: id });
      throw error;
    }
  }

  async deregisterWebhook(id: string): Promise<void> {
    try {
      if (!this.webhooks.has(id)) {
        throw new Error(`Webhook ${id} not found`);
      }

      this.webhooks.delete(id);
      this.status.delete(id);

      this.emit('webhookDeregistered', { id });

      await this.hipaaAuditService.logEvent({
        eventType: HIPAAEventType.SYSTEM_OPERATION,
        timestamp: new Date(),
        actor: {
          id: 'SYSTEM',
          role: 'SYSTEM',
          ipAddress: '127.0.0.1'
        },
        action: {
          type: HIPAAActionType.DELETE,
          status: 'SUCCESS',
          details: {
            operation: 'DEREGISTER_WEBHOOK',
            webhookId: id,
          }
        },
        resource: {
          type: 'SYSTEM',
          id,
          description: 'Webhook Deregistration'
        }
      });
    } catch (error) {
      await this.handleError('WEBHOOK_DEREGISTRATION_ERROR', error, { webhookId: id });
      throw error;
    }
  }

  async emit(event: string, payload: unknown): Promise<void> {
    // Find all webhooks subscribed to this event
    const subscribers = Array.from(this.webhooks.entries())
      .filter(([_, config]) => config.events.includes(event));

    // Create deliveries for each subscriber
    for (const [webhookId, config] of subscribers) {
      const delivery: WebhookDelivery = {
        id: `${webhookId}-${Date.now()}`,
        webhookId,
        event,
        payload,
        timestamp: new Date(),
        status: 'pending',
        attempts: 0,
      };

      this.deliveries.set(delivery.id, delivery);
      await this.attemptDelivery(delivery, config);
    }
  }

  private async attemptDelivery(delivery: WebhookDelivery, config: WebhookConfig): Promise<void> {
    try {
      // Check rate limit
      if (!this.checkRateLimit(delivery.webhookId, config.rateLimitPerMinute)) {
        delivery.nextAttempt = new Date(Date.now() + config.retryDelay);
        return;
      }

      // Prepare payload
      const payload = {
        id: delivery.id,
        event: delivery.event,
        timestamp: delivery.timestamp.toISOString(),
        version: config.version,
        data: delivery.payload,
      };

      // Calculate signature
      const signature = this.calculateSignature(payload, config.secret);

      // Attempt delivery
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-ID': delivery.id,
          'X-Webhook-Event': delivery.event,
        },
        body: JSON.stringify(payload),
        timeout: config.timeout,
      });

      if (!response.ok) {
        throw new Error(`Delivery failed with status ${response.status}`);
      }

      // Update delivery status
      delivery.status = 'delivered';
      this.emit('deliverySucceeded', delivery);

      // Update webhook status
      const status = this.status.get(delivery.webhookId);
      if (status) {
        status.lastDelivery = new Date();
        status.successCount++;
      }
    } catch (error) {
      delivery.attempts++;
      delivery.error = error instanceof Error ? error.message : 'Unknown error';

      if (delivery.attempts >= config.maxRetries) {
        delivery.status = 'failed';
        this.emit('deliveryFailed', delivery);

        // Update webhook status
        const status = this.status.get(delivery.webhookId);
        if (status) {
          status.lastError = delivery.error;
          status.failureCount++;
        }

        await this.handleError('WEBHOOK_DELIVERY_ERROR', error, {
          webhookId: delivery.webhookId,
          deliveryId: delivery.id,
        });
      } else {
        delivery.nextAttempt = new Date(Date.now() + config.retryDelay * Math.pow(2, delivery.attempts));
        setTimeout(() => this.attemptDelivery(delivery, config), config.retryDelay);
      }
    }

    this.emit('deliveryAttempted', delivery);
  }

  private validateConfig(config: Partial<WebhookConfig>): void {
    if (!config.url) {
      throw new Error('Webhook URL is required');
    }
    if (!config.secret) {
      throw new Error('Webhook secret is required');
    }
    if (!config.events || config.events.length === 0) {
      throw new Error('At least one event type is required');
    }

    // Validate URL format
    try {
      new URL(config.url);
    } catch {
      throw new Error('Invalid webhook URL format');
    }
  }

  private calculateSignature(payload: unknown, secret: string): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  private checkRateLimit(webhookId: string, limit: number): boolean {
    // Implement rate limiting logic here
    // For now, we'll just return true
    return true;
  }

  private async handleError(
    type: string,
    error: unknown,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.securityAuditService.recordAlert(type, 'HIGH', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ...details,
    });
  }

  private async handleWebhookRegistered(event: { id: string; config: WebhookConfig }): Promise<void> {
    await this.qualityMetricsService.recordMetric('webhook_registered', {
      webhookId: event.id,
      events: event.config.events,
      timestamp: new Date().toISOString(),
    });
  }

  private async handleWebhookDeregistered(event: { id: string }): Promise<void> {
    await this.qualityMetricsService.recordMetric('webhook_deregistered', {
      webhookId: event.id,
      timestamp: new Date().toISOString(),
    });
  }

  private async handleDeliveryAttempted(delivery: WebhookDelivery): Promise<void> {
    await this.qualityMetricsService.recordMetric('webhook_delivery_attempted', {
      webhookId: delivery.webhookId,
      deliveryId: delivery.id,
      event: delivery.event,
      attempts: delivery.attempts,
      timestamp: new Date().toISOString(),
    });
  }

  private async handleDeliverySucceeded(delivery: WebhookDelivery): Promise<void> {
    await this.qualityMetricsService.recordMetric('webhook_delivery_succeeded', {
      webhookId: delivery.webhookId,
      deliveryId: delivery.id,
      event: delivery.event,
      timestamp: new Date().toISOString(),
    });
  }

  private async handleDeliveryFailed(delivery: WebhookDelivery): Promise<void> {
    await this.qualityMetricsService.recordMetric('webhook_delivery_failed', {
      webhookId: delivery.webhookId,
      deliveryId: delivery.id,
      event: delivery.event,
      error: delivery.error,
      attempts: delivery.attempts,
      timestamp: new Date().toISOString(),
    });
  }

  getWebhookStatus(id: string): WebhookStatus | undefined {
    return this.status.get(id);
  }
} 