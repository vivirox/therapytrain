import { EventEmitter } from 'events';
import { HIPAACompliantAuditService } from '../HIPAACompliantAuditService';
import { SecurityAuditService } from '../SecurityAuditService';
import { QualityMetricsService } from '../QualityMetricsService';
import { VM } from 'vm2';

interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  dependencies: Record<string, string>;
  permissions: string[];
  entryPoint: string;
}

interface PluginConfig {
  enabled: boolean;
  settings: Record<string, unknown>;
  allowedAPIs: string[];
  resourceLimits?: {
    maxMemory?: number;
    maxCPU?: number;
    timeout?: number;
  };
}

interface PluginInstance {
  metadata: PluginMetadata;
  config: PluginConfig;
  sandbox: VM;
  status: 'installed' | 'enabled' | 'disabled' | 'error';
  error?: Error;
  lastStarted?: Date;
  lastStopped?: Date;
  metrics: {
    invocations: number;
    errors: number;
    avgExecutionTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

interface PluginAPI {
  fhir: {
    search: (resourceType: string, params: Record<string, string>) => Promise<unknown[]>;
    create: (resourceType: string, resource: unknown) => Promise<unknown>;
    update: (resourceType: string, id: string, resource: unknown) => Promise<unknown>;
    delete: (resourceType: string, id: string) => Promise<void>;
  };
  events: {
    on: (event: string, handler: (data: unknown) => void) => void;
    emit: (event: string, data: unknown) => void;
  };
  storage: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
  http: {
    get: (url: string, options?: RequestInit) => Promise<Response>;
    post: (url: string, data: unknown, options?: RequestInit) => Promise<Response>;
  };
}

@singleton()
export class PluginService extends EventEmitter {
  private plugins: Map<string, PluginInstance>;
  private readonly DEFAULT_RESOURCE_LIMITS = {
    maxMemory: 256 * 1024 * 1024, // 256MB
    maxCPU: 1000, // 1 CPU core
    timeout: 5000, // 5 seconds
  };

  constructor(
    private readonly hipaaAuditService: HIPAACompliantAuditService,
    private readonly securityAuditService: SecurityAuditService,
    private readonly qualityMetricsService: QualityMetricsService
  ) {
    super();
    this.plugins = new Map();
    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    this.on('pluginInstalled', this.handlePluginInstalled.bind(this));
    this.on('pluginEnabled', this.handlePluginEnabled.bind(this));
    this.on('pluginDisabled', this.handlePluginDisabled.bind(this));
    this.on('pluginError', this.handlePluginError.bind(this));
  }

  async installPlugin(
    metadata: PluginMetadata,
    code: string,
    config?: Partial<PluginConfig>
  ): Promise<void> {
    try {
      // Validate plugin metadata
      this.validateMetadata(metadata);

      // Check if plugin already exists
      if (this.plugins.has(metadata.id)) {
        throw new Error(`Plugin ${metadata.id} already installed`);
      }

      // Create plugin configuration
      const pluginConfig: PluginConfig = {
        enabled: false,
        settings: {},
        allowedAPIs: ['fhir', 'events', 'storage'],
        resourceLimits: this.DEFAULT_RESOURCE_LIMITS,
        ...config,
      };

      // Create sandbox environment
      const sandbox = this.createSandbox(metadata, pluginConfig);

      // Create plugin instance
      const plugin: PluginInstance = {
        metadata,
        config: pluginConfig,
        sandbox,
        status: 'installed',
        metrics: {
          invocations: 0,
          errors: 0,
          avgExecutionTime: 0,
          memoryUsage: 0,
          cpuUsage: 0,
        },
      };

      // Store plugin
      this.plugins.set(metadata.id, plugin);

      await this.hipaaAuditService.logEvent({
        eventType: 'SYSTEM_OPERATION',
        action: {
          type: 'CREATE',
          status: 'SUCCESS',
          details: {
            operation: 'INSTALL_PLUGIN',
            pluginId: metadata.id,
            version: metadata.version,
          },
        },
      });

      await this.qualityMetricsService.recordMetric('plugin_installed', {
        pluginId: metadata.id,
        version: metadata.version,
      });

      this.emit('pluginInstalled', { metadata });
    } catch (error) {
      await this.handleError('PLUGIN_INSTALLATION_ERROR', error, {
        pluginId: metadata.id,
      });
      throw error;
    }
  }

  async enablePlugin(pluginId: string): Promise<void> {
    const plugin = this.getPlugin(pluginId);

    try {
      // Initialize plugin in sandbox
      await this.initializePlugin(plugin);

      plugin.status = 'enabled';
      plugin.lastStarted = new Date();

      await this.hipaaAuditService.logEvent({
        eventType: 'SYSTEM_OPERATION',
        action: {
          type: 'UPDATE',
          status: 'SUCCESS',
          details: {
            operation: 'ENABLE_PLUGIN',
            pluginId,
          },
        },
      });

      await this.qualityMetricsService.recordMetric('plugin_enabled', {
        pluginId,
      });

      this.emit('pluginEnabled', { pluginId });
    } catch (error) {
      plugin.status = 'error';
      plugin.error = error as Error;
      await this.handleError('PLUGIN_ENABLE_ERROR', error, { pluginId });
      throw error;
    }
  }

  async disablePlugin(pluginId: string): Promise<void> {
    const plugin = this.getPlugin(pluginId);

    try {
      // Cleanup plugin resources
      await this.cleanupPlugin(plugin);

      plugin.status = 'disabled';
      plugin.lastStopped = new Date();

      await this.hipaaAuditService.logEvent({
        eventType: 'SYSTEM_OPERATION',
        action: {
          type: 'UPDATE',
          status: 'SUCCESS',
          details: {
            operation: 'DISABLE_PLUGIN',
            pluginId,
          },
        },
      });

      await this.qualityMetricsService.recordMetric('plugin_disabled', {
        pluginId,
      });

      this.emit('pluginDisabled', { pluginId });
    } catch (error) {
      await this.handleError('PLUGIN_DISABLE_ERROR', error, { pluginId });
      throw error;
    }
  }

  async uninstallPlugin(pluginId: string): Promise<void> {
    const plugin = this.getPlugin(pluginId);

    try {
      if (plugin.status === 'enabled') {
        await this.disablePlugin(pluginId);
      }

      // Remove plugin
      this.plugins.delete(pluginId);

      await this.hipaaAuditService.logEvent({
        eventType: 'SYSTEM_OPERATION',
        action: {
          type: 'DELETE',
          status: 'SUCCESS',
          details: {
            operation: 'UNINSTALL_PLUGIN',
            pluginId,
          },
        },
      });

      await this.qualityMetricsService.recordMetric('plugin_uninstalled', {
        pluginId,
      });

      this.emit('pluginUninstalled', { pluginId });
    } catch (error) {
      await this.handleError('PLUGIN_UNINSTALL_ERROR', error, { pluginId });
      throw error;
    }
  }

  getPluginStatus(pluginId: string): PluginInstance | null {
    return this.plugins.get(pluginId) || null;
  }

  private getPlugin(pluginId: string): PluginInstance {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    return plugin;
  }

  private validateMetadata(metadata: PluginMetadata): void {
    const requiredFields = ['id', 'name', 'version', 'author', 'entryPoint'];
    for (const field of requiredFields) {
      if (!metadata[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate version format (semver)
    if (!/^\d+\.\d+\.\d+$/.test(metadata.version)) {
      throw new Error('Invalid version format. Must be semver (e.g., 1.0.0)');
    }

    // Validate permissions
    if (metadata.permissions) {
      const validPermissions = ['fhir', 'events', 'storage', 'http'];
      for (const permission of metadata.permissions) {
        if (!validPermissions.includes(permission)) {
          throw new Error(`Invalid permission: ${permission}`);
        }
      }
    }
  }

  private createSandbox(
    metadata: PluginMetadata,
    config: PluginConfig
  ): VM {
    // Create restricted sandbox environment
    const sandbox = new VM({
      timeout: config.resourceLimits?.timeout || this.DEFAULT_RESOURCE_LIMITS.timeout,
      sandbox: {},
    });

    // Add allowed APIs to sandbox
    const api: Partial<PluginAPI> = {};

    if (config.allowedAPIs.includes('fhir')) {
      api.fhir = {
        search: async (resourceType, params) => {
          // Implement FHIR search
          return [];
        },
        create: async (resourceType, resource) => {
          // Implement FHIR create
          return resource;
        },
        update: async (resourceType, id, resource) => {
          // Implement FHIR update
          return resource;
        },
        delete: async (resourceType, id) => {
          // Implement FHIR delete
        },
      };
    }

    if (config.allowedAPIs.includes('events')) {
      api.events = {
        on: (event, handler) => {
          // Implement event subscription
        },
        emit: (event, data) => {
          // Implement event emission
        },
      };
    }

    if (config.allowedAPIs.includes('storage')) {
      api.storage = {
        get: async (key) => {
          // Implement storage get
          return null;
        },
        set: async (key, value) => {
          // Implement storage set
        },
        delete: async (key) => {
          // Implement storage delete
        },
      };
    }

    if (config.allowedAPIs.includes('http')) {
      api.http = {
        get: async (url, options) => {
          // Implement HTTP GET with restrictions
          return {} as Response;
        },
        post: async (url, data, options) => {
          // Implement HTTP POST with restrictions
          return {} as Response;
        },
      };
    }

    sandbox.freeze(api, 'api');
    return sandbox;
  }

  private async initializePlugin(plugin: PluginInstance): Promise<void> {
    try {
      // Initialize plugin in sandbox
      await plugin.sandbox.run('initialize()');
    } catch (error) {
      throw new Error(`Failed to initialize plugin: ${error.message}`);
    }
  }

  private async cleanupPlugin(plugin: PluginInstance): Promise<void> {
    try {
      // Cleanup plugin resources
      await plugin.sandbox.run('cleanup()');
    } catch (error) {
      throw new Error(`Failed to cleanup plugin: ${error.message}`);
    }
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

    this.emit('pluginError', {
      type,
      error: error instanceof Error ? error.message : 'Unknown error',
      details,
    });
  }

  private async handlePluginInstalled(event: { metadata: PluginMetadata }): Promise<void> {
    await this.qualityMetricsService.recordMetric('plugin_lifecycle', {
      event: 'installed',
      pluginId: event.metadata.id,
      version: event.metadata.version,
      timestamp: new Date().toISOString(),
    });
  }

  private async handlePluginEnabled(event: { pluginId: string }): Promise<void> {
    await this.qualityMetricsService.recordMetric('plugin_lifecycle', {
      event: 'enabled',
      pluginId: event.pluginId,
      timestamp: new Date().toISOString(),
    });
  }

  private async handlePluginDisabled(event: { pluginId: string }): Promise<void> {
    await this.qualityMetricsService.recordMetric('plugin_lifecycle', {
      event: 'disabled',
      pluginId: event.pluginId,
      timestamp: new Date().toISOString(),
    });
  }

  private async handlePluginError(event: {
    type: string;
    error: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    await this.qualityMetricsService.recordMetric('plugin_error', {
      type: event.type,
      error: event.error,
      details: event.details,
      timestamp: new Date().toISOString(),
    });
  }
} 