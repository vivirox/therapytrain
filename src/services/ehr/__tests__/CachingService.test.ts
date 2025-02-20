import { CachingService } from '../CachingService';
import { HIPAACompliantAuditService } from '../../HIPAACompliantAuditService';
import { SecurityAuditService } from '../../SecurityAuditService';
import { QualityMetricsService } from '../../QualityMetricsService';

jest.mock('../../HIPAACompliantAuditService');
jest.mock('../../SecurityAuditService');
jest.mock('../../QualityMetricsService');

describe('CachingService', () => {
  let service: CachingService;
  let mockHipaaAuditService: jest.Mocked<HIPAACompliantAuditService>;
  let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
  let mockQualityMetricsService: jest.Mocked<QualityMetricsService>;

  const mockNamespace = 'test-cache';
  const mockConfig = {
    strategy: 'both' as const,
    maxSize: 5,
    ttl: 1000, // 1 second
  };

  beforeEach(() => {
    mockHipaaAuditService = new HIPAACompliantAuditService() as jest.Mocked<HIPAACompliantAuditService>;
    mockSecurityAuditService = new SecurityAuditService() as jest.Mocked<SecurityAuditService>;
    mockQualityMetricsService = new QualityMetricsService() as jest.Mocked<QualityMetricsService>;

    mockHipaaAuditService.logEvent.mockResolvedValue();
    mockSecurityAuditService.recordAlert.mockResolvedValue();
    mockQualityMetricsService.recordMetric.mockResolvedValue();

    service = new CachingService(
      mockHipaaAuditService,
      mockSecurityAuditService,
      mockQualityMetricsService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('configure', () => {
    it('should configure cache with valid configuration', async () => {
      const configuredHandler = jest.fn();
      service.on('configured', configuredHandler);

      await service.configure(mockNamespace, mockConfig);

      expect(configuredHandler).toHaveBeenCalledWith({
        namespace: mockNamespace,
        config: mockConfig,
      });

      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SYSTEM_OPERATION',
          action: expect.objectContaining({
            type: 'CREATE',
            status: 'SUCCESS',
            details: expect.objectContaining({
              operation: 'CONFIGURE_CACHE',
              namespace: mockNamespace,
            }),
          }),
        })
      );

      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'cache_configured',
        expect.objectContaining({
          namespace: mockNamespace,
          strategy: mockConfig.strategy,
          maxSize: mockConfig.maxSize,
          ttl: mockConfig.ttl,
        })
      );
    });
  });

  describe('set and get', () => {
    beforeEach(async () => {
      await service.configure(mockNamespace, mockConfig);
    });

    it('should store and retrieve value', async () => {
      const key = 'test-key';
      const value = { id: 1, name: 'Test' };

      await service.set(mockNamespace, key, value);
      const retrieved = await service.get(mockNamespace, key);

      expect(retrieved).toEqual(value);
      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'cache_hit',
        expect.objectContaining({
          namespace: mockNamespace,
          key,
        })
      );
    });

    it('should handle cache miss', async () => {
      const key = 'non-existent';
      const value = await service.get(mockNamespace, key);

      expect(value).toBeNull();
      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'cache_miss',
        expect.objectContaining({
          namespace: mockNamespace,
          key,
        })
      );
    });

    it('should respect TTL', async () => {
      const key = 'ttl-test';
      const value = { id: 1, name: 'Test' };

      await service.set(mockNamespace, key, value);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, mockConfig.ttl + 100));

      const retrieved = await service.get(mockNamespace, key);
      expect(retrieved).toBeNull();
      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'cache_expired',
        expect.objectContaining({
          namespace: mockNamespace,
          key,
        })
      );
    });

    it('should respect LRU eviction', async () => {
      // Fill cache to capacity
      for (let i = 0; i < mockConfig.maxSize; i++) {
        await service.set(mockNamespace, `key-${i}`, { id: i });
      }

      // Add one more item to trigger eviction
      await service.set(mockNamespace, 'new-key', { id: 999 });

      // First item should be evicted
      const evicted = await service.get(mockNamespace, 'key-0');
      expect(evicted).toBeNull();

      // New item should be present
      const newItem = await service.get(mockNamespace, 'new-key');
      expect(newItem).toEqual({ id: 999 });
    });
  });

  describe('invalidate', () => {
    beforeEach(async () => {
      await service.configure(mockNamespace, mockConfig);
    });

    it('should invalidate cached value', async () => {
      const key = 'test-key';
      const value = { id: 1, name: 'Test' };

      await service.set(mockNamespace, key, value);
      await service.invalidate(mockNamespace, key);

      const retrieved = await service.get(mockNamespace, key);
      expect(retrieved).toBeNull();

      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SYSTEM_OPERATION',
          action: expect.objectContaining({
            type: 'DELETE',
            status: 'SUCCESS',
            details: expect.objectContaining({
              operation: 'INVALIDATE_CACHE',
              namespace: mockNamespace,
              key,
            }),
          }),
        })
      );
    });
  });

  describe('clear', () => {
    beforeEach(async () => {
      await service.configure(mockNamespace, mockConfig);
    });

    it('should clear all cached values in namespace', async () => {
      // Add multiple items
      await service.set(mockNamespace, 'key-1', { id: 1 });
      await service.set(mockNamespace, 'key-2', { id: 2 });

      await service.clear(mockNamespace);

      const retrieved1 = await service.get(mockNamespace, 'key-1');
      const retrieved2 = await service.get(mockNamespace, 'key-2');

      expect(retrieved1).toBeNull();
      expect(retrieved2).toBeNull();

      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SYSTEM_OPERATION',
          action: expect.objectContaining({
            type: 'DELETE',
            status: 'SUCCESS',
            details: expect.objectContaining({
              operation: 'CLEAR_CACHE',
              namespace: mockNamespace,
            }),
          }),
        })
      );
    });
  });

  describe('stats', () => {
    beforeEach(async () => {
      await service.configure(mockNamespace, mockConfig);
    });

    it('should track cache statistics', async () => {
      const key = 'test-key';
      const value = { id: 1, name: 'Test' };

      // Set value
      await service.set(mockNamespace, key, value);

      // Hit
      await service.get(mockNamespace, key);

      // Miss
      await service.get(mockNamespace, 'non-existent');

      const stats = service.getStats(mockNamespace);
      expect(stats).toBeDefined();
      expect(stats?.hits).toBe(1);
      expect(stats?.misses).toBe(1);
      expect(stats?.hitRate).toBe(0.5);
    });

    it('should return null stats for unknown namespace', () => {
      const stats = service.getStats('unknown');
      expect(stats).toBeNull();
    });
  });

  describe('maintenance', () => {
    beforeEach(async () => {
      await service.configure(mockNamespace, mockConfig);
    });

    it('should handle maintenance errors gracefully', async () => {
      const key = 'error-key';
      const value = { id: 1, name: 'Test' };

      // Mock error during invalidation
      mockHipaaAuditService.logEvent.mockRejectedValueOnce(new Error('Maintenance error'));

      await service.set(mockNamespace, key, value, { ttl: 100 });

      // Wait for maintenance cycle
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
        'CACHE_MAINTENANCE_ERROR',
        'LOW',
        expect.any(Object)
      );
    });
  });
}); 