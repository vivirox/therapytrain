import { Organization } from '../organization';
import { FHIRClient } from '../../fhir-client';
import { Organization as FHIROrganization } from '@smile-cdr/fhirts/dist/FHIR-R4';
import { EHRProvider } from '../../types';

jest.mock('../../fhir-client');

describe('Organization Resource', () => {
  let organization: Organization;
  let mockClient: jest.Mocked<FHIRClient>;

  const mockProvider: EHRProvider = {
    id: 'test-provider',
    name: 'Test Provider',
    baseUrl: 'https://test.fhir.org',
    authType: 'oauth2',
    settings: {
      clientId: 'test-client',
      clientSecret: 'test-secret',
      scope: ['organization.*'],
    },
  };

  beforeEach(() => {
    mockClient = new FHIRClient(mockProvider) as jest.Mocked<FHIRClient>;
    organization = new Organization(mockClient);
  });

  describe('create', () => {
    it('should create an organization successfully', async () => {
      const mockOrganization: Partial<FHIROrganization> = {
        identifier: [{ system: 'test', value: 'test-id' }],
        name: 'Test Hospital',
        telecom: [
          { system: 'email', value: 'info@test-hospital.com' },
          { system: 'phone', value: '123-456-7890' },
        ],
        address: [{
          line: ['123 Test St'],
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'Test Country'
        }],
      };

      const expectedResponse = {
        ...mockOrganization,
        id: '123',
        resourceType: 'Organization',
      };

      mockClient.createResource.mockResolvedValueOnce(expectedResponse);

      const result = await organization.create(mockOrganization);
      expect(result).toEqual(expectedResponse);
      expect(mockClient.createResource).toHaveBeenCalledWith('Organization', {
        ...mockOrganization,
        resourceType: 'Organization',
      });
    });

    it('should throw error when identifier is missing', async () => {
      const mockOrganization: Partial<FHIROrganization> = {
        name: 'Test Hospital',
      };

      await expect(organization.create(mockOrganization)).rejects.toThrow(
        'Organization must have at least one identifier'
      );
    });

    it('should throw error when name is missing', async () => {
      const mockOrganization: Partial<FHIROrganization> = {
        identifier: [{ system: 'test', value: 'test-id' }],
      };

      await expect(organization.create(mockOrganization)).rejects.toThrow(
        'Organization must have a name'
      );
    });
  });

  describe('get', () => {
    it('should get an organization by id', async () => {
      const mockResponse: FHIROrganization = {
        id: '123',
        resourceType: 'Organization',
        identifier: [{ system: 'test', value: 'test-id' }],
        name: 'Test Hospital',
      };

      mockClient.getResource.mockResolvedValueOnce(mockResponse);

      const result = await organization.get('123');
      expect(result).toEqual(mockResponse);
      expect(mockClient.getResource).toHaveBeenCalledWith('Organization', '123');
    });
  });

  describe('update', () => {
    it('should update an organization successfully', async () => {
      const mockOrganization: Partial<FHIROrganization> = {
        name: 'Updated Test Hospital',
        telecom: [
          { system: 'email', value: 'new@test-hospital.com' },
        ],
      };

      const expectedResponse = {
        ...mockOrganization,
        id: '123',
        resourceType: 'Organization',
      };

      mockClient.updateResource.mockResolvedValueOnce(expectedResponse);

      const result = await organization.update('123', mockOrganization);
      expect(result).toEqual(expectedResponse);
      expect(mockClient.updateResource).toHaveBeenCalledWith('Organization', '123', {
        ...mockOrganization,
        resourceType: 'Organization',
        id: '123',
      });
    });
  });

  describe('search', () => {
    it('should search organizations with various parameters', async () => {
      const searchParams = {
        name: 'Hospital',
        type: 'prov',
        active: true,
        email: 'info@test-hospital.com',
      };

      const mockResponse: FHIROrganization[] = [
        {
          id: '123',
          resourceType: 'Organization',
          identifier: [{ system: 'test', value: 'test-id' }],
          name: 'Test Hospital',
          active: true,
        },
      ];

      mockClient.searchResources.mockResolvedValueOnce(mockResponse);

      const result = await organization.search(searchParams);
      expect(result).toEqual(mockResponse);
      expect(mockClient.searchResources).toHaveBeenCalledWith('Organization', {
        name: 'Hospital',
        type: 'prov',
        active: 'true',
        telecom: 'email|info@test-hospital.com',
      });
    });
  });
}); 