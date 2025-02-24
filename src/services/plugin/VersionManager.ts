import { singleton } from '@/lib/decorators';
import { EventEmitter } from 'events';
import { Logger } from '@/lib/logger';
import { MetricsService } from '@/services/MetricsService';
import semver from 'semver';

interface VersionMetadata {
  version: string;
  minHostVersion: string;
  maxHostVersion?: string;
  dependencies: Record<string, string>;
  breaking?: boolean;
  deprecationDate?: Date;
  migrationGuide?: string;
}

interface VersionHistory {
  versions: VersionMetadata[];
  latestStable: string;
  latestBeta?: string;
  deprecatedVersions: string[];
}

interface VersionCheck {
  compatible: boolean;
  reason?: string;
  suggestedVersion?: string;
  breaking?: boolean;
  migrationRequired?: boolean;
  migrationGuide?: string;
}

@singleton()
export class VersionManager extends EventEmitter {
  private static instance: VersionManager;
  private readonly logger: Logger;
  private readonly metrics: MetricsService;
  private readonly versionHistory: Map<string, VersionHistory>;
  private readonly HOST_VERSION: string;

  constructor() {
    super();
    this.logger = new Logger();
    this.metrics = MetricsService.getInstance();
    this.versionHistory = new Map();
    this.HOST_VERSION = process.env.APP_VERSION || '1.0.0';
  }

  public static getInstance(): VersionManager {
    if (!VersionManager.instance) {
      VersionManager.instance = new VersionManager();
    }
    return VersionManager.instance;
  }

  public registerVersion(
    pluginId: string,
    metadata: VersionMetadata
  ): void {
    let history = this.versionHistory.get(pluginId);
    if (!history) {
      history = {
        versions: [],
        latestStable: '0.0.0',
        deprecatedVersions: []
      };
      this.versionHistory.set(pluginId, history);
    }

    // Validate version
    if (!semver.valid(metadata.version)) {
      throw new Error(`Invalid version format: ${metadata.version}`);
    }

    // Check if version already exists
    if (history.versions.some(v => v.version === metadata.version)) {
      throw new Error(`Version ${metadata.version} already registered`);
    }

    // Add version to history
    history.versions.push(metadata);

    // Update latest stable version
    if (!metadata.version.includes('-') && semver.gt(metadata.version, history.latestStable)) {
      history.latestStable = metadata.version;
    }

    // Update latest beta version
    if (metadata.version.includes('-')) {
      if (!history.latestBeta || semver.gt(metadata.version, history.latestBeta)) {
        history.latestBeta = metadata.version;
      }
    }

    // Check for deprecation
    if (metadata.deprecationDate && metadata.deprecationDate <= new Date()) {
      history.deprecatedVersions.push(metadata.version);
    }

    // Sort versions
    history.versions.sort((a, b) => semver.compare(b.version, a.version));

    // Emit event
    this.emit('version:registered', {
      pluginId,
      version: metadata.version,
      breaking: metadata.breaking
    });

    // Record metric
    this.metrics.recordMetric('plugin_version_registered', {
      pluginId,
      version: metadata.version,
      breaking: metadata.breaking
    });
  }

  public checkCompatibility(
    pluginId: string,
    version: string
  ): VersionCheck {
    const history = this.versionHistory.get(pluginId);
    if (!history) {
      return {
        compatible: false,
        reason: 'Plugin not found'
      };
    }

    const metadata = history.versions.find(v => v.version === version);
    if (!metadata) {
      return {
        compatible: false,
        reason: 'Version not found',
        suggestedVersion: history.latestStable
      };
    }

    // Check if version is deprecated
    if (history.deprecatedVersions.includes(version)) {
      return {
        compatible: false,
        reason: 'Version is deprecated',
        suggestedVersion: history.latestStable
      };
    }

    // Check host version compatibility
    if (!semver.satisfies(this.HOST_VERSION, `>=${metadata.minHostVersion}`)) {
      return {
        compatible: false,
        reason: `Requires host version >=${metadata.minHostVersion}`,
        suggestedVersion: this.findCompatibleVersion(history, this.HOST_VERSION)
      };
    }

    if (metadata.maxHostVersion && !semver.satisfies(this.HOST_VERSION, `<=${metadata.maxHostVersion}`)) {
      return {
        compatible: false,
        reason: `Requires host version <=${metadata.maxHostVersion}`,
        suggestedVersion: this.findCompatibleVersion(history, this.HOST_VERSION)
      };
    }

    // Check dependencies
    for (const [dep, range] of Object.entries(metadata.dependencies)) {
      const depHistory = this.versionHistory.get(dep);
      if (!depHistory) {
        return {
          compatible: false,
          reason: `Missing dependency: ${dep}`
        };
      }

      if (!semver.satisfies(depHistory.latestStable, range)) {
        return {
          compatible: false,
          reason: `Incompatible dependency: ${dep}@${range}`,
          suggestedVersion: this.findVersionWithCompatibleDependency(history, dep, depHistory.latestStable)
        };
      }
    }

    return {
      compatible: true,
      breaking: metadata.breaking,
      migrationRequired: metadata.breaking,
      migrationGuide: metadata.migrationGuide
    };
  }

  public getLatestCompatibleVersion(pluginId: string): string | null {
    const history = this.versionHistory.get(pluginId);
    if (!history) {
      return null;
    }

    return this.findCompatibleVersion(history, this.HOST_VERSION);
  }

  public getUpgradePathToVersion(
    pluginId: string,
    fromVersion: string,
    toVersion: string
  ): string[] {
    const history = this.versionHistory.get(pluginId);
    if (!history) {
      return [];
    }

    const path: string[] = [];
    let currentVersion = fromVersion;

    while (semver.lt(currentVersion, toVersion)) {
      const nextVersion = this.findNextCompatibleVersion(history, currentVersion, toVersion);
      if (!nextVersion) {
        break;
      }
      path.push(nextVersion);
      currentVersion = nextVersion;
    }

    return path;
  }

  private findCompatibleVersion(
    history: VersionHistory,
    hostVersion: string
  ): string | null {
    // Find latest version compatible with host
    for (const metadata of history.versions) {
      if (
        semver.satisfies(hostVersion, `>=${metadata.minHostVersion}`) &&
        (!metadata.maxHostVersion || semver.satisfies(hostVersion, `<=${metadata.maxHostVersion}`))
      ) {
        return metadata.version;
      }
    }
    return null;
  }

  private findVersionWithCompatibleDependency(
    history: VersionHistory,
    dependency: string,
    dependencyVersion: string
  ): string | null {
    // Find latest version with compatible dependency
    for (const metadata of history.versions) {
      if (semver.satisfies(dependencyVersion, metadata.dependencies[dependency])) {
        return metadata.version;
      }
    }
    return null;
  }

  private findNextCompatibleVersion(
    history: VersionHistory,
    fromVersion: string,
    toVersion: string
  ): string | null {
    let nextVersion: string | null = null;

    for (const metadata of history.versions) {
      if (
        semver.gt(metadata.version, fromVersion) &&
        semver.lte(metadata.version, toVersion) &&
        (!nextVersion || semver.lt(metadata.version, nextVersion))
      ) {
        nextVersion = metadata.version;
      }
    }

    return nextVersion;
  }
} 