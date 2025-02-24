import { Patient } from '../patient';
import { FHIRClient } from '../../fhir-client';
import { Patient as FHIRPatient } from '@smile-cdr/fhirts/dist/FHIR-R4';
import { EHRProvider } from '../../types';

// Mock FHIRClient
jest.mock('../../fhir-client');

describe('Patient Resource', () => {
  let patient: Patient;
  let mockClient: jest.Mocked<FHIRClient>;

  const mockProvider: EHRProvider = {
    id: 'test-provider',
    name: 'Test Provider',
    baseUrl: 'http://test.com/fhir',
    authType: 'apikey',
    settings: {
      apiKey: 'test-key',
    },
  };

  const mockPatientData: Partial<FHIRPatient> = {
    resourceType: 'Patient',
    id: 'test-patient-id',
    identifier: [
      {
        system: 'http://test.com/identifiers',
        value: 'TEST001',
      },
    ],
    name: [
      {
        family: 'Doe',
        given: ['John'],
      },
    ],
    gender: 'male',
    birthDate: '1990-01-01',
  };

  beforeEach(() => {
    mockClient = new FHIRClient(mockProvider) as jest.Mocked<FHIRClient>;
    patient = new Patient(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a patient successfully', async () => {
      mockClient.createResource.mockResolvedValue(mockPatientData as FHIRPatient);

      const result = await patient.create(mockPatientData);

      expect(mockClient.createResource).toHaveBeenCalledWith('Patient', mockPatientData);
      expect(result).toEqual(mockPatientData);
    });

    it('should throw error when creating patient without identifier', async () => {
      const invalidPatient = { ...mockPatientData };
      delete invalidPatient.identifier;

      await expect(patient.create(invalidPatient)).rejects.toThrow('Patient must have at least one identifier');
    });
  });

  describe('get', () => {
    it('should get a patient by id successfully', async () => {
      mockClient.getResource.mockResolvedValue(mockPatientData as FHIRPatient);

      const result = await patient.get('test-patient-id');

      expect(mockClient.getResource).toHaveBeenCalledWith('Patient', 'test-patient-id');
      expect(result).toEqual(mockPatientData);
    });
  });

  describe('update', () => {
    it('should update a patient successfully', async () => {
      const updatedData = {
        ...mockPatientData,
        name: [
          {
            family: 'Doe',
            given: ['John', 'Middle'],
          },
        ],
      };

      mockClient.updateResource.mockResolvedValue(updatedData as FHIRPatient);

      const result = await patient.update('test-patient-id', updatedData);

      expect(mockClient.updateResource).toHaveBeenCalledWith('Patient', 'test-patient-id', {
        ...updatedData,
        resourceType: 'Patient',
        id: 'test-patient-id',
      });
      expect(result).toEqual(updatedData);
    });
  });

  describe('delete', () => {
    it('should delete a patient successfully', async () => {
      mockClient.deleteResource.mockResolvedValue();

      await patient.delete('test-patient-id');

      expect(mockClient.deleteResource).toHaveBeenCalledWith('Patient', 'test-patient-id');
    });
  });

  describe('search', () => {
    it('should search patients with various parameters', async () => {
      const searchParams = {
        family: 'Doe',
        given: 'John',
        gender: 'male' as const,
        birthdate: '1990-01-01',
      };

      mockClient.searchResources.mockResolvedValue([mockPatientData as FHIRPatient]);

      const result = await patient.search(searchParams);

      expect(mockClient.searchResources).toHaveBeenCalledWith('Patient', {
        family: 'Doe',
        given: 'John',
        gender: 'male',
        birthdate: '1990-01-01',
      });
      expect(result).toEqual([mockPatientData]);
    });

    it('should handle empty search results', async () => {
      mockClient.searchResources.mockResolvedValue([]);

      const result = await patient.search({ family: 'NonExistent' });

      expect(mockClient.searchResources).toHaveBeenCalledWith('Patient', { family: 'NonExistent' });
      expect(result).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle and transform errors properly', async () => {
      const error = new Error('Test error');
      mockClient.getResource.mockRejectedValue(error);

      await expect(patient.get('test-patient-id')).rejects.toEqual({
        code: 'PATIENT_OPERATION_ERROR',
        message: 'Test error',
        details: error,
        timestamp: expect.any(String),
        source: 'fhir',
      });
    });

    it('should handle unknown errors', async () => {
      mockClient.getResource.mockRejectedValue('Unknown error');

      await expect(patient.get('test-patient-id')).rejects.toEqual({
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred while processing the patient operation',
        details: 'Unknown error',
        timestamp: expect.any(String),
        source: 'internal',
      });
    });
  });
}); 