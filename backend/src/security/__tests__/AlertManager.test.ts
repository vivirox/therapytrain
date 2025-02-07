import { AlertManager } from '../AlertManager';
import { AlertType, AlertSeverity, AlertHandler } from '../types';

describe('AlertManager', () => {
  let alertManager: AlertManager;
  let mockHandler: jest.Mocked<AlertHandler>;

  beforeEach(() => {
    // Reset singleton instance
    (AlertManager as any).instance = null;
    alertManager = AlertManager.getInstance();
    
    // Create mock handler
    mockHandler = {
      handleAlert: jest.fn().mockResolvedValue(undefined)
    };
    
    alertManager.registerHandler(mockHandler);
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = AlertManager.getInstance();
      const instance2 = AlertManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('createAlert', () => {
    it('should create an alert with correct properties', async () => {
      const alert = await alertManager.createAlert(
        AlertType.AUTH_FAILURE,
        AlertSeverity.HIGH,
        'Test alert',
        { userId: '123' }
      );

      expect(alert).toMatchObject({
        type: AlertType.AUTH_FAILURE,
        severity: AlertSeverity.HIGH,
        message: 'Test alert',
        metadata: { userId: '123' }
      });
      expect(alert.id).toBeDefined();
      expect(alert.timestamp).toBeInstanceOf(Date);
    });

    it('should process alert through all registered handlers', async () => {
      const alert = await alertManager.createAlert(
        AlertType.AUTH_FAILURE,
        AlertSeverity.HIGH,
        'Test alert'
      );

      expect(mockHandler.handleAlert).toHaveBeenCalledWith(alert);
    });

    it('should continue processing if one handler fails', async () => {
      const mockHandler2: AlertHandler = {
        handleAlert: jest.fn().mockResolvedValue(undefined)
      };
      const mockHandler3: AlertHandler = {
        handleAlert: jest.fn().mockRejectedValue(new Error('Handler failed'))
      };

      alertManager.registerHandler(mockHandler2);
      alertManager.registerHandler(mockHandler3);

      const alert = await alertManager.createAlert(
        AlertType.AUTH_FAILURE,
        AlertSeverity.HIGH,
        'Test alert'
      );

      expect(mockHandler.handleAlert).toHaveBeenCalledWith(alert);
      expect(mockHandler2.handleAlert).toHaveBeenCalledWith(alert);
      expect(mockHandler3.handleAlert).toHaveBeenCalledWith(alert);
    });
  });

  describe('handleAuthFailure', () => {
    it('should create auth failure alert with correct metadata', async () => {
      const alert = await alertManager.handleAuthFailure('user123', '192.168.1.1');

      expect(alert).toMatchObject({
        type: AlertType.AUTH_FAILURE,
        severity: AlertSeverity.HIGH,
        metadata: {
          userId: 'user123',
          ipAddress: '192.168.1.1'
        }
      });
    });
  });

  describe('handleUnusualAccess', () => {
    it('should create unusual access alert with correct metadata', async () => {
      const alert = await alertManager.handleUnusualAccess(
        'user123',
        '/api/sensitive',
        'Multiple failed attempts'
      );

      expect(alert).toMatchObject({
        type: AlertType.UNUSUAL_ACCESS,
        severity: AlertSeverity.MEDIUM,
        metadata: {
          userId: 'user123',
          resource: '/api/sensitive',
          reason: 'Multiple failed attempts'
        }
      });
    });
  });

  describe('handleRateLimitBreach', () => {
    it('should create rate limit breach alert with correct metadata', async () => {
      const alert = await alertManager.handleRateLimitBreach(
        '192.168.1.1',
        '/api/login',
        100
      );

      expect(alert).toMatchObject({
        type: AlertType.RATE_LIMIT_BREACH,
        severity: AlertSeverity.HIGH,
        metadata: {
          ipAddress: '192.168.1.1',
          endpoint: '/api/login',
          requestCount: 100
        }
      });
    });
  });
});
