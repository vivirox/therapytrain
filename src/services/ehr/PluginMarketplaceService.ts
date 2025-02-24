import { EventEmitter } from 'events';
import { HIPAACompliantAuditService } from '../HIPAACompliantAuditService';
import { SecurityAuditService } from '../SecurityAuditService';
import { QualityMetricsService } from '../QualityMetricsService';
import { PluginService } from './PluginService';
import semver from 'semver';

interface PluginPackage {
  metadata: {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    license: string;
    dependencies: Record<string, string>;
    permissions: string[];
    entryPoint: string;
    tags: string[];
    category: string;
    homepage?: string;
    repository?: string;
    documentation?: string;
  };
  code: string;
  readme?: string;
  changelog?: string;
  signature: string;
}

interface PluginVersion {
  version: string;
  publishedAt: Date;
  downloads: number;
  rating: number;
  ratingCount: number;
  package: PluginPackage;
}

interface PluginRegistry {
  id: string;
  name: string;
  latestVersion: string;
  versions: PluginVersion[];
  totalDownloads: number;
  averageRating: number;
  totalRatings: number;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'deprecated' | 'removed';
}

interface PluginReview {
  id: string;
  pluginId: string;
  version: string;
  rating: number;
  comment: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SearchOptions {
  query?: string;
  tags?: string[];
  category?: string;
  minRating?: number;
  sortBy?: 'downloads' | 'rating' | 'name' | 'date';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

@singleton()
export class PluginMarketplaceService extends EventEmitter {
  private registry: Map<string, PluginRegistry>;
  private reviews: Map<string, PluginReview[]>;
  private readonly PAGE_SIZE = 20;

  constructor(
    private readonly pluginService: PluginService,
    private readonly hipaaAuditService: HIPAACompliantAuditService,
    private readonly securityAuditService: SecurityAuditService,
    private readonly qualityMetricsService: QualityMetricsService
  ) {
    super();
    this.registry = new Map();
    this.reviews = new Map();
    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    this.on('pluginPublished', this.handlePluginPublished.bind(this));
    this.on('pluginUpdated', this.handlePluginUpdated.bind(this));
    this.on('pluginDownloaded', this.handlePluginDownloaded.bind(this));
    this.on('reviewSubmitted', this.handleReviewSubmitted.bind(this));
  }

  async publishPlugin(pkg: PluginPackage): Promise<void> {
    try {
      // Validate package
      this.validatePackage(pkg);

      // Check if plugin exists
      let plugin = this.registry.get(pkg.metadata.id);
      const isUpdate = !!plugin;

      if (isUpdate) {
        // Validate version
        if (!semver.gt(pkg.metadata.version, plugin.latestVersion)) {
          throw new Error('New version must be greater than current version');
        }
      } else {
        // Create new plugin registry
        plugin = {
          id: pkg.metadata.id,
          name: pkg.metadata.name,
          latestVersion: pkg.metadata.version,
          versions: [],
          totalDownloads: 0,
          averageRating: 0,
          totalRatings: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'active',
        };
      }

      // Create version entry
      const version: PluginVersion = {
        version: pkg.metadata.version,
        publishedAt: new Date(),
        downloads: 0,
        rating: 0,
        ratingCount: 0,
        package: pkg,
      };

      // Update plugin registry
      plugin.versions.push(version);
      plugin.latestVersion = pkg.metadata.version;
      plugin.updatedAt = new Date();

      this.registry.set(pkg.metadata.id, plugin);

      await this.hipaaAuditService.logEvent({
        eventType: 'SYSTEM_OPERATION',
        action: {
          type: isUpdate ? 'UPDATE' : 'CREATE',
          status: 'SUCCESS',
          details: {
            operation: isUpdate ? 'UPDATE_PLUGIN' : 'PUBLISH_PLUGIN',
            pluginId: pkg.metadata.id,
            version: pkg.metadata.version,
          },
        },
      });

      await this.qualityMetricsService.recordMetric('plugin_published', {
        pluginId: pkg.metadata.id,
        version: pkg.metadata.version,
        isUpdate,
      });

      this.emit(isUpdate ? 'pluginUpdated' : 'pluginPublished', {
        pluginId: pkg.metadata.id,
        version: pkg.metadata.version,
      });
    } catch (error) {
      await this.handleError('PLUGIN_PUBLISH_ERROR', error, {
        pluginId: pkg.metadata.id,
        version: pkg.metadata.version,
      });
      throw error;
    }
  }

  async downloadPlugin(pluginId: string, version?: string): Promise<PluginPackage> {
    try {
      const plugin = this.getPlugin(pluginId);
      const targetVersion = version || plugin.latestVersion;

      const versionEntry = plugin.versions.find(v => v.version === targetVersion);
      if (!versionEntry) {
        throw new Error(`Version ${targetVersion} not found`);
      }

      // Update download count
      versionEntry.downloads++;
      plugin.totalDownloads++;

      await this.hipaaAuditService.logEvent({
        eventType: 'SYSTEM_OPERATION',
        action: {
          type: 'READ',
          status: 'SUCCESS',
          details: {
            operation: 'DOWNLOAD_PLUGIN',
            pluginId,
            version: targetVersion,
          },
        },
      });

      await this.qualityMetricsService.recordMetric('plugin_downloaded', {
        pluginId,
        version: targetVersion,
      });

      this.emit('pluginDownloaded', {
        pluginId,
        version: targetVersion,
      });

      return versionEntry.package;
    } catch (error) {
      await this.handleError('PLUGIN_DOWNLOAD_ERROR', error, {
        pluginId,
        version,
      });
      throw error;
    }
  }

  async submitReview(
    pluginId: string,
    version: string,
    rating: number,
    comment: string,
    author: string
  ): Promise<void> {
    try {
      const plugin = this.getPlugin(pluginId);
      const versionEntry = plugin.versions.find(v => v.version === version);
      if (!versionEntry) {
        throw new Error(`Version ${version} not found`);
      }

      // Validate rating
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      // Create review
      const review: PluginReview = {
        id: `${pluginId}-${Date.now()}`,
        pluginId,
        version,
        rating,
        comment,
        author,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Update review storage
      const pluginReviews = this.reviews.get(pluginId) || [];
      pluginReviews.push(review);
      this.reviews.set(pluginId, pluginReviews);

      // Update version rating
      versionEntry.rating =
        (versionEntry.rating * versionEntry.ratingCount + rating) /
        (versionEntry.ratingCount + 1);
      versionEntry.ratingCount++;

      // Update plugin rating
      plugin.totalRatings++;
      plugin.averageRating =
        plugin.versions.reduce(
          (sum, v) => sum + v.rating * v.ratingCount,
          0
        ) / plugin.totalRatings;

      await this.hipaaAuditService.logEvent({
        eventType: 'SYSTEM_OPERATION',
        action: {
          type: 'CREATE',
          status: 'SUCCESS',
          details: {
            operation: 'SUBMIT_REVIEW',
            pluginId,
            version,
            rating,
          },
        },
      });

      await this.qualityMetricsService.recordMetric('plugin_review_submitted', {
        pluginId,
        version,
        rating,
      });

      this.emit('reviewSubmitted', {
        pluginId,
        version,
        rating,
        review,
      });
    } catch (error) {
      await this.handleError('PLUGIN_REVIEW_ERROR', error, {
        pluginId,
        version,
      });
      throw error;
    }
  }

  async searchPlugins(options: SearchOptions = {}): Promise<PluginRegistry[]> {
    const {
      query,
      tags,
      category,
      minRating = 0,
      sortBy = 'downloads',
      sortOrder = 'desc',
      page = 1,
      limit = this.PAGE_SIZE,
    } = options;

    try {
      let results = Array.from(this.registry.values()).filter(
        plugin => plugin.status === 'active'
      );

      // Apply filters
      if (query) {
        const searchTerms = query.toLowerCase().split(/\s+/);
        results = results.filter(plugin =>
          searchTerms.every(
            term =>
              plugin.name.toLowerCase().includes(term) ||
              plugin.versions[0].package.metadata.description
                .toLowerCase()
                .includes(term)
          )
        );
      }

      if (tags) {
        results = results.filter(plugin =>
          tags.every(tag =>
            plugin.versions[0].package.metadata.tags.includes(tag)
          )
        );
      }

      if (category) {
        results = results.filter(
          plugin =>
            plugin.versions[0].package.metadata.category === category
        );
      }

      if (minRating > 0) {
        results = results.filter(
          plugin => plugin.averageRating >= minRating
        );
      }

      // Apply sorting
      results.sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'downloads':
            comparison = b.totalDownloads - a.totalDownloads;
            break;
          case 'rating':
            comparison = b.averageRating - a.averageRating;
            break;
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'date':
            comparison =
              b.versions[0].publishedAt.getTime() -
              a.versions[0].publishedAt.getTime();
            break;
        }
        return sortOrder === 'asc' ? -comparison : comparison;
      });

      // Apply pagination
      const start = (page - 1) * limit;
      results = results.slice(start, start + limit);

      await this.qualityMetricsService.recordMetric('plugin_search', {
        query,
        tags,
        category,
        minRating,
        sortBy,
        sortOrder,
        page,
        limit,
        resultCount: results.length,
      });

      return results;
    } catch (error) {
      await this.handleError('PLUGIN_SEARCH_ERROR', error, options);
      throw error;
    }
  }

