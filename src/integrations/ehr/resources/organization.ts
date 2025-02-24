import { Organization as FHIROrganization } from '@smile-cdr/fhirts/dist/FHIR-R4';
import { FHIRClient } from '../fhir-client';
import { EHRError } from '../types';

export class Organization {
  private client: FHIRClient;

  constructor(client: FHIRClient) {
    this.client = client;
  }

  async create(organization: Partial<FHIROrganization>): Promise<FHIROrganization> {
    try {
      // Ensure required fields are present
      if (!organization.identifier || organization.identifier.length === 0) {
        throw new Error('Organization must have at least one identifier');
      }

      if (!organization.name) {
        throw new Error('Organization must have a name');
      }

      // Set resource type
      const resource: Partial<FHIROrganization> = {
        ...organization,
        resourceType: 'Organization',
      };

      return await this.client.createResource<FHIROrganization>('Organization', resource);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async get(id: string): Promise<FHIROrganization> {
    try {
      return await this.client.getResource<FHIROrganization>('Organization', id);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async update(id: string, organization: Partial<FHIROrganization>): Promise<FHIROrganization> {
    try {
      // Ensure resource type is set
      const resource: Partial<FHIROrganization> = {
        ...organization,
        resourceType: 'Organization',
        id,
      };

      return await this.client.updateResource<FHIROrganization>('Organization', id, resource);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async search(params: {
    identifier?: string;
    name?: string;
    type?: string;
    address?: string;
    partOf?: string;
    active?: boolean;
    email?: string;
    phone?: string;
    endpoint?: string;
  }): Promise<FHIROrganization[]> {
    try {
      const searchParams: Record<string, string> = {};

      if (params.identifier) searchParams['identifier'] = params.identifier;
      if (params.name) searchParams['name'] = params.name;
      if (params.type) searchParams['type'] = params.type;
      if (params.address) searchParams['address'] = params.address;
      if (params.partOf) searchParams['partof'] = params.partOf;
      if (params.active !== undefined) searchParams['active'] = params.active.toString();
      if (params.email) searchParams['telecom'] = `email|${params.email}`;
      if (params.phone) searchParams['telecom'] = `phone|${params.phone}`;
      if (params.endpoint) searchParams['endpoint'] = params.endpoint;

      return await this.client.searchResources<FHIROrganization>('Organization', searchParams);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): EHRError {
    if (error instanceof Error) {
      return {
        code: 'ORGANIZATION_OPERATION_ERROR',
        message: error.message,
        details: error,
        timestamp: new Date().toISOString(),
        source: 'fhir',
      };
    }
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred while processing the organization operation',
      details: error,
      timestamp: new Date().toISOString(),
      source: 'internal',
    };
  }
} 