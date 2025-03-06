import { EventEmitter } from "events";
import { HIPAACompliantAuditService } from "../../../backend/src/services/HIPAACompliantAuditService";
import { SecurityAuditService } from "../../../backend/src/services/SecurityAuditService";
import { QualityMetricsService } from "../../../backend/src/services/QualityMetricsService";
import { EHRIntegrationService } from "./EHRIntegrationService";
import { FHIRClient } from "@/integrations/ehr/fhir-client";
import { FHIRResource, FHIRResourceType } from "@/integrations/ehr/types";
import { HIPAAEventType, HIPAAActionType } from "@/types/hipaa";
import { singleton } from "tsyringe";
import { Resource, ResourceType } from "@/types/fhir";

const defaultResourceTypes: FHIRResourceType[] = [
  "Patient",
  "Practitioner",
  "Organization",
  "Observation",
  "Condition",
];

function isFHIRResourceType(type: string): type is FHIRResourceType {
  return defaultResourceTypes.includes(type as FHIRResourceType);
}

interface SyncConfig {
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  lockTimeout: number;
  resourceTypes: FHIRResourceType[];
}

interface SyncStatus {
  lastSync: Date | null;
  inProgress: boolean;
  error?: string;
  progress?: {
    total: number;
    completed: number;
    failed: number;
  };
}

interface SyncLock {
  resourceType: string;
  providerId: string;
  timestamp: Date;
  expiresAt: Date;
}

@singleton()
export class DataSyncService extends EventEmitter {
  private readonly syncStatus: Map<string, SyncStatus> = new Map();
  private readonly syncLocks: Map<string, SyncLock> = new Map();
  private readonly defaultConfig: SyncConfig = {
    batchSize: 100,
    maxRetries: 3,
    retryDelay: 5000,
    lockTimeout: 300000, // 5 minutes
    resourceTypes: defaultResourceTypes,
  };

  constructor(
    private readonly ehrService: EHRIntegrationService,
    private readonly hipaaAuditService: HIPAACompliantAuditService,
    private readonly securityAuditService: SecurityAuditService,
    private readonly qualityMetricsService: QualityMetricsService,
  ) {
    super();
    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    this.on("syncStarted", this.handleSyncStarted.bind(this));
    this.on("syncCompleted", this.handleSyncCompleted.bind(this));
    this.on("syncError", this.handleSyncError.bind(this));
    this.on("resourceSynced", this.handleResourceSynced.bind(this));
  }

  async startSync(
    providerId: string,
    config?: Partial<SyncConfig>,
  ): Promise<void> {
    try {
      const syncConfig = { ...this.defaultConfig, ...config };

      // Get FHIR client for the provider
      const client = this.ehrService.getFHIRClient(providerId);

      // Initialize sync status
      this.syncStatus.set(providerId, {
        lastSync: null,
        inProgress: true,
        progress: {
          total: 0,
          completed: 0,
          failed: 0,
        },
      });

      this.emit("syncStarted", { providerId });

      // Sync each resource type
      for (const resourceType of syncConfig.resourceTypes) {
        await this.syncResourceType(
          providerId,
          resourceType,
          client,
          syncConfig,
        );
      }

      // Update sync status
      const status = this.syncStatus.get(providerId);
      if (status) {
        status.lastSync = new Date();
        status.inProgress = false;
      }

      this.emit("syncCompleted", { providerId });

      await this.hipaaAuditService.logEvent({
        eventType: HIPAAEventType.SYSTEM_OPERATION,
        timestamp: new Date(),
        action: {
          type: HIPAAActionType.UPDATE,
          status: "SUCCESS",
          details: {
            operation: "EHR_DATA_SYNC",
            providerId,
            resourceTypes: syncConfig.resourceTypes,
          },
        },
        resource: {
          type: "SYSTEM",
          id: providerId,
          description: "EHR Data Synchronization",
        },
      });
    } catch (error) {
      await this.handleError(providerId, error);
      throw error;
    }
  }