  getPluginDetails(pluginId: string): PluginRegistry | null {
    return this.registry.get(pluginId) || null;
  }

  getPluginReviews(pluginId: string): PluginReview[] {
    return this.reviews.get(pluginId) || [];
  }

  private getPlugin(pluginId: string): PluginRegistry {
    const plugin = this.registry.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    return plugin;
  }

  private validatePackage(pkg: PluginPackage): void {
    const requiredFields = [
      'id',
      'name',
      'version',
      'description',
      'author',
      'license',
      'entryPoint',
      'tags',
      'category',
    ];

    for (const field of requiredFields) {
      if (!pkg.metadata[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate version format (semver)
    if (!semver.valid(pkg.metadata.version)) {
      throw new Error('Invalid version format. Must be semver (e.g., 1.0.0)');
    }

    // Validate permissions
    if (pkg.metadata.permissions) {
      const validPermissions = ['fhir', 'events', 'storage', 'http'];
      for (const permission of pkg.metadata.permissions) {
        if (!validPermissions.includes(permission)) {
          throw new Error(`Invalid permission: ${permission}`);
        }
      }
    }

    // Validate signature
    if (!pkg.signature) {
      throw new Error('Package signature is required');
    }

    // TODO: Implement signature verification
  }

  private async handleError(
    type: string,
    error: unknown,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.securityAuditService.recordAlert(type, 'HIGH', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ...details,
    });

    this.emit('error', {
      type,
      error: error instanceof Error ? error.message : 'Unknown error',
      details,
    });
  }

  private async handlePluginPublished(event: {
    pluginId: string;
    version: string;
  }): Promise<void> {
    await this.qualityMetricsService.recordMetric('plugin_lifecycle', {
      event: 'published',
      pluginId: event.pluginId,
      version: event.version,
      timestamp: new Date().toISOString(),
    });
  }

  private async handlePluginUpdated(event: {
    pluginId: string;
    version: string;
  }): Promise<void> {
    await this.qualityMetricsService.recordMetric('plugin_lifecycle', {
      event: 'updated',
      pluginId: event.pluginId,
      version: event.version,
      timestamp: new Date().toISOString(),
    });
  }

  private async handlePluginDownloaded(event: {
    pluginId: string;
    version: string;
  }): Promise<void> {
    await this.qualityMetricsService.recordMetric('plugin_lifecycle', {
      event: 'downloaded',
      pluginId: event.pluginId,
      version: event.version,
      timestamp: new Date().toISOString(),
    });
  }

  private async handleReviewSubmitted(event: {
    pluginId: string;
    version: string;
    rating: number;
    review: PluginReview;
  }): Promise<void> {
    await this.qualityMetricsService.recordMetric('plugin_lifecycle', {
      event: 'reviewed',
      pluginId: event.pluginId,
      version: event.version,
      rating: event.rating,
      timestamp: new Date().toISOString(),
    });
  }
} 