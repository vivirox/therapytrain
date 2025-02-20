import { Patient as FHIRPatient } from '@smile-cdr/fhirts/dist/FHIR-R4';
import { FHIRClient } from '../fhir-client';
import { EHRError } from '../types';

export class Patient {
  private client: FHIRClient;

  constructor(client: FHIRClient) {
    this.client = client;
  }

  async create(patient: Partial<FHIRPatient>): Promise<FHIRPatient> {
    try {
      // Ensure required fields are present
      if (!patient.identifier || patient.identifier.length === 0) {
        throw new Error('Patient must have at least one identifier');
      }

      // Set resource type
      const resource: Partial<FHIRPatient> = {
        ...patient,
        resourceType: 'Patient',
      };

      return await this.client.createResource<FHIRPatient>('Patient', resource);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async get(id: string): Promise<FHIRPatient> {
    try {
      return await this.client.getResource<FHIRPatient>('Patient', id);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async update(id: string, patient: Partial<FHIRPatient>): Promise<FHIRPatient> {
    try {
      // Ensure resource type is set
      const resource: Partial<FHIRPatient> = {
        ...patient,
        resourceType: 'Patient',
        id,
      };

      return await this.client.updateResource<FHIRPatient>('Patient', id, resource);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.client.deleteResource('Patient', id);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async search(params: {
    family?: string;
    given?: string;
    identifier?: string;
    birthdate?: string;
    gender?: 'male' | 'female' | 'other' | 'unknown';
    address?: string;
    email?: string;
    phone?: string;
  }): Promise<FHIRPatient[]> {
    try {
      const searchParams: Record<string, string> = {};

      if (params.family) searchParams['family'] = params.family;
      if (params.given) searchParams['given'] = params.given;
      if (params.identifier) searchParams['identifier'] = params.identifier;
      if (params.birthdate) searchParams['birthdate'] = params.birthdate;
      if (params.gender) searchParams['gender'] = params.gender;
      if (params.address) searchParams['address'] = params.address;
      if (params.email) searchParams['telecom'] = `email|${params.email}`;
      if (params.phone) searchParams['telecom'] = `phone|${params.phone}`;

      return await this.client.searchResources<FHIRPatient>('Patient', searchParams);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): EHRError {
    if (error instanceof Error) {
      return {
        code: 'PATIENT_OPERATION_ERROR',
        message: error.message,
        details: error,
        timestamp: new Date().toISOString(),
        source: 'fhir',
      };
    }
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred while processing the patient operation',
      details: error,
      timestamp: new Date().toISOString(),
      source: 'internal',
    };
  }
} 