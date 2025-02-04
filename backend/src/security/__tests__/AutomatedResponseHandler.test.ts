import { AutomatedResponseHandler } from '../AutomatedResponseHandler';
import { Alert, AlertType, AlertSeverity } from '../types';
import { UserService } from '../../services/UserService';
import { RateLimiterService } from '../../services/RateLimiterService';
import { SecurityAuditService } from '../../services/SecurityAuditService';

jest.mock('../../services/UserService');
jest.mock('../../services/RateLimiterService');
jest.mock('../../services/SecurityAuditService');
jest.mock('../utils/logger');

describe('AutomatedResponseHandler', () => {
  let handler: AutomatedResponseHandler;
  let mockUserService: jest.Mocked<UserService>;
  let mockRateLimiterService: jest.Mocked<RateLimiterService>;
  let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
  let mockAlert: Alert;

  beforeEach(() => {
    // Create mock services
    mockUserService = {
      temporaryLockAccount: jest.fn().mockResolvedValue(undefined),
      revokeCurrentSession: jest.fn().mockResolvedValue(undefined),
      revokeResourceAccess: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockRateLimiterService = {
      addToSuspiciousList: jest.fn().mockResolvedValue(undefined),
      decreaseLimit: jest.fn().mockResolvedValue(undefined),
      temporaryBlock: jest.fn().mockResolvedValue(undefined),
      blacklistIP: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockSecurityAuditService = {
      recordAlert: jest.fn().mockResolvedValue(undefined),
      logAccessPattern: jest.fn().mockResolvedValue(undefined),
      logDataViolation: jest.fn().mockResolvedValue(undefined)
    } as any;

    // Create handler instance
    handler = new AutomatedResponseHandler(
      mockUserService,
      mockRateLimiterService,
      mockSecurityAuditService
    );

    // Create base mock alert
    mockAlert = {
      id: 'test-alert-id',
      timestamp: new Date(),
      message: 'Test alert',
      metadata: {},
      type: AlertType.AUTH_FAILURE,
      severity: AlertSeverity.HIGH
    };
  });

  describe('handleAlert', () => {
    it('should log all alerts to security audit service', async () => {
      await handler.handleAlert(mockAlert);

      expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
        mockAlert.type,
        mockAlert.severity,
        { message: mockAlert.message, ...mockAlert.metadata }
      );
    });

    it('should handle unknown alert types gracefully', async () => {
      const unknownAlert = {
        ...mockAlert,
        type: 'UNKNOWN_TYPE' as AlertType
      };

      await handler.handleAlert(unknownAlert);

      expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
        unknownAlert.type,
        unknownAlert.severity,
        { message: unknownAlert.message, ...unknownAlert.metadata }
      );
      // No other actions should be taken
      expect(mockUserService.temporaryLockAccount).not.toHaveBeenCalled();
      expect(mockRateLimiterService.addToSuspiciousList).not.toHaveBeenCalled();
    });
  });

  describe('handleAuthFailure', () => {
    beforeEach(() => {
      mockAlert.type = AlertType.AUTH_FAILURE;
      mockAlert.metadata = {
        userId: 'user123',
        ipAddress: '192.168.1.1'
      };
    });

    it('should lock account for high severity auth failures', async () => {
      mockAlert.severity = AlertSeverity.HIGH;
      await handler.handleAlert(mockAlert);

      expect(mockUserService.temporaryLockAccount).toHaveBeenCalledWith('user123');
      expect(mockRateLimiterService.addToSuspiciousList).toHaveBeenCalledWith('192.168.1.1');
    });

    it('should only add IP to suspicious list for lower severity', async () => {
      mockAlert.severity = AlertSeverity.MEDIUM;
      await handler.handleAlert(mockAlert);

      expect(mockUserService.temporaryLockAccount).not.toHaveBeenCalled();
      expect(mockRateLimiterService.addToSuspiciousList).toHaveBeenCalledWith('192.168.1.1');
    });
  });

  describe('handleUnusualAccess', () => {
    beforeEach(() => {
      mockAlert.type = AlertType.UNUSUAL_ACCESS;
      mockAlert.metadata = {
        userId: 'user123',
        resource: '/api/sensitive',
        operation: 'READ'
      };
    });

    it('should log access pattern for all unusual access alerts', async () => {
      await handler.handleAlert(mockAlert);

      expect(mockSecurityAuditService.logAccessPattern).toHaveBeenCalledWith(
        'user123',
        '/api/sensitive'
      );
    });

    it('should revoke session for high severity alerts', async () => {
      mockAlert.severity = AlertSeverity.HIGH;
      await handler.handleAlert(mockAlert);

      expect(mockUserService.revokeCurrentSession).toHaveBeenCalledWith('user123');
    });
  });

  describe('handleRateLimitBreach', () => {
    beforeEach(() => {
      mockAlert.type = AlertType.RATE_LIMIT_BREACH;
      mockAlert.metadata = {
        ipAddress: '192.168.1.1',
        endpoint: '/api/login',
        requestCount: 100
      };
    });

    it('should decrease limit for low severity breaches', async () => {
      mockAlert.severity = AlertSeverity.LOW;
      await handler.handleAlert(mockAlert);

      expect(mockRateLimiterService.decreaseLimit).toHaveBeenCalledWith('192.168.1.1');
    });

    it('should temporary block for medium severity breaches', async () => {
      mockAlert.severity = AlertSeverity.MEDIUM;
      await handler.handleAlert(mockAlert);

      expect(mockRateLimiterService.temporaryBlock).toHaveBeenCalledWith('192.168.1.1', 300);
    });

    it('should temporary block for longer duration for high severity breaches', async () => {
      mockAlert.severity = AlertSeverity.HIGH;
      await handler.handleAlert(mockAlert);

      expect(mockRateLimiterService.temporaryBlock).toHaveBeenCalledWith('192.168.1.1', 3600);
    });

    it('should blacklist IP for critical severity breaches', async () => {
      mockAlert.severity = AlertSeverity.CRITICAL;
      await handler.handleAlert(mockAlert);

      expect(mockRateLimiterService.blacklistIP).toHaveBeenCalledWith('192.168.1.1');
    });
  });

  describe('handleDataViolation', () => {
    beforeEach(() => {
      mockAlert.type = AlertType.DATA_VIOLATION;
      mockAlert.metadata = {
        userId: 'user123',
        resource: 'sensitive_data',
        operation: 'WRITE'
      };
    });

    it('should log all data violations', async () => {
      await handler.handleAlert(mockAlert);

      expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
        'DATA_VIOLATION',
        mockAlert.severity,
        {
          userId: 'user123',
          resource: 'sensitive_data',
          operation: 'WRITE'
        }
      );
    });

    it('should revoke resource access for high severity violations', async () => {
      mockAlert.severity = AlertSeverity.HIGH;
      await handler.handleAlert(mockAlert);

      expect(mockUserService.revokeResourceAccess).toHaveBeenCalledWith(
        'user123',
        'sensitive_data'
      );
    });

    it('should not revoke access for low severity violations', async () => {
      mockAlert.severity = AlertSeverity.LOW;
      await handler.handleAlert(mockAlert);

      expect(mockUserService.revokeResourceAccess).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should propagate service errors', async () => {
      const error = new Error('Service error');
      mockSecurityAuditService.recordAlert.mockRejectedValue(error);

      await expect(handler.handleAlert(mockAlert)).rejects.toThrow('Service error');
    });

    it('should ensure all handlers are called even if audit log fails', async () => {
      mockSecurityAuditService.recordAlert.mockRejectedValue(new Error('Audit log error'));
      mockAlert.type = AlertType.AUTH_FAILURE;
      mockAlert.severity = AlertSeverity.HIGH;
      mockAlert.metadata = {
        userId: 'user123',
        ipAddress: '192.168.1.1'
      };

      await expect(handler.handleAlert(mockAlert)).rejects.toThrow('Audit log error');

      // Verify other handlers were still called
      expect(mockUserService.temporaryLockAccount).toHaveBeenCalled();
      expect(mockRateLimiterService.addToSuspiciousList).toHaveBeenCalled();
    });
  });
});
