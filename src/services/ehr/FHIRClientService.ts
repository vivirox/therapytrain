import { HIPAACompliantAuditService } from '../HIPAACompliantAuditService';
import { SecurityAuditService } from '../SecurityAuditService';
import { HIPAAEventType, HIPAAActionType } from '@/types/hipaa';
import {
  Resource,
  Patient,
  Encounter,
  Observation,
  ResourceType
} from '@/types/fhir';

interface FHIRClientConfig {
  baseUrl: string;
  version: '4.0.1' | '3.0.2';
  auth: {
    type: 'bearer' | 'basic';
    token?: string;
    username?: string;
    password?: string;
  };
  headers?: Record<string, string>;
}

interface SearchParams {
  _count?: number;
  _sort?: string;
  _include?: string[];
  _revinclude?: string[];
  [key: string]: any;
}

@singleton()
export class FHIRClientService {
  private static instance: FHIRClientService;
  
  constructor(
    private readonly hipaaAuditService: HIPAACompliantAuditService,
    private readonly securityAuditService: SecurityAuditService
  ) {}

  async search<T extends Resource>(
    resourceType: ResourceType,
    params: SearchParams
  ): Promise<T[]> {
    try {
      const url = this.buildSearchUrl(resourceType, params);
      const response = await this.request('GET', url);
      
      await this.hipaaAuditService.logEvent({
        eventType: HIPAAEventType.PHI_ACCESS,
        timestamp: new Date(),
        actor: {
          id: 'SYSTEM',
          role: 'SYSTEM',
          ipAddress: '127.0.0.1'
        },
        action: {
          type: HIPAAActionType.READ,
          status: 'SUCCESS',
          details: {
            operation: 'FHIR_SEARCH',
            resourceType,
            params
          }
        },
        resource: {
          type: 'PHI',
          id: resourceType,
          description: 'FHIR Resource Search'
        }
      });

      return response.entry?.map(entry => entry.resource as T) || [];
    } catch (error) {
      await this.handleError('search', resourceType, error);
      throw error;
    }
  }

  async create<T extends Resource>(resource: T): Promise<T> {
    try {
      const url = `${this.config.baseUrl}/${resource.resourceType}`;
      const response = await this.request('POST', url, resource);
      
      await this.hipaaAuditService.logEvent({
        eventType: HIPAAEventType.PHI_ACCESS,
        timestamp: new Date(),
        actor: {
          id: 'SYSTEM',
          role: 'SYSTEM',
          ipAddress: '127.0.0.1'
        },
        action: {
          type: HIPAAActionType.CREATE,
          status: 'SUCCESS',
          details: {
            operation: 'FHIR_CREATE',
            resourceType: resource.resourceType,
            resourceId: response.id
          }
        },
        resource: {
          type: 'PHI',
          id: response.id,
          description: 'FHIR Resource Creation'
        }
      });

      return response;
    } catch (error) {
      await this.handleError('create', resource.resourceType, error);
      throw error;
    }
  }

  async read<T extends Resource>(
    resourceType: ResourceType,
    id: string
  ): Promise<T> {
    try {
      const url = `${this.config.baseUrl}/${resourceType}/${id}`;
      const response = await this.request('GET', url);
      
      await this.hipaaAuditService.logEvent({
        eventType: HIPAAEventType.PHI_ACCESS,
        timestamp: new Date(),
        actor: {
          id: 'SYSTEM',
          role: 'SYSTEM',
          ipAddress: '127.0.0.1'
        },
        action: {
          type: HIPAAActionType.READ,
          status: 'SUCCESS',
          details: {
            operation: 'FHIR_READ',
            resourceType,
            resourceId: id
          }
        },
        resource: {
          type: 'PHI',
          id,
          description: 'FHIR Resource Read'
        }
      });

      return response;
    } catch (error) {
      await this.handleError('read', resourceType, error);
      throw error;
    }
  }

  async update<T extends Resource>(resource: T): Promise<T> {
    try {
      const url = `${this.config.baseUrl}/${resource.resourceType}/${resource.id}`;
      const response = await this.request('PUT', url, resource);
      
      await this.hipaaAuditService.logEvent({
        eventType: HIPAAEventType.PHI_ACCESS,
        timestamp: new Date(),
        actor: {
          id: 'SYSTEM',
          role: 'SYSTEM',
          ipAddress: '127.0.0.1'
        },
        action: {
          type: HIPAAActionType.UPDATE,
          status: 'SUCCESS',
          details: {
            operation: 'FHIR_UPDATE',
            resourceType: resource.resourceType,
            resourceId: resource.id
          }
        },
        resource: {
          type: 'PHI',
          id: resource.id,
          description: 'FHIR Resource Update'
        }
      });

      return response;
    } catch (error) {
      await this.handleError('update', resource.resourceType, error);
      throw error;
    }
  }

  async delete(resourceType: ResourceType, id: string): Promise<void> {
    try {
      const url = `${this.config.baseUrl}/${resourceType}/${id}`;
      await this.request('DELETE', url);
      
      await this.hipaaAuditService.logEvent({
        eventType: HIPAAEventType.PHI_ACCESS,
        timestamp: new Date(),
        actor: {
          id: 'SYSTEM',
          role: 'SYSTEM',
          ipAddress: '127.0.0.1'
        },
        action: {
          type: HIPAAActionType.DELETE,
          status: 'SUCCESS',
          details: {
            operation: 'FHIR_DELETE',
            resourceType,
            resourceId: id
          }
        },
        resource: {
          type: 'PHI',
          id,
          description: 'FHIR Resource Deletion'
        }
      });
    } catch (error) {
      await this.handleError('delete', resourceType, error);
      throw error;
    }
  }

  private async handleError(
    operation: string,
    resourceType: string,
    error: Error
  ): Promise<void> {
    await this.securityAuditService.recordAlert('FHIR_OPERATION_ERROR', 'HIGH', {
      operation,
      resourceType,
      error: error.message
    });

    await this.hipaaAuditService.logEvent({
      eventType: HIPAAEventType.PHI_ACCESS,
      timestamp: new Date(),
      actor: {
        id: 'SYSTEM',
        role: 'SYSTEM',
        ipAddress: '127.0.0.1'
      },
      action: {
        type: HIPAAActionType.READ,
        status: 'FAILURE',
        details: {
          operation: `FHIR_${operation.toUpperCase()}`,
          resourceType,
          error: error.message
        }
      },
      resource: {
        type: 'PHI',
        id: resourceType,
        description: 'FHIR Operation Error'
      }
    });
  }

  private buildSearchUrl(resourceType: ResourceType, params: SearchParams): string {
    const url = new URL(`${this.config.baseUrl}/${resourceType}`);
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => url.searchParams.append(key, v));
      } else if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });
    return url.toString();
  }

  private async request(
    method: string,
    url: string,
    body?: any
  ): Promise<any> {
    const headers: Record<string, string> = {
      'Accept': 'application/fhir+json',
      'Content-Type': 'application/fhir+json',
      ...this.config.headers
    };

    if (this.config.auth.type === 'bearer') {
      headers['Authorization'] = `Bearer ${this.config.auth.token}`;
    } else if (this.config.auth.type === 'basic') {
      const credentials = Buffer.from(
        `${this.config.auth.username}:${this.config.auth.password}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`FHIR operation failed: ${response.statusText}`);
    }

    return response.json();
  }

  private config: FHIRClientConfig;

  configure(config: FHIRClientConfig): void {
    this.config = config;
  }
} 