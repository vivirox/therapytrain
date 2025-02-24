import { VM, VMScript } from 'vm2';
import { EventEmitter } from 'events';
import { Logger } from '@/lib/logger';
import { MetricsService } from '@/services/MetricsService';

interface SandboxOptions {
  memoryLimit: number; // in MB
  cpuLimit: number; // percentage
  allowedHosts: string[];
  maxConcurrentRequests: number;
  allowedPaths: string[];
  readOnly: boolean;
  allowedAPIs: string[];
  executionTimeout: number; // in ms
  idleTimeout: number; // in ms
}

const DEFAULT_SANDBOX_OPTIONS: SandboxOptions = {
  memoryLimit: 128,
  cpuLimit: 10,
  allowedHosts: ['api.gemcity.xyz'],
  maxConcurrentRequests: 5,
  allowedPaths: ['./plugin-data'],
  readOnly: true,
  allowedAPIs: ['patients', 'appointments'],
  executionTimeout: 5000,
  idleTimeout: 30000
};

export class PluginSandbox extends EventEmitter {
  private vm: VM;
  private script: VMScript | null = null;
  private resourceUsage: {
    memory: number;
    cpu: number;
    networkRequests: number;
  };
  private readonly logger: Logger;
  private readonly metrics: MetricsService;

  constructor(
    private readonly options: SandboxOptions = DEFAULT_SANDBOX_OPTIONS
  ) {
    super();
    this.logger = new Logger();
    this.metrics = MetricsService.getInstance();
    this.resourceUsage = {
      memory: 0,
      cpu: 0,
      networkRequests: 0
    };

    this.initializeSandbox();
  }

  private initializeSandbox(): void {
    // Create VM with security options
    this.vm = new VM({
      timeout: this.options.executionTimeout,
      sandbox: {},
      eval: false,
      wasm: false,
      fixAsync: true,
      console: 'redirect',
      require: {
        external: false,
        builtin: ['crypto', 'events', 'util'],
        root: './plugin-data'
      }
    });

    // Add console redirection
    this.vm.on('console.log', (...args) => {
      this.logger.info('[Plugin]', ...args);
    });
    this.vm.on('console.error', (...args) => {
      this.logger.error('[Plugin]', ...args);
    });

    // Add resource monitoring
    this.startResourceMonitoring();
  }

  public async loadScript(code: string): Promise<void> {
    try {
      this.script = new VMScript(code, 'plugin.js');
      await this.script.compile();
    } catch (error) {
      this.logger.error('Failed to load plugin script:', error);
      throw error;
    }
  }

  public async runScript(): Promise<unknown> {
    if (!this.script) {
      throw new Error('No script loaded');
    }

    try {
      const startTime = process.hrtime();
      const result = await this.vm.run(this.script);
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1e6;

      await this.metrics.recordMetric('plugin_execution', {
        duration,
        memory: this.resourceUsage.memory,
        cpu: this.resourceUsage.cpu
      });

      return result;
    } catch (error) {
      this.logger.error('Plugin execution error:', error);
      throw error;
    }
  }

  public async makeNetworkRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    // Check if host is allowed
    const host = new URL(url).hostname;
    if (!this.options.allowedHosts.includes(host)) {
      throw new Error(`Network request to ${host} not allowed`);
    }

    // Check rate limits
    if (this.resourceUsage.networkRequests >= this.options.maxConcurrentRequests) {
      throw new Error('Too many concurrent network requests');
    }

    try {
      this.resourceUsage.networkRequests++;
      const response = await fetch(url, options);
      return response;
    } finally {
      this.resourceUsage.networkRequests--;
    }
  }

  public getResourceUsage(): typeof this.resourceUsage {
    return { ...this.resourceUsage };
  }

  public dispose(): void {
    this.stopResourceMonitoring();
    this.script = null;
    this.removeAllListeners();
  }

  private startResourceMonitoring(): void {
    const interval = setInterval(() => {
      const usage = process.memoryUsage();
      this.resourceUsage.memory = usage.heapUsed / 1024 / 1024; // Convert to MB

      // Check memory limit
      if (this.resourceUsage.memory > this.options.memoryLimit) {
        this.emit('resource:limit:memory', this.resourceUsage.memory);
      }

      // Get CPU usage
      const startUsage = process.cpuUsage();
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalUsage = (endUsage.user + endUsage.system) / 1000000; // Convert to seconds
        this.resourceUsage.cpu = (totalUsage * 100) / 1; // Convert to percentage

        // Check CPU limit
        if (this.resourceUsage.cpu > this.options.cpuLimit) {
          this.emit('resource:limit:cpu', this.resourceUsage.cpu);
        }
      }, 100);

      // Record metrics
      this.metrics.recordMetric('plugin_resources', {
        memory: this.resourceUsage.memory,
        cpu: this.resourceUsage.cpu,
        networkRequests: this.resourceUsage.networkRequests
      });
    }, 1000);

    // Set idle timeout
    const idleTimeout = setTimeout(() => {
      this.emit('idle');
    }, this.options.idleTimeout);

    // Clear timeouts on activity
    this.on('activity', () => {
      clearTimeout(idleTimeout);
    });

    // Store interval for cleanup
    this.vm.on('dispose', () => {
      clearInterval(interval);
      clearTimeout(idleTimeout);
    });
  }

  private stopResourceMonitoring(): void {
    this.vm.emit('dispose');
  }
} 