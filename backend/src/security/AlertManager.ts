import { v4 as uuidv4 } from 'uuid';
import { Alert, AlertType, AlertSeverity, AlertHandler } from './types';
import { logger } from '@/utils/logger';

export class AlertManager {
  private static instance: AlertManager;
  private handlers: Array<AlertHandler> = [];

  constructor(handlers: Array<AlertHandler> = []) {
    this.handlers = handlers;
  }

  public static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  public registerHandler(handler: AlertHandler): void {
    this.handlers.push(handler);
  }

  public async createAlert(
    type: AlertType,
    severity: AlertSeverity,
    message: string,
    metadata: Record<string, any> = {}
  ): Promise<Alert> {
    const alert: Alert = {
      id: uuidv4(),
      type,
      severity,
      message,
      timestamp: new Date(),
      metadata
    };

    try {
      await this.processAlert(alert);
      return alert;
    } catch (error) {
      logger.error('Failed to process alert', { alert, error });
      throw error;
    }
  }
  private async processAlert(alert: Alert): Promise<void> {
    logger.info('Processing alert', { alertId: alert.id, type: alert.type });

    const handlerPromises = this.handlers.map((handler: any) =>
      handler.handleAlert(alert).catch((error: Error) => {
        logger.error('Handler failed to process alert', {
          alertId: alert.id,
          error: error.message
        });
      })
    );

    await Promise.all(handlerPromises);
  }

  public async handleAuthFailure(userId: string, ipAddress: string): Promise<Alert> {
    return this.createAlert(
      AlertType.AUTH_FAILURE,
      AlertSeverity.HIGH,
      `Authentication failure detected for user ${userId}`,
      { userId, ipAddress }
    );
  }

  public async handleUnusualAccess(
    userId: string,
    resource: string,
    reason: string
  ): Promise<Alert> {
    return this.createAlert(
      AlertType.UNUSUAL_ACCESS,
      AlertSeverity.MEDIUM,
      `Unusual access pattern detected for user ${userId}`,
      { userId, resource, reason }
    );
  }

  public async handleRateLimitBreach(
    ipAddress: string,
    endpoint: string,
    requestCount: number
  ): Promise<Alert> {
    return this.createAlert(
      AlertType.RATE_LIMIT_BREACH,
      AlertSeverity.HIGH,
      `Rate limit exceeded for IP ${ipAddress}`,
      { ipAddress, endpoint, requestCount }
    );
  }

  async handleAlert(alert: Alert): Promise<void> {
    for (const handler of this.handlers) {
      handler.handleAlert(alert).catch((error: unknown) => {
        console.error('Error in alert handler:', error);
      });
    }
  }
}
