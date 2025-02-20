import { EventEmitter } from 'events';
import { HIPAACompliantAuditService } from '../HIPAACompliantAuditService';
import { SecurityAuditService } from '../SecurityAuditService';
import { DataRetentionService } from '../DataRetentionService';
import { QualityMetricsService } from '../QualityMetricsService';
import { HIPAAEventType, HIPAAActionType } from '@/types/hipaa';
import { EpicProvider } from '@/integrations/ehr/providers/epic';
import { CernerProvider } from '@/integrations/ehr/providers/cerner';
import { AllscriptsProvider } from '@/integrations/ehr/providers/allscripts';
import { AthenahealthProvider } from '@/integrations/ehr/providers/athenahealth';
import { FHIRClient } from '@/integrations/ehr/fhir-client';

interface EHRConfig {
  vendor: 'epic' | 'cerner' | 'allscripts' | 'athenahealth';
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  fhirVersion: '4.0.1' | '3.0.2';
}

interface EHRConnectionStatus {
  isConnected: boolean;
  lastSync: Date | null;
  error?: string;
}

type EHRProvider = EpicProvider | CernerProvider | AllscriptsProvider | AthenahealthProvider;

@singleton()
export class EHRIntegrationService extends EventEmitter {
  private static instance: EHRIntegrationService;
  private readonly configs: Map<string, EHRConfig> = new Map();
  private readonly connectionStatus: Map<string, EHRConnectionStatus> = new Map();
  private readonly providers: Map<string, EHRProvider> = new Map();
  
  constructor(
    private readonly hipaaAuditService: HIPAACompliantAuditService,
    private readonly securityAuditService: SecurityAuditService,
    private readonly dataRetentionService: DataRetentionService,
    private readonly qualityMetricsService: QualityMetricsService
  ) {
    super();
    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    this.on('ehrConnection', this.handleEHRConnection.bind(this));
    this.on('dataSync', this.handleDataSync.bind(this));
    this.on('error', this.handleError.bind(this));
  }

  async configureEHRProvider(providerId: string, config: EHRConfig): Promise<void> {
    try {
      // Validate config
      this.validateConfig(config);
      
      // Store configuration
      this.configs.set(providerId, config);
      
      // Initialize connection status
      this.connectionStatus.set(providerId, {
        isConnected: false,
        lastSync: null
      });

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
            operation: 'CONFIGURE_EHR_PROVIDER',
            providerId,
            vendor: config.vendor
          }
        },
        resource: {
          type: 'SYSTEM',
          id: providerId,
          description: 'EHR Provider Configuration'
        }
      });
    } catch (error) {
      await this.securityAuditService.recordAlert('EHR_CONFIG_ERROR', 'HIGH', {
        error: error instanceof Error ? error.message : 'Unknown error',
        providerId
      });
      throw error;
    }
  }

  async connect(providerId: string): Promise<void> {
    const config = this.configs.get(providerId);
    if (!config) {
      throw new Error(`No configuration found for provider ${providerId}`);
    }

    try {
      // Create and connect provider based on vendor
      let provider: EHRProvider;
      switch (config.vendor) {
        case 'epic': {
          provider = new EpicProvider(config);
          break;
        }
        case 'cerner': {
          provider = new CernerProvider(config);
          break;
        }
        case 'allscripts': {
          provider = new AllscriptsProvider(config);
          break;
        }
        case 'athenahealth': {
          provider = new AthenahealthProvider(config);
          break;
        }
        default:
          throw new Error(`Unknown vendor: ${config.vendor}`);
      }

      // Connect the provider
      await provider.connect();
      this.providers.set(providerId, provider);

      // Update connection status
      this.connectionStatus.set(providerId, {
        isConnected: true,
        lastSync: new Date()
      });

      this.emit('ehrConnection', {
        providerId,
        status: 'connected'
      });

      await this.hipaaAuditService.logEvent({
        eventType: HIPAAEventType.SYSTEM_OPERATION,
        timestamp: new Date(),
        actor: {
          id: 'SYSTEM',
          role: 'SYSTEM',
          ipAddress: '127.0.0.1'
        },
        action: {
          type: HIPAAActionType.UPDATE,
          status: 'SUCCESS',
          details: {
            operation: 'CONNECT_EHR_PROVIDER',
            providerId,
            vendor: config.vendor
          }
        },
        resource: {
          type: 'SYSTEM',
          id: providerId,
          description: 'EHR Provider Connection'
        }
      });
    } catch (error) {
      await this.handleError(providerId, error);
      throw error;
    }
  }

  private async handleError(providerId: string, error: unknown): Promise<void> {
    this.connectionStatus.set(providerId, {
      isConnected: false,
      lastSync: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    await this.securityAuditService.recordAlert('EHR_CONNECTION_ERROR', 'HIGH', {
      error: error instanceof Error ? error.message : 'Unknown error',
      providerId
    });

    this.emit('error', {
      providerId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  private validateConfig(config: EHRConfig): void {
    const requiredFields = ['vendor', 'baseUrl', 'clientId', 'clientSecret', 'scopes', 'fhirVersion'];
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate vendor-specific requirements
    switch (config.vendor) {
      case 'epic':
        // Epic-specific validation could go here
        break;
      case 'cerner':
        if (!config.baseUrl.includes('fhir-ehr')) {
          throw new Error('Invalid Cerner FHIR URL format');
        }
        break;
      case 'allscripts':
        if (!config.baseUrl.includes('fhirapi')) {
          throw new Error('Invalid Allscripts FHIR URL format');
        }
        break;
      case 'athenahealth':
        if (!config.baseUrl.includes('athenahealth.com/fhir')) {
          throw new Error('Invalid Athenahealth FHIR URL format');
        }
        break;
    }
  }

  getFHIRClient(providerId: string): FHIRClient {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`No provider found for ${providerId}`);
    }
    return provider.getClient();
  }

  private async handleEHRConnection(event: { providerId: string; status: string }): Promise<void> {
    // Handle connection events (could be used for monitoring, metrics, etc.)
    await this.qualityMetricsService.recordMetric('ehr_connection', {
      providerId: event.providerId,
      status: event.status,
      timestamp: new Date().toISOString(),
    });
  }

  private async handleDataSync(event: { providerId: string; resourceType: string }): Promise<void> {
    // Handle data sync events (could be used for monitoring, metrics, etc.)
    await this.qualityMetricsService.recordMetric('ehr_sync', {
      providerId: event.providerId,
      resourceType: event.resourceType,
      timestamp: new Date().toISOString(),
    });
  }
} 