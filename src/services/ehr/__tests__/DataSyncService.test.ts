import { DataSyncService } from '../DataSyncService';
import { EHRIntegrationService } from '../EHRIntegrationService';
import { HIPAACompliantAuditService } from '../../HIPAACompliantAuditService';
import { SecurityAuditService } from '../../SecurityAuditService';
import { QualityMetricsService } from '../../QualityMetricsService';
import { FHIRClient } from '@/integrations/ehr/fhir-client';
import { Resource } from '@smile-cdr/fhirts/dist/FHIR-R4';

jest.mock('../EHRIntegrationService');
jest.mock('../../HIPAACompliantAuditService');
jest.mock('../../SecurityAuditService');
jest.mock('../../QualityMetricsService');
jest.mock('@/integrations/ehr/fhir-client');

describe('DataSyncService', () => {
  let service: DataSyncService;
  let mockEHRService: jest.Mocked<EHRIntegrationService>;
  let mockHipaaAuditService: jest.Mocked<HIPAACompliantAuditService>;
  let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
  let mockQualityMetricsService: jest.Mocked<QualityMetricsService>;
  let mockFHIRClient: jest.Mocked<FHIRClient>;

  const mockProviderId = 'test-provider';
  const mockResources: Resource[] = [
    {
      resourceType: 'Patient',
      id: 'patient-1',
      meta: {
        versionId: '1',
        lastUpdated: '2024-03-20T12:00:00Z',
      },
    },
    {
      resourceType: 'Practitioner',
      id: 'practitioner-1',
      meta: {
        versionId: '1',
        lastUpdated: '2024-03-20T12:00:00Z',
      },
    },
  ];

  beforeEach(() => {
    mockEHRService = new EHRIntegrationService(
      mockHipaaAuditService,
      mockSecurityAuditService,
      {} as any,
      mockQualityMetricsService
    ) as jest.Mocked<EHRIntegrationService>;

    mockHipaaAuditService = new HIPAACompliantAuditService() as jest.Mocked<HIPAACompliantAuditService>;
    mockSecurityAuditService = new SecurityAuditService() as jest.Mocked<SecurityAuditService>;
    mockQualityMetricsService = new QualityMetricsService() as jest.Mocked<QualityMetricsService>;
    mockFHIRClient = new FHIRClient({
      id: 'test',
      name: 'Test Client',
      baseUrl: 'https://test.fhir.org',
      authType: 'oauth2',
      settings: {
        clientId: 'test',
        clientSecret: 'test',
        scope: ['patient.*'],
      },
    }) as jest.Mocked<FHIRClient>;

    // Mock HIPAA audit logging
    mockHipaaAuditService.logEvent.mockResolvedValue();
    mockSecurityAuditService.recordAlert.mockResolvedValue();
    mockQualityMetricsService.recordMetric.mockResolvedValue();

    // Mock FHIR client
    mockEHRService.getFHIRClient.mockReturnValue(mockFHIRClient);
    mockFHIRClient.searchResources.mockResolvedValue(mockResources);

    service = new DataSyncService(
      mockEHRService,
      mockHipaaAuditService,
      mockSecurityAuditService,
      mockQualityMetricsService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startSync', () => {
    it('should start synchronization with default config', async () => {
      const syncStartedHandler = jest.fn();
      const syncCompletedHandler = jest.fn();
      const resourceSyncedHandler = jest.fn();

      service.on('syncStarted', syncStartedHandler);
      service.on('syncCompleted', syncCompletedHandler);
      service.on('resourceSynced', resourceSyncedHandler);

      await service.startSync(mockProviderId);

      expect(syncStartedHandler).toHaveBeenCalledWith({ providerId: mockProviderId });
      expect(syncCompletedHandler).toHaveBeenCalledWith({ providerId: mockProviderId });
      expect(resourceSyncedHandler).toHaveBeenCalledTimes(mockResources.length);

      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SYSTEM_OPERATION',
          action: expect.objectContaining({
            type: 'UPDATE',
            status: 'SUCCESS',
            details: expect.objectContaining({
              operation: 'EHR_DATA_SYNC',
              providerId: mockProviderId,
            }),
          }),
        })
      );
    });

    it('should handle sync errors', async () => {
      const error = new Error('Sync failed');
      mockFHIRClient.searchResources.mockRejectedValueOnce(error);

      const syncErrorHandler = jest.fn();
      service.on('syncError', syncErrorHandler);

      await expect(service.startSync(mockProviderId)).rejects.toThrow('Sync failed');

      expect(syncErrorHandler).toHaveBeenCalledWith({
        providerId: mockProviderId,
        error: 'Sync failed',
        details: undefined,
      });

      expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
        'EHR_SYNC_ERROR',
        'HIGH',
        expect.objectContaining({
          error: 'Sync failed',
          providerId: mockProviderId,
        })
      );
    });

    it('should respect custom sync configuration', async () => {
      const customConfig = {
        batchSize: 50,
        maxRetries: 5,
        retryDelay: 1000,
        resourceTypes: ['Patient'],
      };

      await service.startSync(mockProviderId, customConfig);

      expect(mockFHIRClient.searchResources).toHaveBeenCalledWith(
        'Patient',
        expect.objectContaining({
          _count: '50',
        })
      );
    });

    it('should handle empty resource batches', async () => {
      mockFHIRClient.searchResources.mockResolvedValueOnce([]);

      await service.startSync(mockProviderId);

      const status = service.getSyncStatus(mockProviderId);
      expect(status?.inProgress).toBe(false);
      expect(status?.lastSync).toBeInstanceOf(Date);
    });

    it('should implement retry mechanism for failed resources', async () => {
      const error = new Error('Resource sync failed');
      mockFHIRClient.searchResources
        .mockResolvedValueOnce(mockResources)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockResources);

      await service.startSync(mockProviderId);

      expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
        'EHR_SYNC_ERROR',
        'HIGH',
        expect.any(Object)
      );
    });
  });

  describe('sync status management', () => {
    it('should track sync progress correctly', async () => {
      await service.startSync(mockProviderId);

      const status = service.getSyncStatus(mockProviderId);
      expect(status).toBeDefined();
      expect(status?.inProgress).toBe(false);
      expect(status?.lastSync).toBeInstanceOf(Date);
      expect(status?.progress).toEqual(
        expect.objectContaining({
          completed: expect.any(Number),
          failed: expect.any(Number),
        })
      );
    });

    it('should handle concurrent sync requests', async () => {
      const syncPromises = [
        service.startSync(mockProviderId),
        service.startSync(mockProviderId),
      ];

      await expect(Promise.all(syncPromises)).rejects.toThrow('Failed to acquire lock');
    });
  });

  describe('event handling', () => {
    it('should emit events in correct order', async () => {
      const events: string[] = [];

      service.on('syncStarted', () => events.push('started'));
      service.on('resourceSynced', () => events.push('resource'));
      service.on('syncCompleted', () => events.push('completed'));

      await service.startSync(mockProviderId);

      expect(events[0]).toBe('started');
      expect(events[events.length - 1]).toBe('completed');
    });

    it('should record metrics for sync events', async () => {
      await service.startSync(mockProviderId);

      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'ehr_sync_started',
        expect.any(Object)
      );
      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'ehr_sync_completed',
        expect.any(Object)
      );
      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'ehr_resource_synced',
        expect.any(Object)
      );
    });
  });

  describe('locking mechanism', () => {
    it('should prevent concurrent sync of same resource type', async () => {
      // Start first sync
      const firstSync = service.startSync(mockProviderId);

      // Attempt second sync immediately
      const secondSync = service.startSync(mockProviderId);

      await expect(secondSync).rejects.toThrow('Failed to acquire lock');
      await expect(firstSync).resolves.not.toThrow();
    });

    it('should release locks after sync completion', async () => {
      // First sync
      await service.startSync(mockProviderId);

      // Second sync should succeed after first one completes
      await expect(service.startSync(mockProviderId)).resolves.not.toThrow();
    });

    it('should release locks after sync failure', async () => {
      const error = new Error('Sync failed');
      mockFHIRClient.searchResources.mockRejectedValueOnce(error);

      // First sync fails
      await expect(service.startSync(mockProviderId)).rejects.toThrow('Sync failed');

      // Second sync should succeed after first one fails
      mockFHIRClient.searchResources.mockResolvedValueOnce(mockResources);
      await expect(service.startSync(mockProviderId)).resolves.not.toThrow();
    });
  });
}); 