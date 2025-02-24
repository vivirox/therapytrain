import { RateLimitingService } from '../RateLimitingService';
import { HIPAACompliantAuditService } from '../../HIPAACompliantAuditService';
import { SecurityAuditService } from '../../SecurityAuditService';
import { QualityMetricsService } from '../../QualityMetricsService';

jest.mock('../../HIPAACompliantAuditService');
jest.mock('../../SecurityAuditService');
jest.mock('../../QualityMetricsService');

describe('RateLimitingService', () => {
  let service: RateLimitingService;
  let mockHipaaAuditService: jest.Mocked<HIPAACompliantAuditService>;
  let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
  let mockQualityMetricsService: jest.Mocked<QualityMetricsService>;

  const mockKey = 'test-limit';
  const mockConfig = {
    capacity: 10,
    refillRate: 1,
  };

  beforeEach(() => {
    mockHipaaAuditService = new HIPAACompliantAuditService() as jest.Mocked<HIPAACompliantAuditService>;
    mockSecurityAuditService = new SecurityAuditService() as jest.Mocked<SecurityAuditService>;
    mockQualityMetricsService = new QualityMetricsService() as jest.Mocked<QualityMetricsService>;

    mockHipaaAuditService.logEvent.mockResolvedValue();
    mockSecurityAuditService.recordAlert.mockResolvedValue();
    mockQualityMetricsService.recordMetric.mockResolvedValue();

    service = new RateLimitingService(
      mockHipaaAuditService,
      mockSecurityAuditService,
      mockQualityMetricsService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('configure', () => {
    it('should configure rate limit with valid configuration', async () => {
      const configuredHandler = jest.fn();
      service.on('configured', configuredHandler);

      await service.configure(mockKey, mockConfig);

      expect(configuredHandler).toHaveBeenCalledWith({
        key: mockKey,
        config: mockConfig,
      });

      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SYSTEM_OPERATION',
          action: expect.objectContaining({
            type: 'CREATE',
            status: 'SUCCESS',
            details: expect.objectContaining({
              operation: 'CONFIGURE_RATE_LIMIT',
              key: mockKey,
            }),
          }),
        })
      );

      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'rate_limit_configured',
        expect.objectContaining({
          key: mockKey,
          capacity: mockConfig.capacity,
          refillRate: mockConfig.refillRate,
        })
      );
    });

    it('should override existing configuration', async () => {
      await service.configure(mockKey, mockConfig);
      
      const newConfig = {
        capacity: 20,
        refillRate: 2,
      };

      await service.configure(mockKey, newConfig);

      const status = service.getStatus(mockKey);
      expect(status?.total).toBe(newConfig.capacity);
    });
  });

  describe('checkLimit', () => {
    beforeEach(async () => {
      await service.configure(mockKey, mockConfig);
    });

    it('should allow requests within limit', async () => {
      const allowed = await service.checkLimit(mockKey, 5);
      expect(allowed).toBe(true);

      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'rate_limit_checked',
        expect.objectContaining({
          key: mockKey,
          tokens: 5,
          allowed: true,
        })
      );
    });

    it('should deny requests exceeding limit', async () => {
      const limitExceededHandler = jest.fn();
      service.on('limitExceeded', limitExceededHandler);

      const allowed = await service.checkLimit(mockKey, mockConfig.capacity + 1);
      expect(allowed).toBe(false);

      expect(limitExceededHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          key: mockKey,
          requested: mockConfig.capacity + 1,
        })
      );

      expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
        'RATE_LIMIT_EXCEEDED',
        'MEDIUM',
        expect.any(Object)
      );
    });

    it('should auto-configure with default limits for unknown keys', async () => {
      const allowed = await service.checkLimit('unknown-key');
      expect(allowed).toBe(true);

      const status = service.getStatus('unknown-key');
      expect(status).toBeDefined();
    });

    it('should auto-configure with provider-specific limits', async () => {
      const allowed = await service.checkLimit('epic-api');
      expect(allowed).toBe(true);

      const status = service.getStatus('epic-api');
      expect(status?.total).toBe(300); // Epic's capacity from PROVIDER_LIMITS
    });
  });

  describe('token bucket refill', () => {
    beforeEach(async () => {
      await service.configure(mockKey, mockConfig);
    });

    it('should refill tokens over time', async () => {
      // Use all tokens
      await service.checkLimit(mockKey, mockConfig.capacity);

      // Wait for refill
      await new Promise(resolve => setTimeout(resolve, 2000));

      const status = service.getStatus(mockKey);
      expect(status?.remaining).toBeGreaterThan(0);
    });

    it('should not exceed capacity when refilling', async () => {
      // Wait for potential overflow
      await new Promise(resolve => setTimeout(resolve, 5000));

      const status = service.getStatus(mockKey);
      expect(status?.remaining).toBeLessThanOrEqual(mockConfig.capacity);
    });
  });

  describe('getStatus', () => {
    beforeEach(async () => {
      await service.configure(mockKey, mockConfig);
    });

    it('should return null for unknown keys', () => {
      const status = service.getStatus('unknown-key');
      expect(status).toBeNull();
    });

    it('should return correct status after usage', async () => {
      await service.checkLimit(mockKey, 5);

      const status = service.getStatus(mockKey);
      expect(status).toBeDefined();
      expect(status?.remaining).toBe(5);
      expect(status?.total).toBe(mockConfig.capacity);
      expect(status?.reset).toBeGreaterThanOrEqual(0);
    });
  });

  describe('removeLimit', () => {
    beforeEach(async () => {
      await service.configure(mockKey, mockConfig);
    });

    it('should remove existing rate limit', async () => {
      const removedHandler = jest.fn();
      service.on('removed', removedHandler);

      await service.removeLimit(mockKey);

      expect(removedHandler).toHaveBeenCalledWith({ key: mockKey });
      expect(service.getStatus(mockKey)).toBeNull();

      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SYSTEM_OPERATION',
          action: expect.objectContaining({
            type: 'DELETE',
            status: 'SUCCESS',
            details: expect.objectContaining({
              operation: 'REMOVE_RATE_LIMIT',
              key: mockKey,
            }),
          }),
        })
      );
    });

    it('should throw error when removing non-existent limit', async () => {
      await expect(service.removeLimit('non-existent'))
        .rejects
        .toThrow('Rate limit for non-existent not found');
    });
  });

  describe('metrics and monitoring', () => {
    beforeEach(async () => {
      await service.configure(mockKey, mockConfig);
    });

    it('should record metrics for rate limit checks', async () => {
      await service.checkLimit(mockKey);

      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'rate_limit_checked',
        expect.any(Object)
      );
    });

    it('should record metrics for rate limit exceeded', async () => {
      await service.checkLimit(mockKey, mockConfig.capacity + 1);

      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'rate_limit_exceeded',
        expect.objectContaining({
          key: mockKey,
          tokens: mockConfig.capacity + 1,
        })
      );
    });

    it('should record security alerts for rate limit exceeded', async () => {
      await service.checkLimit(mockKey, mockConfig.capacity + 1);

      expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
        'RATE_LIMIT_EXCEEDED',
        'MEDIUM',
        expect.objectContaining({
          key: mockKey,
          requested: mockConfig.capacity + 1,
        })
      );
    });
  });
}); 