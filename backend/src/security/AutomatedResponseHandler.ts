import { AlertHandler, Alert, AlertType, AlertSeverity } from './types';
import { logger } from '@/utils/logger';
import { UserService } from '@/services/UserService';
import { RateLimiterService } from '@/services/RateLimiterService';
import { SecurityAuditService } from '@/services/SecurityAuditService';

export class AutomatedResponseHandler implements AlertHandler {
  private userService: UserService;
  private rateLimiterService: RateLimiterService;
  private securityAuditService: SecurityAuditService;

  constructor(
    userService: UserService,
    rateLimiterService: RateLimiterService,
    securityAuditService: SecurityAuditService
  ) {
    this.userService = userService;
    this.rateLimiterService = rateLimiterService;
    this.securityAuditService = securityAuditService;
  }

  public async handleAlert(alert: Alert): Promise<void> {
    logger.info('Processing automated response for alert', { alertId: alert.id });

    try {
      await this.securityAuditService.recordAlert(
        alert.type,
        alert.severity,
        { message: alert.message, ...alert.metadata }
      );

      switch (alert.type) {
        case AlertType.AUTH_FAILURE:
          await this.handleAuthFailure(alert);
          break;
        case AlertType.UNUSUAL_ACCESS:
          await this.handleUnusualAccess(alert);
          break;
        case AlertType.RATE_LIMIT_BREACH:
          await this.handleRateLimitBreach(alert);
          break;
        case AlertType.DATA_VIOLATION:
          await this.handleDataViolation(alert);
          break;
        default:
          logger.info('No automated response defined for alert type', {
            alertId: alert.id,
            type: alert.type
          });
      }
    } catch (error) {
      logger.error('Failed to process automated response', { alert, error });
      throw error;
    }
  }

  private async handleAuthFailure(alert: Alert): Promise<void> {
    const { userId, ipAddress } = alert.metadata;

    if (alert.severity === AlertSeverity.HIGH) {
      // Temporarily lock the account after multiple failures
      await this.userService.temporaryLockAccount(userId);
      logger.info('Account temporarily locked due to auth failures', { userId });
    }

    // Add IP to suspicious list
    await this.rateLimiterService.addToSuspiciousList(ipAddress);
  }

  private async handleUnusualAccess(alert: Alert): Promise<void> {
    const { userId, resource } = alert.metadata;

    // Log detailed access pattern
    await this.securityAuditService.logAccessPattern(userId, resource);

    if (alert.severity === AlertSeverity.HIGH) {
      // Revoke current session
      await this.userService.revokeCurrentSession(userId);
      logger.info('Session revoked due to unusual access pattern', { userId });
    }
  }

  private async handleRateLimitBreach(alert: Alert): Promise<void> {
    const { ipAddress, endpoint } = alert.metadata;

    // Implement escalating response based on severity
    switch (alert.severity) {
      case AlertSeverity.LOW:
        await this.rateLimiterService.decreaseLimit(ipAddress);
        break;
      case AlertSeverity.MEDIUM:
        await this.rateLimiterService.temporaryBlock(ipAddress, 300); // 5 minutes
        break;
      case AlertSeverity.HIGH:
        await this.rateLimiterService.temporaryBlock(ipAddress, 3600); // 1 hour
        break;
      case AlertSeverity.CRITICAL:
        await this.rateLimiterService.blacklistIP(ipAddress);
        break;
    }

    logger.info('Rate limit response implemented', {
      ipAddress,
      endpoint,
      severity: alert.severity
    });
  }

  private async handleDataViolation(alert: Alert): Promise<void> {
    const { userId, resource, operation } = alert.metadata;

    // Log violation details
    await this.securityAuditService.recordAlert(
      AlertType.DATA_VIOLATION,
      alert.severity,
      { userId, resource, operation }
    );

    if (alert.severity >= AlertSeverity.HIGH) {
      // Revoke access to the specific resource
      await this.userService.revokeResourceAccess(userId, resource);
      logger.info('Resource access revoked due to data violation', {
        userId,
        resource
      });
    }
  }
}
