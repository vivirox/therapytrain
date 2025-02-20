import { Practitioner as FHIRPractitioner } from '@smile-cdr/fhirts/dist/FHIR-R4';
import { FHIRClient } from '../fhir-client';
import { EHRError } from '../types';

export class Practitioner {
  private client: FHIRClient;

  constructor(client: FHIRClient) {
    this.client = client;
  }

  async create(practitioner: Partial<FHIRPractitioner>): Promise<FHIRPractitioner> {
    try {
      // Ensure required fields are present
      if (!practitioner.identifier || practitioner.identifier.length === 0) {
        throw new Error('Practitioner must have at least one identifier');
      }

      // Set resource type
      const resource: Partial<FHIRPractitioner> = {
        ...practitioner,
        resourceType: 'Practitioner',
      };

      return await this.client.createResource<FHIRPractitioner>('Practitioner', resource);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async get(id: string): Promise<FHIRPractitioner> {
    try {
      return await this.client.getResource<FHIRPractitioner>('Practitioner', id);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async update(id: string, practitioner: Partial<FHIRPractitioner>): Promise<FHIRPractitioner> {
    try {
      // Ensure resource type is set
      const resource: Partial<FHIRPractitioner> = {
        ...practitioner,
        resourceType: 'Practitioner',
        id,
      };

      return await this.client.updateResource<FHIRPractitioner>('Practitioner', id, resource);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async search(params: {
    identifier?: string;
    name?: string;
    given?: string;
    family?: string;
    specialty?: string;
    qualification?: string;
    communication?: string;
    email?: string;
    phone?: string;
  }): Promise<FHIRPractitioner[]> {
    try {
      const searchParams: Record<string, string> = {};

      if (params.identifier) searchParams['identifier'] = params.identifier;
      if (params.name) searchParams['name'] = params.name;
      if (params.given) searchParams['given'] = params.given;
      if (params.family) searchParams['family'] = params.family;
      if (params.specialty) searchParams['qualification-code'] = params.specialty;
      if (params.qualification) searchParams['qualification'] = params.qualification;
      if (params.communication) searchParams['communication'] = params.communication;
      if (params.email) searchParams['telecom'] = `email|${params.email}`;
      if (params.phone) searchParams['telecom'] = `phone|${params.phone}`;

      return await this.client.searchResources<FHIRPractitioner>('Practitioner', searchParams);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): EHRError {
    if (error instanceof Error) {
      return {
        code: 'PRACTITIONER_OPERATION_ERROR',
        message: error.message,
        details: error,
        timestamp: new Date().toISOString(),
        source: 'fhir',
      };
    }
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred while processing the practitioner operation',
      details: error,
      timestamp: new Date().toISOString(),
      source: 'internal',
    };
  }
} 