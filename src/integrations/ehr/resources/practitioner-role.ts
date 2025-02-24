import { PractitionerRole as FHIRPractitionerRole } from '@smile-cdr/fhirts/dist/FHIR-R4';
import { FHIRClient } from '../fhir-client';
import { EHRError } from '../types';

export class PractitionerRole {
  private client: FHIRClient;

  constructor(client: FHIRClient) {
    this.client = client;
  }

  async create(practitionerRole: Partial<FHIRPractitionerRole>): Promise<FHIRPractitionerRole> {
    try {
      // Ensure required fields are present
      if (!practitionerRole.practitioner || !practitionerRole.organization) {
        throw new Error('PractitionerRole must have both practitioner and organization references');
      }

      // Set resource type
      const resource: Partial<FHIRPractitionerRole> = {
        ...practitionerRole,
        resourceType: 'PractitionerRole',
      };

      return await this.client.createResource<FHIRPractitionerRole>('PractitionerRole', resource);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async get(id: string): Promise<FHIRPractitionerRole> {
    try {
      return await this.client.getResource<FHIRPractitionerRole>('PractitionerRole', id);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async update(id: string, practitionerRole: Partial<FHIRPractitionerRole>): Promise<FHIRPractitionerRole> {
    try {
      // Ensure resource type is set
      const resource: Partial<FHIRPractitionerRole> = {
        ...practitionerRole,
        resourceType: 'PractitionerRole',
        id,
      };

      return await this.client.updateResource<FHIRPractitionerRole>('PractitionerRole', id, resource);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async search(params: {
    practitioner?: string;
    organization?: string;
    role?: string;
    specialty?: string;
    service?: string;
    location?: string;
    identifier?: string;
    active?: boolean;
    date?: string;
    email?: string;
    phone?: string;
  }): Promise<FHIRPractitionerRole[]> {
    try {
      const searchParams: Record<string, string> = {};

      if (params.practitioner) searchParams['practitioner'] = params.practitioner;
      if (params.organization) searchParams['organization'] = params.organization;
      if (params.role) searchParams['role'] = params.role;
      if (params.specialty) searchParams['specialty'] = params.specialty;
      if (params.service) searchParams['service'] = params.service;
      if (params.location) searchParams['location'] = params.location;
      if (params.identifier) searchParams['identifier'] = params.identifier;
      if (params.active !== undefined) searchParams['active'] = params.active.toString();
      if (params.date) searchParams['date'] = params.date;
      if (params.email) searchParams['telecom'] = `email|${params.email}`;
      if (params.phone) searchParams['telecom'] = `phone|${params.phone}`;

      return await this.client.searchResources<FHIRPractitionerRole>('PractitionerRole', searchParams);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): EHRError {
    if (error instanceof Error) {
      return {
        code: 'PRACTITIONER_ROLE_OPERATION_ERROR',
        message: error.message,
        details: error,
        timestamp: new Date().toISOString(),
        source: 'fhir',
      };
    }
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred while processing the practitioner role operation',
      details: error,
      timestamp: new Date().toISOString(),
      source: 'internal',
    };
  }
} 