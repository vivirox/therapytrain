import { EHRIntegrationService } from '../EHRIntegrationService';
import { HIPAACompliantAuditService } from '../../HIPAACompliantAuditService';
import { SecurityAuditService } from '../../SecurityAuditService';
import { DataRetentionService } from '../../DataRetentionService';
import { QualityMetricsService } from '../../QualityMetricsService';
import { EpicProvider } from '@/integrations/ehr/providers/epic';
import { CernerProvider } from '@/integrations/ehr/providers/cerner';
import { AllscriptsProvider } from '@/integrations/ehr/providers/allscripts';
import { AthenahealthProvider } from '@/integrations/ehr/providers/athenahealth';
import { FHIRClient } from '@/integrations/ehr/fhir-client';

jest.mock('../../HIPAACompliantAuditService');
jest.mock('../../SecurityAuditService');
jest.mock('../../DataRetentionService');
jest.mock('../../QualityMetricsService');
jest.mock('@/integrations/ehr/providers/epic');
jest.mock('@/integrations/ehr/providers/cerner');
jest.mock('@/integrations/ehr/providers/allscripts');
jest.mock('@/integrations/ehr/providers/athenahealth');
jest.mock('@/integrations/ehr/fhir-client');

describe('EHRIntegrationService', () => {
  let service: EHRIntegrationService;
  let mockHipaaAuditService: jest.Mocked<HIPAACompliantAuditService>;
  let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
  let mockDataRetentionService: jest.Mocked<DataRetentionService>;
  let mockQualityMetricsService: jest.Mocked<QualityMetricsService>;

  const mockEpicConfig = {
    vendor: 'epic' as const,
    baseUrl: 'https://epic-fhir.example.com',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    scopes: ['patient/*.read', 'user/*.read'],
    fhirVersion: '4.0.1' as const,
  };

  const mockCernerConfig = {
    vendor: 'cerner' as const,
    baseUrl: 'https://fhir-ehr.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    scopes: ['system/Patient.read', 'system/Practitioner.read'],
    fhirVersion: '4.0.1' as const,
  };

  const mockAllscriptsConfig = {
    vendor: 'allscripts' as const,
    baseUrl: 'https://fhirapi.allscripts.com/v1/fhir/r4',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    scopes: ['system/Patient.read', 'system/Practitioner.read'],
    fhirVersion: '4.0.1' as const,
  };

  const mockAthenahealthConfig = {
    vendor: 'athenahealth' as const,
    baseUrl: 'https://api.athenahealth.com/fhir/r4',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    scopes: ['system/Patient.read', 'system/Practitioner.read'],
    fhirVersion: '4.0.1' as const,
  };

  beforeEach(() => {
    mockHipaaAuditService = new HIPAACompliantAuditService() as jest.Mocked<HIPAACompliantAuditService>;
    mockSecurityAuditService = new SecurityAuditService() as jest.Mocked<SecurityAuditService>;
    mockDataRetentionService = new DataRetentionService() as jest.Mocked<DataRetentionService>;
    mockQualityMetricsService = new QualityMetricsService() as jest.Mocked<QualityMetricsService>;

    service = new EHRIntegrationService(
      mockHipaaAuditService,
      mockSecurityAuditService,
      mockDataRetentionService,
      mockQualityMetricsService
    );

    // Mock HIPAA audit logging
    mockHipaaAuditService.logEvent.mockResolvedValue();
    mockSecurityAuditService.recordAlert.mockResolvedValue();
    mockQualityMetricsService.recordMetric.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('configureEHRProvider', () => {
    it('should configure Epic provider successfully', async () => {
      await service.configureEHRProvider('epic-provider', mockEpicConfig);

      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SYSTEM_OPERATION',
          action: expect.objectContaining({
            type: 'CREATE',
            status: 'SUCCESS',
            details: expect.objectContaining({
              operation: 'CONFIGURE_EHR_PROVIDER',
              providerId: 'epic-provider',
              vendor: 'epic',
            }),
          }),
        })
      );
    });

    it('should configure Cerner provider successfully', async () => {
      await service.configureEHRProvider('cerner-provider', mockCernerConfig);

      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SYSTEM_OPERATION',
          action: expect.objectContaining({
            type: 'CREATE',
            status: 'SUCCESS',
            details: expect.objectContaining({
              operation: 'CONFIGURE_EHR_PROVIDER',
              providerId: 'cerner-provider',
              vendor: 'cerner',
            }),
          }),
        })
      );
    });

    it('should configure Allscripts provider successfully', async () => {
      await service.configureEHRProvider('allscripts-provider', mockAllscriptsConfig);

      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SYSTEM_OPERATION',
          action: expect.objectContaining({
            type: 'CREATE',
            status: 'SUCCESS',
            details: expect.objectContaining({
              operation: 'CONFIGURE_EHR_PROVIDER',
              providerId: 'allscripts-provider',
              vendor: 'allscripts',
            }),
          }),
        })
      );
    });

    it('should configure Athenahealth provider successfully', async () => {
      await service.configureEHRProvider('athenahealth-provider', mockAthenahealthConfig);

      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SYSTEM_OPERATION',
          action: expect.objectContaining({
            type: 'CREATE',
            status: 'SUCCESS',
            details: expect.objectContaining({
              operation: 'CONFIGURE_EHR_PROVIDER',
              providerId: 'athenahealth-provider',
              vendor: 'athenahealth',
            }),
          }),
        })
      );
    });

    it('should handle configuration errors', async () => {
      const invalidConfig = { ...mockEpicConfig, baseUrl: '' };

      await expect(service.configureEHRProvider('test-provider', invalidConfig))
        .rejects
        .toThrow();

      expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
        'EHR_CONFIG_ERROR',
        'HIGH',
        expect.any(Object)
      );
    });

    it('should validate Cerner URL format', async () => {
      const invalidConfig = { ...mockCernerConfig, baseUrl: 'https://invalid-url.com' };

      await expect(service.configureEHRProvider('cerner-provider', invalidConfig))
        .rejects
        .toThrow('Invalid Cerner FHIR URL format');
    });

    it('should validate Allscripts URL format', async () => {
      const invalidConfig = { ...mockAllscriptsConfig, baseUrl: 'https://invalid-url.com' };

      await expect(service.configureEHRProvider('allscripts-provider', invalidConfig))
        .rejects
        .toThrow('Invalid Allscripts FHIR URL format');
    });

    it('should validate Athenahealth URL format', async () => {
      const invalidConfig = { ...mockAthenahealthConfig, baseUrl: 'https://invalid-url.com' };

      await expect(service.configureEHRProvider('athenahealth-provider', invalidConfig))
        .rejects
        .toThrow('Invalid Athenahealth FHIR URL format');
    });
  });

  describe('connect', () => {
    describe('Epic provider', () => {
      beforeEach(async () => {
        await service.configureEHRProvider('epic-provider', mockEpicConfig);
      });

      it('should connect to Epic successfully', async () => {
        const mockEpicProvider = {
          connect: jest.fn().mockResolvedValue(undefined),
          getClient: jest.fn().mockReturnValue(new FHIRClient({
            id: 'epic',
            name: 'Epic EHR',
            baseUrl: mockEpicConfig.baseUrl,
            authType: 'oauth2',
            settings: {
              clientId: mockEpicConfig.clientId,
              clientSecret: mockEpicConfig.clientSecret,
              scope: mockEpicConfig.scopes,
            },
          })),
        };

        (EpicProvider as jest.Mock).mockImplementation(() => mockEpicProvider);

        await service.connect('epic-provider');

        expect(mockEpicProvider.connect).toHaveBeenCalled();
        expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'SYSTEM_OPERATION',
            action: expect.objectContaining({
              type: 'UPDATE',
              status: 'SUCCESS',
              details: expect.objectContaining({
                operation: 'CONNECT_EHR_PROVIDER',
                providerId: 'epic-provider',
                vendor: 'epic',
              }),
            }),
          })
        );
      });
    });

    describe('Cerner provider', () => {
      beforeEach(async () => {
        await service.configureEHRProvider('cerner-provider', mockCernerConfig);
      });

      it('should connect to Cerner successfully', async () => {
        const mockCernerProvider = {
          connect: jest.fn().mockResolvedValue(undefined),
          getClient: jest.fn().mockReturnValue(new FHIRClient({
            id: 'cerner',
            name: 'Cerner EHR',
            baseUrl: mockCernerConfig.baseUrl,
            authType: 'oauth2',
            settings: {
              clientId: mockCernerConfig.clientId,
              clientSecret: mockCernerConfig.clientSecret,
              scope: mockCernerConfig.scopes,
            },
          })),
        };

        (CernerProvider as jest.Mock).mockImplementation(() => mockCernerProvider);

        await service.connect('cerner-provider');

        expect(mockCernerProvider.connect).toHaveBeenCalled();
        expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'SYSTEM_OPERATION',
            action: expect.objectContaining({
              type: 'UPDATE',
              status: 'SUCCESS',
              details: expect.objectContaining({
                operation: 'CONNECT_EHR_PROVIDER',
                providerId: 'cerner-provider',
                vendor: 'cerner',
              }),
            }),
          })
        );
      });

      it('should handle connection errors', async () => {
        const mockError = new Error('Connection failed');
        const mockCernerProvider = {
          connect: jest.fn().mockRejectedValue(mockError),
        };

        (CernerProvider as jest.Mock).mockImplementation(() => mockCernerProvider);

        await expect(service.connect('cerner-provider'))
          .rejects
          .toThrow('Connection failed');

        expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
          'EHR_CONNECTION_ERROR',
          'HIGH',
          expect.objectContaining({
            error: 'Connection failed',
            providerId: 'cerner-provider',
          })
        );
      });
    });

    describe('Allscripts provider', () => {
      beforeEach(async () => {
        await service.configureEHRProvider('allscripts-provider', mockAllscriptsConfig);
      });

      it('should connect to Allscripts successfully', async () => {
        const mockAllscriptsProvider = {
          connect: jest.fn().mockResolvedValue(undefined),
          getClient: jest.fn().mockReturnValue(new FHIRClient({
            id: 'allscripts',
            name: 'Allscripts EHR',
            baseUrl: mockAllscriptsConfig.baseUrl,
            authType: 'oauth2',
            settings: {
              clientId: mockAllscriptsConfig.clientId,
              clientSecret: mockAllscriptsConfig.clientSecret,
              scope: mockAllscriptsConfig.scopes,
            },
          })),
        };

        (AllscriptsProvider as jest.Mock).mockImplementation(() => mockAllscriptsProvider);

        await service.connect('allscripts-provider');

        expect(mockAllscriptsProvider.connect).toHaveBeenCalled();
        expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'SYSTEM_OPERATION',
            action: expect.objectContaining({
              type: 'UPDATE',
              status: 'SUCCESS',
              details: expect.objectContaining({
                operation: 'CONNECT_EHR_PROVIDER',
                providerId: 'allscripts-provider',
                vendor: 'allscripts',
              }),
            }),
          })
        );
      });

      it('should handle connection errors', async () => {
        const mockError = new Error('Connection failed');
        const mockAllscriptsProvider = {
          connect: jest.fn().mockRejectedValue(mockError),
        };

        (AllscriptsProvider as jest.Mock).mockImplementation(() => mockAllscriptsProvider);

        await expect(service.connect('allscripts-provider'))
          .rejects
          .toThrow('Connection failed');

        expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
          'EHR_CONNECTION_ERROR',
          'HIGH',
          expect.objectContaining({
            error: 'Connection failed',
            providerId: 'allscripts-provider',
          })
        );
      });
    });

    describe('Athenahealth provider', () => {
      beforeEach(async () => {
        await service.configureEHRProvider('athenahealth-provider', mockAthenahealthConfig);
      });

      it('should connect to Athenahealth successfully', async () => {
        const mockAthenahealthProvider = {
          connect: jest.fn().mockResolvedValue(undefined),
          getClient: jest.fn().mockReturnValue(new FHIRClient({
            id: 'athenahealth',
            name: 'Athenahealth EHR',
            baseUrl: mockAthenahealthConfig.baseUrl,
            authType: 'oauth2',
            settings: {
              clientId: mockAthenahealthConfig.clientId,
              clientSecret: mockAthenahealthConfig.clientSecret,
              scope: mockAthenahealthConfig.scopes,
            },
          })),
        };

        (AthenahealthProvider as jest.Mock).mockImplementation(() => mockAthenahealthProvider);

        await service.connect('athenahealth-provider');

        expect(mockAthenahealthProvider.connect).toHaveBeenCalled();
        expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'SYSTEM_OPERATION',
            action: expect.objectContaining({
              type: 'UPDATE',
              status: 'SUCCESS',
              details: expect.objectContaining({
                operation: 'CONNECT_EHR_PROVIDER',
                providerId: 'athenahealth-provider',
                vendor: 'athenahealth',
              }),
            }),
          })
        );
      });

      it('should handle connection errors', async () => {
        const mockError = new Error('Connection failed');
        const mockAthenahealthProvider = {
          connect: jest.fn().mockRejectedValue(mockError),
        };

        (AthenahealthProvider as jest.Mock).mockImplementation(() => mockAthenahealthProvider);

        await expect(service.connect('athenahealth-provider'))
          .rejects
          .toThrow('Connection failed');

        expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
          'EHR_CONNECTION_ERROR',
          'HIGH',
          expect.objectContaining({
            error: 'Connection failed',
            providerId: 'athenahealth-provider',
          })
        );
      });
    });

    it('should throw error for non-existent provider', async () => {
      await expect(service.connect('non-existent'))
        .rejects
        .toThrow('No configuration found for provider non-existent');
    });
  });

  describe('getFHIRClient', () => {
    beforeEach(async () => {
      await service.configureEHRProvider('epic-provider', mockEpicConfig);
      await service.configureEHRProvider('cerner-provider', mockCernerConfig);
      await service.configureEHRProvider('allscripts-provider', mockAllscriptsConfig);
      await service.configureEHRProvider('athenahealth-provider', mockAthenahealthConfig);
    });

    it('should return Epic FHIR client after successful connection', async () => {
      const mockFHIRClient = new FHIRClient({
        id: 'epic',
        name: 'Epic EHR',
        baseUrl: mockEpicConfig.baseUrl,
        authType: 'oauth2',
        settings: {
          clientId: mockEpicConfig.clientId,
          clientSecret: mockEpicConfig.clientSecret,
          scope: mockEpicConfig.scopes,
        },
      });

      const mockEpicProvider = {
        connect: jest.fn().mockResolvedValue(undefined),
        getClient: jest.fn().mockReturnValue(mockFHIRClient),
      };

      (EpicProvider as jest.Mock).mockImplementation(() => mockEpicProvider);

      await service.connect('epic-provider');
      const client = service.getFHIRClient('epic-provider');

      expect(client).toBe(mockFHIRClient);
      expect(mockEpicProvider.getClient).toHaveBeenCalled();
    });

    it('should return Cerner FHIR client after successful connection', async () => {
      const mockFHIRClient = new FHIRClient({
        id: 'cerner',
        name: 'Cerner EHR',
        baseUrl: mockCernerConfig.baseUrl,
        authType: 'oauth2',
        settings: {
          clientId: mockCernerConfig.clientId,
          clientSecret: mockCernerConfig.clientSecret,
          scope: mockCernerConfig.scopes,
        },
      });

      const mockCernerProvider = {
        connect: jest.fn().mockResolvedValue(undefined),
        getClient: jest.fn().mockReturnValue(mockFHIRClient),
      };

      (CernerProvider as jest.Mock).mockImplementation(() => mockCernerProvider);

      await service.connect('cerner-provider');
      const client = service.getFHIRClient('cerner-provider');

      expect(client).toBe(mockFHIRClient);
      expect(mockCernerProvider.getClient).toHaveBeenCalled();
    });

    it('should return Allscripts FHIR client after successful connection', async () => {
      const mockFHIRClient = new FHIRClient({
        id: 'allscripts',
        name: 'Allscripts EHR',
        baseUrl: mockAllscriptsConfig.baseUrl,
        authType: 'oauth2',
        settings: {
          clientId: mockAllscriptsConfig.clientId,
          clientSecret: mockAllscriptsConfig.clientSecret,
          scope: mockAllscriptsConfig.scopes,
        },
      });

      const mockAllscriptsProvider = {
        connect: jest.fn().mockResolvedValue(undefined),
        getClient: jest.fn().mockReturnValue(mockFHIRClient),
      };

      (AllscriptsProvider as jest.Mock).mockImplementation(() => mockAllscriptsProvider);

      await service.connect('allscripts-provider');
      const client = service.getFHIRClient('allscripts-provider');

      expect(client).toBe(mockFHIRClient);
      expect(mockAllscriptsProvider.getClient).toHaveBeenCalled();
    });

    it('should return Athenahealth FHIR client after successful connection', async () => {
      const mockFHIRClient = new FHIRClient({
        id: 'athenahealth',
        name: 'Athenahealth EHR',
        baseUrl: mockAthenahealthConfig.baseUrl,
        authType: 'oauth2',
        settings: {
          clientId: mockAthenahealthConfig.clientId,
          clientSecret: mockAthenahealthConfig.clientSecret,
          scope: mockAthenahealthConfig.scopes,
        },
      });

      const mockAthenahealthProvider = {
        connect: jest.fn().mockResolvedValue(undefined),
        getClient: jest.fn().mockReturnValue(mockFHIRClient),
      };

      (AthenahealthProvider as jest.Mock).mockImplementation(() => mockAthenahealthProvider);

      await service.connect('athenahealth-provider');
      const client = service.getFHIRClient('athenahealth-provider');

      expect(client).toBe(mockFHIRClient);
      expect(mockAthenahealthProvider.getClient).toHaveBeenCalled();
    });

    it('should throw error for non-existent provider', () => {
      expect(() => service.getFHIRClient('non-existent'))
        .toThrow('No provider found for non-existent');
    });
  });

  describe('event handling', () => {
    it('should record metrics for connection events', async () => {
      await service.configureEHRProvider('epic-provider', mockEpicConfig);
      const mockEpicProvider = {
        connect: jest.fn().mockResolvedValue(undefined),
        getClient: jest.fn(),
      };
      (EpicProvider as jest.Mock).mockImplementation(() => mockEpicProvider);

      await service.connect('epic-provider');

      expect(mockQualityMetricsService.recordMetric).toHaveBeenCalledWith(
        'ehr_connection',
        expect.objectContaining({
          providerId: 'epic-provider',
          status: 'connected',
          timestamp: expect.any(String),
        })
      );
    });
  });
}); 