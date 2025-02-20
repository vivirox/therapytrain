import { Practitioner } from '../practitioner';
import { FHIRClient } from '../../fhir-client';
import { Practitioner as FHIRPractitioner } from '@smile-cdr/fhirts/dist/FHIR-R4';
import { EHRProvider } from '../../types';

jest.mock('../../fhir-client');

describe('Practitioner Resource', () => {
  let practitioner: Practitioner;
  let mockClient: jest.Mocked<FHIRClient>;

  const mockProvider: EHRProvider = {
    id: 'test-provider',
    name: 'Test Provider',
    baseUrl: 'https://test.fhir.org',
    authType: 'oauth2',
    settings: {
      clientId: 'test-client',
      clientSecret: 'test-secret',
      scope: ['practitioner.*'],
    },
  };

  beforeEach(() => {
    mockClient = new FHIRClient(mockProvider) as jest.Mocked<FHIRClient>;
    practitioner = new Practitioner(mockClient);
  });

  describe('create', () => {
    it('should create a practitioner successfully', async () => {
      const mockPractitioner: Partial<FHIRPractitioner> = {
        identifier: [{ system: 'test', value: 'test-id' }],
        name: [{ family: 'Doe', given: ['John'] }],
        telecom: [
          { system: 'email', value: 'john.doe@test.com' },
          { system: 'phone', value: '123-456-7890' },
        ],
      };

      const expectedResponse = {
        ...mockPractitioner,
        id: '123',
        resourceType: 'Practitioner',
      };

      mockClient.createResource.mockResolvedValueOnce(expectedResponse);

      const result = await practitioner.create(mockPractitioner);
      expect(result).toEqual(expectedResponse);
      expect(mockClient.createResource).toHaveBeenCalledWith('Practitioner', {
        ...mockPractitioner,
        resourceType: 'Practitioner',
      });
    });

    it('should throw error when identifier is missing', async () => {
      const mockPractitioner: Partial<FHIRPractitioner> = {
        name: [{ family: 'Doe', given: ['John'] }],
      };

      await expect(practitioner.create(mockPractitioner)).rejects.toThrow(
        'Practitioner must have at least one identifier'
      );
    });
  });

  describe('get', () => {
    it('should get a practitioner by id', async () => {
      const mockResponse: FHIRPractitioner = {
        id: '123',
        resourceType: 'Practitioner',
        identifier: [{ system: 'test', value: 'test-id' }],
        name: [{ family: 'Doe', given: ['John'] }],
      };

      mockClient.getResource.mockResolvedValueOnce(mockResponse);

      const result = await practitioner.get('123');
      expect(result).toEqual(mockResponse);
      expect(mockClient.getResource).toHaveBeenCalledWith('Practitioner', '123');
    });
  });

  describe('update', () => {
    it('should update a practitioner successfully', async () => {
      const mockPractitioner: Partial<FHIRPractitioner> = {
        name: [{ family: 'Doe', given: ['John', 'Middle'] }],
      };

      const expectedResponse = {
        ...mockPractitioner,
        id: '123',
        resourceType: 'Practitioner',
      };

      mockClient.updateResource.mockResolvedValueOnce(expectedResponse);

      const result = await practitioner.update('123', mockPractitioner);
      expect(result).toEqual(expectedResponse);
      expect(mockClient.updateResource).toHaveBeenCalledWith('Practitioner', '123', {
        ...mockPractitioner,
        resourceType: 'Practitioner',
        id: '123',
      });
    });
  });

  describe('search', () => {
    it('should search practitioners with various parameters', async () => {
      const searchParams = {
        name: 'Doe',
        specialty: 'cardiology',
        email: 'john.doe@test.com',
      };

      const mockResponse: FHIRPractitioner[] = [
        {
          id: '123',
          resourceType: 'Practitioner',
          identifier: [{ system: 'test', value: 'test-id' }],
          name: [{ family: 'Doe', given: ['John'] }],
        },
      ];

      mockClient.searchResources.mockResolvedValueOnce(mockResponse);

      const result = await practitioner.search(searchParams);
      expect(result).toEqual(mockResponse);
      expect(mockClient.searchResources).toHaveBeenCalledWith('Practitioner', {
        name: 'Doe',
        'qualification-code': 'cardiology',
        telecom: 'email|john.doe@test.com',
      });
    });
  });
}); 