  private async syncResourceType(
    providerId: string,
    resourceType: string,
    client: FHIRClient,
    config: SyncConfig,
  ): Promise<void> {
    if (!isFHIRResourceType(resourceType)) {
      throw new Error(`Invalid FHIR resource type: ${resourceType}`);
    }

    try {
      // Acquire lock for this resource type
      if (!this.acquireLock(providerId, resourceType, config.lockTimeout)) {
        throw new Error(`Failed to acquire lock for ${resourceType}`);
      }

      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const resources = await this.fetchResourceBatch(
          client,
          resourceType, // Now resourceType is properly typed as FHIRResourceType
          page,
          config.batchSize,
        );

        if (resources.length === 0) {
          hasMore = false;
          continue;
        }

        await this.processBatch(providerId, resources, config);
        page++;
      }
    } finally {
      // Release lock
      this.releaseLock(providerId, resourceType);
    }
  }

  private async fetchResourceBatch(
    client: FHIRClient,
    resourceType: FHIRResourceType,
    page: number,
    batchSize: number,
  ): Promise<FHIRResource[]> {
    const offset = (page - 1) * batchSize;
    return await client.searchResources(resourceType, {
      _count: batchSize.toString(),
      _offset: offset.toString(),
    });
  }

  private async processBatch(
    providerId: string,
    resources: FHIRResource[],
    config: SyncConfig,
  ): Promise<void> {
    for (const resource of resources) {
      let retries = 0;
      let success = false;

      while (!success && retries < config.maxRetries) {
        try {
          await this.processResource(resource as Resource, providerId);
          success = true;

          // Update progress
          const status = this.syncStatus.get(providerId);
          if (status?.progress) {
            status.progress.completed++;
          }

          this.emit("resourceSynced", {
            providerId,
            resourceType: resource.resourceType,
            resourceId: ("id" in resource && resource.id) || "unknown",
          });
        } catch (error) {
          retries++;
          if (retries === config.maxRetries) {
            // Update failed count
            const status = this.syncStatus.get(providerId);
            if (status?.progress) {
              status.progress.failed++;
            }

            await this.handleError(providerId, error, {
              resourceType: resource.resourceType,
              resourceId: resource.id,
            });
          } else {
            // Wait before retry
            await new Promise((resolve) =>
              setTimeout(resolve, config.retryDelay),
            );
          }
        }
      }
    }
  }

  private async processResource(
    resource: Resource,
    providerId: string,
    eventType: HIPAAEventType = HIPAAEventType.SYSTEM_OPERATION,
    actionType: HIPAAActionType = HIPAAActionType.CREATE,
  ): Promise<void> {
    await this.hipaaAuditService.logEvent({
      eventType: eventType as unknown as import("@/types/hipaa").HIPAAEventType,
      timestamp: new Date(),
      action: {
        type: actionType as unknown as import("@/types/hipaa").HIPAAActionType,
        status: "SUCCESS",
        details: {
          resourceType: resource.resourceType,
          resourceId: resource.id || "unknown",
        },
      },
      resource: {
        type: "PHI",
        id: resource.id || "unknown",
        description: "Resource Synchronization",
      },
    });
  }

  private acquireLock(
    providerId: string,
    resourceType: string,
    timeout: number,
  ): boolean {
    const lockKey = `${providerId}:${resourceType}`;
    const now = new Date();

    // Check if lock exists and is still valid
    const existingLock = this.syncLocks.get(lockKey);
    if (existingLock && existingLock.expiresAt > now) {
      return false;
    }

    // Create new lock
    const lock: SyncLock = {
      resourceType,
      providerId,
      timestamp: now,
      expiresAt: new Date(now.getTime() + timeout),
    };

    this.syncLocks.set(lockKey, lock);
    return true;
  }

  private releaseLock(providerId: string, resourceType: string): void {
    const lockKey = `${providerId}:${resourceType}`;
    this.syncLocks.delete(lockKey);
  }

  private async handleError(
    providerId: string,
    error: unknown,
    details?: Record<string, unknown>,
  ): Promise<void> {
    const status = this.syncStatus.get(providerId);
    if (status) {
      status.error = error instanceof Error ? error.message : "Unknown error";
      status.inProgress = false;
    }

    await this.securityAuditService.recordAlert("EHR_SYNC_ERROR", "HIGH", {
      error: error instanceof Error ? error.message : "Unknown error",
      providerId,
      ...details,
    });

    this.emit("syncError", {
      providerId,
      error: error instanceof Error ? error.message : "Unknown error",
      details,
    });
  }

  private async handleSyncStarted(event: {
    providerId: string;
  }): Promise<void> {
    await this.qualityMetricsService.recordMetric({
      name: "ehr_sync_started",
      value: {
        providerId: event.providerId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private async handleSyncCompleted(event: {
    providerId: string;
  }): Promise<void> {
    await this.qualityMetricsService.recordMetric({
      name: "ehr_sync_completed",
      value: {
        providerId: event.providerId,
        timestamp: new Date().toISOString(),
        status: this.syncStatus.get(event.providerId),
      },
    });
  }

  private async handleSyncError(event: {
    providerId: string;
    error: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    await this.qualityMetricsService.recordMetric({
      name: "ehr_sync_error",
      value: {
        providerId: event.providerId,
        timestamp: new Date().toISOString(),
        error: event.error,
        details: event.details,
      },
    });
  }

  private async handleResourceSynced(event: {
    providerId: string;
    resourceType: FHIRResourceType;
    resourceId: string;
  }): Promise<void> {
    await this.qualityMetricsService.recordMetric({
      name: "ehr_resource_synced",
      value: {
        providerId: event.providerId,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  getSyncStatus(providerId: string): SyncStatus | undefined {
    return this.syncStatus.get(providerId);
  }
}
