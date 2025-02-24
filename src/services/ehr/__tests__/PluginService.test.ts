import { PluginService } from '../PluginService';
import { HIPAACompliantAuditService } from '../../HIPAACompliantAuditService';
import { SecurityAuditService } from '../../SecurityAuditService';
import { QualityMetricsService } from '../../QualityMetricsService';
import { VM } from 'vm2';

jest.mock('../../HIPAACompliantAuditService');
jest.mock('../../SecurityAuditService');
jest.mock('../../QualityMetricsService');
jest.mock('vm2');

describe('PluginService', () => {
  let service: PluginService;
  let mockHipaaAuditService: jest.Mocked<HIPAACompliantAuditService>;
  let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
  let mockQualityMetricsService: jest.Mocked<QualityMetricsService>;
  let mockVM: jest.Mocked<VM>;

  const mockPluginMetadata = {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    description: 'A test plugin',
    author: 'Test Author',
    license: 'MIT',
    dependencies: {},
    permissions: ['fhir', 'events'],
    entryPoint: 'index.js',
  };

  const mockPluginCode = `
    function initialize() {
      // Plugin initialization code
    }

    function cleanup() {
      // Plugin cleanup code
    }
  `;

  beforeEach(() => {
    mockHipaaAuditService = new HIPAACompliantAuditService() as jest.Mocked<HIPAACompliantAuditService>;
    mockSecurityAuditService = new SecurityAuditService() as jest.Mocked<SecurityAuditService>;
    mockQualityMetricsService = new QualityMetricsService() as jest.Mocked<QualityMetricsService>;

    mockHipaaAuditService.logEvent.mockResolvedValue();
    mockSecurityAuditService.recordAlert.mockResolvedValue();
    mockQualityMetricsService.recordMetric.mockResolvedValue();

    mockVM = {
      run: jest.fn().mockResolvedValue(undefined),
      freeze: jest.fn(),
    } as unknown as jest.Mocked<VM>;

    (VM as jest.Mock).mockImplementation(() => mockVM);

    service = new PluginService(
      mockHipaaAuditService,
      mockSecurityAuditService,
      mockQualityMetricsService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('installPlugin', () => {
    it('should install plugin with valid metadata and code', async () => {
      const pluginInstalledHandler = jest.fn();
      service.on('pluginInstalled', pluginInstalledHandler);

      await service.installPlugin(mockPluginMetadata, mockPluginCode);

      expect(pluginInstalledHandler).toHaveBeenCalledWith({
        metadata: mockPluginMetadata,
      });

      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SYSTEM_OPERATION',
          action: expect.objectContaining({
            type: 'CREATE',
            status: 'SUCCESS',
            details: expect.objectContaining({
              operation: 'INSTALL_PLUGIN',
              pluginId: mockPluginMetadata.id,
            }),
          }),
        })
      );

      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'plugin_installed',
        expect.objectContaining({
          pluginId: mockPluginMetadata.id,
          version: mockPluginMetadata.version,
        })
      );
    });

    it('should throw error when plugin already exists', async () => {
      await service.installPlugin(mockPluginMetadata, mockPluginCode);

      await expect(service.installPlugin(mockPluginMetadata, mockPluginCode))
        .rejects
        .toThrow(`Plugin ${mockPluginMetadata.id} already installed`);

      expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
        'PLUGIN_INSTALLATION_ERROR',
        'HIGH',
        expect.any(Object)
      );
    });

    it('should throw error when metadata is invalid', async () => {
      const invalidMetadata = { ...mockPluginMetadata, version: 'invalid' };

      await expect(service.installPlugin(invalidMetadata, mockPluginCode))
        .rejects
        .toThrow('Invalid version format');
    });

    it('should throw error when permissions are invalid', async () => {
      const invalidMetadata = {
        ...mockPluginMetadata,
        permissions: ['invalid'],
      };

      await expect(service.installPlugin(invalidMetadata, mockPluginCode))
        .rejects
        .toThrow('Invalid permission: invalid');
    });
  });

  describe('enablePlugin', () => {
    beforeEach(async () => {
      await service.installPlugin(mockPluginMetadata, mockPluginCode);
    });

    it('should enable installed plugin', async () => {
      const pluginEnabledHandler = jest.fn();
      service.on('pluginEnabled', pluginEnabledHandler);

      await service.enablePlugin(mockPluginMetadata.id);

      expect(pluginEnabledHandler).toHaveBeenCalledWith({
        pluginId: mockPluginMetadata.id,
      });

      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SYSTEM_OPERATION',
          action: expect.objectContaining({
            type: 'UPDATE',
            status: 'SUCCESS',
            details: expect.objectContaining({
              operation: 'ENABLE_PLUGIN',
              pluginId: mockPluginMetadata.id,
            }),
          }),
        })
      );

      const status = service.getPluginStatus(mockPluginMetadata.id);
      expect(status?.status).toBe('enabled');
      expect(status?.lastStarted).toBeInstanceOf(Date);
    });

    it('should handle initialization errors', async () => {
      mockVM.run.mockRejectedValueOnce(new Error('Initialization failed'));

      await expect(service.enablePlugin(mockPluginMetadata.id))
        .rejects
        .toThrow('Failed to initialize plugin: Initialization failed');

      const status = service.getPluginStatus(mockPluginMetadata.id);
      expect(status?.status).toBe('error');
      expect(status?.error?.message).toBe('Failed to initialize plugin: Initialization failed');
    });
  });

  describe('disablePlugin', () => {
    beforeEach(async () => {
      await service.installPlugin(mockPluginMetadata, mockPluginCode);
      await service.enablePlugin(mockPluginMetadata.id);
    });

    it('should disable enabled plugin', async () => {
      const pluginDisabledHandler = jest.fn();
      service.on('pluginDisabled', pluginDisabledHandler);

      await service.disablePlugin(mockPluginMetadata.id);

      expect(pluginDisabledHandler).toHaveBeenCalledWith({
        pluginId: mockPluginMetadata.id,
      });

      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SYSTEM_OPERATION',
          action: expect.objectContaining({
            type: 'UPDATE',
            status: 'SUCCESS',
            details: expect.objectContaining({
              operation: 'DISABLE_PLUGIN',
              pluginId: mockPluginMetadata.id,
            }),
          }),
        })
      );

      const status = service.getPluginStatus(mockPluginMetadata.id);
      expect(status?.status).toBe('disabled');
      expect(status?.lastStopped).toBeInstanceOf(Date);
    });

    it('should handle cleanup errors', async () => {
      mockVM.run.mockRejectedValueOnce(new Error('Cleanup failed'));

      await expect(service.disablePlugin(mockPluginMetadata.id))
        .rejects
        .toThrow('Failed to cleanup plugin: Cleanup failed');

      expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
        'PLUGIN_DISABLE_ERROR',
        'HIGH',
        expect.any(Object)
      );
    });
  });

  describe('uninstallPlugin', () => {
    beforeEach(async () => {
      await service.installPlugin(mockPluginMetadata, mockPluginCode);
    });

    it('should uninstall plugin', async () => {
      const pluginUninstalledHandler = jest.fn();
      service.on('pluginUninstalled', pluginUninstalledHandler);

      await service.uninstallPlugin(mockPluginMetadata.id);

      expect(pluginUninstalledHandler).toHaveBeenCalledWith({
        pluginId: mockPluginMetadata.id,
      });

      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SYSTEM_OPERATION',
          action: expect.objectContaining({
            type: 'DELETE',
            status: 'SUCCESS',
            details: expect.objectContaining({
              operation: 'UNINSTALL_PLUGIN',
              pluginId: mockPluginMetadata.id,
            }),
          }),
        })
      );

      expect(service.getPluginStatus(mockPluginMetadata.id)).toBeNull();
    });

    it('should disable enabled plugin before uninstalling', async () => {
      await service.enablePlugin(mockPluginMetadata.id);
      await service.uninstallPlugin(mockPluginMetadata.id);

      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: expect.objectContaining({
            details: expect.objectContaining({
              operation: 'DISABLE_PLUGIN',
            }),
          }),
        })
      );
    });
  });

  describe('sandbox security', () => {
    beforeEach(async () => {
      await service.installPlugin(mockPluginMetadata, mockPluginCode);
    });

    it('should create sandbox with allowed APIs only', async () => {
      expect(mockVM.freeze).toHaveBeenCalledWith(
        expect.objectContaining({
          fhir: expect.any(Object),
          events: expect.any(Object),
        }),
        'api'
      );

      // HTTP API should not be included by default
      expect(mockVM.freeze).not.toHaveBeenCalledWith(
        expect.objectContaining({
          http: expect.any(Object),
        }),
        'api'
      );
    });

    it('should respect resource limits', async () => {
      const customConfig = {
        resourceLimits: {
          timeout: 1000,
        },
      };

      await service.installPlugin(mockPluginMetadata, mockPluginCode, customConfig);

      expect(VM).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 1000,
        })
      );
    });
  });

  describe('metrics and monitoring', () => {
    beforeEach(async () => {
      await service.installPlugin(mockPluginMetadata, mockPluginCode);
    });

    it('should record lifecycle metrics', async () => {
      await service.enablePlugin(mockPluginMetadata.id);
      await service.disablePlugin(mockPluginMetadata.id);

      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'plugin_lifecycle',
        expect.objectContaining({
          event: 'enabled',
          pluginId: mockPluginMetadata.id,
        })
      );

      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'plugin_lifecycle',
        expect.objectContaining({
          event: 'disabled',
          pluginId: mockPluginMetadata.id,
        })
      );
    });

    it('should record error metrics', async () => {
      mockVM.run.mockRejectedValueOnce(new Error('Test error'));

      try {
        await service.enablePlugin(mockPluginMetadata.id);
      } catch {
        // Ignore error
      }

      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'plugin_error',
        expect.objectContaining({
          type: 'PLUGIN_ENABLE_ERROR',
          error: 'Failed to initialize plugin: Test error',
        })
      );
    });
  });
}); 