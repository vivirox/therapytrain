import { FHIRResource, FHIRResourceType, EHRProvider, EHRError, AuditLogEntry } from './types';
import { createAuditLog } from './audit-logger';

export class FHIRClient {
  private provider: EHRProvider;
  private baseUrl: string;
  private headers: Headers;

  constructor(provider: EHRProvider) {
    this.provider = provider;
    this.baseUrl = provider.baseUrl;
    this.headers = this.buildHeaders();
  }

  private buildHeaders(): Headers {
    const headers = new Headers({
      'Content-Type': 'application/fhir+json',
      'Accept': 'application/fhir+json',
    });

    switch (this.provider.authType) {
      case 'oauth2':
        // OAuth2 token would be managed by a separate auth service
        break;
      case 'apikey':
        if (this.provider.settings.apiKey) {
          headers.append('Authorization', `Bearer ${this.provider.settings.apiKey}`);
        }
        break;
      case 'basic':
        if (this.provider.settings.username && this.provider.settings.password) {
          const credentials = btoa(`${this.provider.settings.username}:${this.provider.settings.password}`);
          headers.append('Authorization', `Basic ${credentials}`);
        }
        break;
    }

    return headers;
  }

  private async request<T extends FHIRResource>(
    method: string,
    resourceType: FHIRResourceType,
    id?: string,
    body?: any
  ): Promise<T> {
    try {
      const url = id ? `${this.baseUrl}/${resourceType}/${id}` : `${this.baseUrl}/${resourceType}`;
      
      const response = await fetch(url, {
        method,
        headers: this.headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`FHIR API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Create audit log entry
      await createAuditLog({
        timestamp: new Date().toISOString(),
        actor: {
          id: 'system', // This would be replaced with actual user ID in production
          type: 'system',
          name: 'FHIR Client',
        },
        action: method === 'GET' ? 'read' : method === 'POST' ? 'create' : method === 'PUT' ? 'update' : 'delete',
        resource: {
          type: resourceType,
          id: id || data.id,
        },
        details: `${method} ${resourceType}${id ? `/${id}` : ''}`,
        status: 'success',
        ipAddress: '', // Would be populated in production
        userAgent: '', // Would be populated in production
      });

      return data;
    } catch (error) {
      const ehrError: EHRError = {
        code: 'FHIR_REQUEST_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error,
        timestamp: new Date().toISOString(),
        source: 'fhir',
      };

      // Create audit log entry for failure
      await createAuditLog({
        timestamp: new Date().toISOString(),
        actor: {
          id: 'system',
          type: 'system',
          name: 'FHIR Client',
        },
        action: method === 'GET' ? 'read' : method === 'POST' ? 'create' : method === 'PUT' ? 'update' : 'delete',
        resource: {
          type: resourceType,
          id: id || '',
        },
        details: `Error: ${ehrError.message}`,
        status: 'failure',
        ipAddress: '',
        userAgent: '',
      });

      throw ehrError;
    }
  }

  // CRUD operations for FHIR resources
  async getResource<T extends FHIRResource>(resourceType: FHIRResourceType, id: string): Promise<T> {
    return this.request<T>('GET', resourceType, id);
  }

  async createResource<T extends FHIRResource>(resourceType: FHIRResourceType, resource: Partial<T>): Promise<T> {
    return this.request<T>('POST', resourceType, undefined, resource);
  }

  async updateResource<T extends FHIRResource>(resourceType: FHIRResourceType, id: string, resource: Partial<T>): Promise<T> {
    return this.request<T>('PUT', resourceType, id, resource);
  }

  async deleteResource(resourceType: FHIRResourceType, id: string): Promise<void> {
    await this.request('DELETE', resourceType, id);
  }

  // Search functionality
  async searchResources<T extends FHIRResource>(
    resourceType: FHIRResourceType,
    params: Record<string, string>
  ): Promise<T[]> {
    const searchParams = new URLSearchParams(params);
    const url = `${this.baseUrl}/${resourceType}/_search?${searchParams.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`FHIR search error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.entry?.map((entry: any) => entry.resource) || [];
    } catch (error) {
      const ehrError: EHRError = {
        code: 'FHIR_SEARCH_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error,
        timestamp: new Date().toISOString(),
        source: 'fhir',
      };
      throw ehrError;
    }
  }
} 