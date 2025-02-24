import { PractitionerRole } from '../practitioner-role';
import { FHIRClient } from '../../fhir-client';
import { PractitionerRole as FHIRPractitionerRole } from '@smile-cdr/fhirts/dist/FHIR-R4';
import { EHRProvider } from '../../types';

jest.mock('../../fhir-client');

describe('PractitionerRole Resource', () => {
  let practitionerRole: PractitionerRole;
  let mockClient: jest.Mocked<FHIRClient>;

  const mockProvider: EHRProvider = {
    id: 'test-provider',
    name: 'Test Provider',
    baseUrl: 'https://test.fhir.org',
    authType: 'oauth2',
    settings: {
      clientId: 'test-client',
      clientSecret: 'test-secret',
      scope: ['practitionerrole.*'],
    },
  };

  beforeEach(() => {
    mockClient = new FHIRClient(mockProvider) as jest.Mocked<FHIRClient>;
    practitionerRole = new PractitionerRole(mockClient);
  });

  describe('create', () => {
    it('should create a practitioner role successfully', async () => {
      const mockPractitionerRole: Partial<FHIRPractitionerRole> = {
        practitioner: { reference: 'Practitioner/123' },
        organization: { reference: 'Organization/456' },
        code: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/practitioner-role',
                code: 'doctor',
                display: 'Doctor',
              },
            ],
          },
        ],
        specialty: [
          {
            coding: [
              {
                system: 'http://snomed.info/sct',
                code: '394814009',
                display: 'General practice',
              },
            ],
          },
        ],
        telecom: [
          { system: 'email', value: 'doctor@test-hospital.com' },
          { system: 'phone', value: '123-456-7890' },
        ],
      };

      const expectedResponse = {
        ...mockPractitionerRole,
        id: '789',
        resourceType: 'PractitionerRole',
      };

      mockClient.createResource.mockResolvedValueOnce(expectedResponse);

      const result = await practitionerRole.create(mockPractitionerRole);
      expect(result).toEqual(expectedResponse);
      expect(mockClient.createResource).toHaveBeenCalledWith('PractitionerRole', {
        ...mockPractitionerRole,
        resourceType: 'PractitionerRole',
      });
    });

    it('should throw error when practitioner reference is missing', async () => {
      const mockPractitionerRole: Partial<FHIRPractitionerRole> = {
        organization: { reference: 'Organization/456' },
      };

      await expect(practitionerRole.create(mockPractitionerRole)).rejects.toThrow(
        'PractitionerRole must have both practitioner and organization references'
      );
    });

    it('should throw error when organization reference is missing', async () => {
      const mockPractitionerRole: Partial<FHIRPractitionerRole> = {
        practitioner: { reference: 'Practitioner/123' },
      };

      await expect(practitionerRole.create(mockPractitionerRole)).rejects.toThrow(
        'PractitionerRole must have both practitioner and organization references'
      );
    });
  });

  describe('get', () => {
    it('should get a practitioner role by id', async () => {
      const mockResponse: FHIRPractitionerRole = {
        id: '789',
        resourceType: 'PractitionerRole',
        practitioner: { reference: 'Practitioner/123' },
        organization: { reference: 'Organization/456' },
      };

      mockClient.getResource.mockResolvedValueOnce(mockResponse);

      const result = await practitionerRole.get('789');
      expect(result).toEqual(mockResponse);
      expect(mockClient.getResource).toHaveBeenCalledWith('PractitionerRole', '789');
    });
  });

  describe('update', () => {
    it('should update a practitioner role successfully', async () => {
      const mockPractitionerRole: Partial<FHIRPractitionerRole> = {
        specialty: [
          {
            coding: [
              {
                system: 'http://snomed.info/sct',
                code: '394592004',
                display: 'Clinical oncology',
              },
            ],
          },
        ],
      };

      const expectedResponse = {
        ...mockPractitionerRole,
        id: '789',
        resourceType: 'PractitionerRole',
      };

      mockClient.updateResource.mockResolvedValueOnce(expectedResponse);

      const result = await practitionerRole.update('789', mockPractitionerRole);
      expect(result).toEqual(expectedResponse);
      expect(mockClient.updateResource).toHaveBeenCalledWith('PractitionerRole', '789', {
        ...mockPractitionerRole,
        resourceType: 'PractitionerRole',
        id: '789',
      });
    });
  });

  describe('search', () => {
    it('should search practitioner roles with various parameters', async () => {
      const searchParams = {
        practitioner: 'Practitioner/123',
        organization: 'Organization/456',
        role: 'doctor',
        specialty: 'general-practice',
        active: true,
        email: 'doctor@test-hospital.com',
      };

      const mockResponse: FHIRPractitionerRole[] = [
        {
          id: '789',
          resourceType: 'PractitionerRole',
          practitioner: { reference: 'Practitioner/123' },
          organization: { reference: 'Organization/456' },
          active: true,
        },
      ];

      mockClient.searchResources.mockResolvedValueOnce(mockResponse);

      const result = await practitionerRole.search(searchParams);
      expect(result).toEqual(mockResponse);
      expect(mockClient.searchResources).toHaveBeenCalledWith('PractitionerRole', {
        practitioner: 'Practitioner/123',
        organization: 'Organization/456',
        role: 'doctor',
        specialty: 'general-practice',
        active: 'true',
        telecom: 'email|doctor@test-hospital.com',
      });
    });
  });
}); 