import { PluginMarketplaceService } from '../PluginMarketplaceService';
import { PluginService } from '../PluginService';
import { HIPAACompliantAuditService } from '../../HIPAACompliantAuditService';
import { SecurityAuditService } from '../../SecurityAuditService';
import { QualityMetricsService } from '../../QualityMetricsService';

jest.mock('../PluginService');
jest.mock('../../HIPAACompliantAuditService');
jest.mock('../../SecurityAuditService');
jest.mock('../../QualityMetricsService');

describe('PluginMarketplaceService', () => {
  let service: PluginMarketplaceService;
  let mockPluginService: jest.Mocked<PluginService>;
  let mockHipaaAuditService: jest.Mocked<HIPAACompliantAuditService>;
  let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
  let mockQualityMetricsService: jest.Mocked<QualityMetricsService>;

  const mockPluginPackage = {
    metadata: {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      description: 'A test plugin',
      author: 'Test Author',
      license: 'MIT',
      dependencies: {},
      permissions: ['fhir', 'events'],
      entryPoint: 'index.js',
      tags: ['test', 'example'],
      category: 'utilities',
    },
    code: 'console.log("Hello, World!");',
    readme: '# Test Plugin\nA test plugin for testing purposes.',
    changelog: '## 1.0.0\n- Initial release',
    signature: 'valid-signature',
  };

  beforeEach(() => {
    mockPluginService = new PluginService(
      mockHipaaAuditService,
      mockSecurityAuditService,
      mockQualityMetricsService
    ) as jest.Mocked<PluginService>;

    mockHipaaAuditService = new HIPAACompliantAuditService() as jest.Mocked<HIPAACompliantAuditService>;
    mockSecurityAuditService = new SecurityAuditService() as jest.Mocked<SecurityAuditService>;
    mockQualityMetricsService = new QualityMetricsService() as jest.Mocked<QualityMetricsService>;

    mockHipaaAuditService.logEvent.mockResolvedValue();
    mockSecurityAuditService.recordAlert.mockResolvedValue();
    mockQualityMetricsService.recordMetric.mockResolvedValue();

    service = new PluginMarketplaceService(
      mockPluginService,
      mockHipaaAuditService,
      mockSecurityAuditService,
      mockQualityMetricsService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('publishPlugin', () => {
    it('should publish new plugin successfully', async () => {
      const pluginPublishedHandler = jest.fn();
      service.on('pluginPublished', pluginPublishedHandler);

      await service.publishPlugin(mockPluginPackage);

      expect(pluginPublishedHandler).toHaveBeenCalledWith({
        pluginId: mockPluginPackage.metadata.id,
        version: mockPluginPackage.metadata.version,
      });

      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SYSTEM_OPERATION',
          action: expect.objectContaining({
            type: 'CREATE',
            status: 'SUCCESS',
            details: expect.objectContaining({
              operation: 'PUBLISH_PLUGIN',
              pluginId: mockPluginPackage.metadata.id,
            }),
          }),
        })
      );

      const plugin = service.getPluginDetails(mockPluginPackage.metadata.id);
      expect(plugin).toBeDefined();
      expect(plugin?.latestVersion).toBe(mockPluginPackage.metadata.version);
    });

    it('should update existing plugin with new version', async () => {
      // Publish initial version
      await service.publishPlugin(mockPluginPackage);

      // Publish update
      const updatedPackage = {
        ...mockPluginPackage,
        metadata: {
          ...mockPluginPackage.metadata,
          version: '1.1.0',
        },
      };

      const pluginUpdatedHandler = jest.fn();
      service.on('pluginUpdated', pluginUpdatedHandler);

      await service.publishPlugin(updatedPackage);

      expect(pluginUpdatedHandler).toHaveBeenCalledWith({
        pluginId: updatedPackage.metadata.id,
        version: updatedPackage.metadata.version,
      });

      const plugin = service.getPluginDetails(updatedPackage.metadata.id);
      expect(plugin?.versions).toHaveLength(2);
      expect(plugin?.latestVersion).toBe('1.1.0');
    });

    it('should throw error when version is not greater than current', async () => {
      await service.publishPlugin(mockPluginPackage);

      await expect(service.publishPlugin(mockPluginPackage))
        .rejects
        .toThrow('New version must be greater than current version');

      expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
        'PLUGIN_PUBLISH_ERROR',
        'HIGH',
        expect.any(Object)
      );
    });

    it('should throw error when package is invalid', async () => {
      const invalidPackage = {
        ...mockPluginPackage,
        metadata: {
          ...mockPluginPackage.metadata,
          version: 'invalid',
        },
      };

      await expect(service.publishPlugin(invalidPackage))
        .rejects
        .toThrow('Invalid version format');
    });
  });

  describe('downloadPlugin', () => {
    beforeEach(async () => {
      await service.publishPlugin(mockPluginPackage);
    });

    it('should download latest version by default', async () => {
      const pluginDownloadedHandler = jest.fn();
      service.on('pluginDownloaded', pluginDownloadedHandler);

      const pkg = await service.downloadPlugin(mockPluginPackage.metadata.id);

      expect(pkg).toEqual(mockPluginPackage);
      expect(pluginDownloadedHandler).toHaveBeenCalledWith({
        pluginId: mockPluginPackage.metadata.id,
        version: mockPluginPackage.metadata.version,
      });

      const plugin = service.getPluginDetails(mockPluginPackage.metadata.id);
      expect(plugin?.totalDownloads).toBe(1);
    });

    it('should download specific version', async () => {
      // Publish new version
      const updatedPackage = {
        ...mockPluginPackage,
        metadata: {
          ...mockPluginPackage.metadata,
          version: '1.1.0',
        },
      };
      await service.publishPlugin(updatedPackage);

      const pkg = await service.downloadPlugin(
        mockPluginPackage.metadata.id,
        '1.0.0'
      );

      expect(pkg).toEqual(mockPluginPackage);
    });

    it('should throw error when plugin not found', async () => {
      await expect(service.downloadPlugin('non-existent'))
        .rejects
        .toThrow('Plugin non-existent not found');
    });

    it('should throw error when version not found', async () => {
      await expect(
        service.downloadPlugin(mockPluginPackage.metadata.id, '2.0.0')
      )
        .rejects
        .toThrow('Version 2.0.0 not found');
    });
  });

  describe('submitReview', () => {
    beforeEach(async () => {
      await service.publishPlugin(mockPluginPackage);
    });

    it('should submit review successfully', async () => {
      const reviewSubmittedHandler = jest.fn();
      service.on('reviewSubmitted', reviewSubmittedHandler);

      await service.submitReview(
        mockPluginPackage.metadata.id,
        mockPluginPackage.metadata.version,
        5,
        'Great plugin!',
        'Test User'
      );

      expect(reviewSubmittedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          pluginId: mockPluginPackage.metadata.id,
          version: mockPluginPackage.metadata.version,
          rating: 5,
        })
      );

      const plugin = service.getPluginDetails(mockPluginPackage.metadata.id);
      expect(plugin?.averageRating).toBe(5);
      expect(plugin?.totalRatings).toBe(1);

      const reviews = service.getPluginReviews(mockPluginPackage.metadata.id);
      expect(reviews).toHaveLength(1);
      expect(reviews[0].rating).toBe(5);
      expect(reviews[0].comment).toBe('Great plugin!');
    });

    it('should calculate average rating correctly', async () => {
      await service.submitReview(
        mockPluginPackage.metadata.id,
        mockPluginPackage.metadata.version,
        5,
        'Great!',
        'User 1'
      );

      await service.submitReview(
        mockPluginPackage.metadata.id,
        mockPluginPackage.metadata.version,
        3,
        'Good',
        'User 2'
      );

      const plugin = service.getPluginDetails(mockPluginPackage.metadata.id);
      expect(plugin?.averageRating).toBe(4);
      expect(plugin?.totalRatings).toBe(2);
    });

    it('should throw error when rating is invalid', async () => {
      await expect(
        service.submitReview(
          mockPluginPackage.metadata.id,
          mockPluginPackage.metadata.version,
          6,
          'Invalid rating',
          'Test User'
        )
      )
        .rejects
        .toThrow('Rating must be between 1 and 5');
    });
  });

  describe('searchPlugins', () => {
    beforeEach(async () => {
      // Publish multiple plugins for testing search
      await service.publishPlugin(mockPluginPackage);

      await service.publishPlugin({
        ...mockPluginPackage,
        metadata: {
          ...mockPluginPackage.metadata,
          id: 'another-plugin',
          name: 'Another Plugin',
          description: 'Another test plugin',
          tags: ['test', 'another'],
          category: 'tools',
        },
      });

      await service.publishPlugin({
        ...mockPluginPackage,
        metadata: {
          ...mockPluginPackage.metadata,
          id: 'third-plugin',
          name: 'Third Plugin',
          description: 'Yet another test plugin',
          tags: ['test', 'third'],
          category: 'utilities',
        },
      });
    });

    it('should search by query', async () => {
      const results = await service.searchPlugins({ query: 'another' });
      expect(results).toHaveLength(2);
      expect(results.map(p => p.name)).toContain('Another Plugin');
      expect(results.map(p => p.name)).toContain('Third Plugin');
    });

    it('should filter by tags', async () => {
      const results = await service.searchPlugins({ tags: ['another'] });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Another Plugin');
    });

    it('should filter by category', async () => {
      const results = await service.searchPlugins({ category: 'utilities' });
      expect(results).toHaveLength(2);
      expect(results.map(p => p.name)).toContain('Test Plugin');
      expect(results.map(p => p.name)).toContain('Third Plugin');
    });

    it('should sort by downloads', async () => {
      // Download plugins different number of times
      await service.downloadPlugin('test-plugin');
      await service.downloadPlugin('another-plugin');
      await service.downloadPlugin('another-plugin');
      await service.downloadPlugin('third-plugin');
      await service.downloadPlugin('third-plugin');
      await service.downloadPlugin('third-plugin');

      const results = await service.searchPlugins({
        sortBy: 'downloads',
        sortOrder: 'desc',
      });

      expect(results[0].id).toBe('third-plugin');
      expect(results[1].id).toBe('another-plugin');
      expect(results[2].id).toBe('test-plugin');
    });

    it('should sort by rating', async () => {
      // Add ratings to plugins
      await service.submitReview('test-plugin', '1.0.0', 3, 'Good', 'User 1');
      await service.submitReview('another-plugin', '1.0.0', 5, 'Great', 'User 1');
      await service.submitReview('third-plugin', '1.0.0', 4, 'Very good', 'User 1');

      const results = await service.searchPlugins({
        sortBy: 'rating',
        sortOrder: 'desc',
      });

      expect(results[0].id).toBe('another-plugin');
      expect(results[1].id).toBe('third-plugin');
      expect(results[2].id).toBe('test-plugin');
    });

    it('should apply pagination', async () => {
      const results = await service.searchPlugins({
        limit: 2,
        page: 1,
      });

      expect(results).toHaveLength(2);

      const nextPage = await service.searchPlugins({
        limit: 2,
        page: 2,
      });

      expect(nextPage).toHaveLength(1);
    });
  });
}); 