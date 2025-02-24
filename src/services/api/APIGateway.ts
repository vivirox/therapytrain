import { singleton } from '@/lib/decorators';
import { EventEmitter } from 'events';
import { Logger } from '@/lib/logger';
import { RedisService } from '@/services/RedisService';
import { MetricsService } from '@/services/MetricsService';
import { LoadBalancerService } from '@/services/LoadBalancerService';

interface APIGatewayConfig {
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
  };
  routing: {
    rules: Array<{
      path: string;
      service: string;
      methods: string[];
      auth?: boolean;
      rateLimit?: {
        windowMs: number;
        maxRequests: number;
      };
    }>;
  };
  services: {
    [key: string]: {
      url: string;
      healthCheck: string;
      timeout: number;
    };
  };
}

interface RouteMatch {
  service: string;
  params: Record<string, string>;
}

@singleton()
export class APIGateway extends EventEmitter {
  private static instance: APIGateway;
  private readonly logger: Logger;
  private readonly redis: RedisService;
  private readonly metrics: MetricsService;
  private readonly loadBalancer: LoadBalancerService;
  private readonly config: APIGatewayConfig;

  constructor() {
    super();
    this.logger = new Logger();
    this.redis = RedisService.getInstance();
    this.metrics = MetricsService.getInstance();
    this.loadBalancer = LoadBalancerService.getInstance();

    // Default configuration
    this.config = {
      rateLimiting: {
        enabled: true,
        windowMs: 60000, // 1 minute
        maxRequests: 100
      },
      monitoring: {
        enabled: true,
        metricsInterval: 10000 // 10 seconds
      },
      routing: {
        rules: []
      },
      services: {}
    };

    // Start monitoring if enabled
    if (this.config.monitoring.enabled) {
      this.startMonitoring();
    }
  }

  public static getInstance(): APIGateway {
    if (!APIGateway.instance) {
      APIGateway.instance = new APIGateway();
    }
    return APIGateway.instance;
  }

  public async handleRequest(req: Request): Promise<Response> {
    const startTime = Date.now();
    const url = new URL(req.url);

    try {
      // Match route
      const match = this.matchRoute(url.pathname, req.method);
      if (!match) {
        return new Response('Not Found', { status: 404 });
      }

      // Check rate limit
      if (this.config.rateLimiting.enabled) {
        const isRateLimited = await this.checkRateLimit(req, match);
        if (isRateLimited) {
          return new Response('Too Many Requests', { status: 429 });
        }
      }

      // Get service instance
      const serviceUrl = await this.loadBalancer.getOptimalNode(match.service);
      if (!serviceUrl) {
        return new Response('Service Unavailable', { status: 503 });
      }

      // Forward request
      const response = await this.forwardRequest(req, serviceUrl, match);

      // Record metrics
      const duration = Date.now() - startTime;
      await this.recordMetrics(match.service, response.status, duration);

      return response;
    } catch (error) {
      this.logger.error('Error handling request', error as Error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  public addRoute(
    path: string,
    service: string,
    methods: string[],
    options: {
      auth?: boolean;
      rateLimit?: {
        windowMs: number;
        maxRequests: number;
      };
    } = {}
  ): void {
    this.config.routing.rules.push({
      path,
      service,
      methods,
      ...options
    });
  }

  public registerService(
    name: string,
    config: {
      url: string;
      healthCheck: string;
      timeout: number;
    }
  ): void {
    this.config.services[name] = config;
    this.loadBalancer.registerNode(name, config.url);
  }

  private matchRoute(path: string, method: string): RouteMatch | null {
    for (const rule of this.config.routing.rules) {
      if (rule.methods.includes(method)) {
        const match = this.matchPath(rule.path, path);
        if (match) {
          return {
            service: rule.service,
            params: match
          };
        }
      }
    }
    return null;
  }

  private matchPath(pattern: string, path: string): Record<string, string> | null {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart.startsWith(':')) {
        params[patternPart.slice(1)] = pathPart;
      } else if (patternPart !== pathPart) {
        return null;
      }
    }

    return params;
  }

  private async checkRateLimit(req: Request, match: RouteMatch): Promise<boolean> {
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    const route = this.config.routing.rules.find(r => r.service === match.service);
    const limit = route?.rateLimit || this.config.rateLimiting;

    const key = `ratelimit:${clientIp}:${match.service}`;
    const count = await this.redis.incr(key);

    if (count === 1) {
      await this.redis.expire(key, Math.floor(limit.windowMs / 1000));
    }

    return count > limit.maxRequests;
  }

  private async forwardRequest(
    req: Request,
    serviceUrl: string,
    match: RouteMatch
  ): Promise<Response> {
    const service = this.config.services[match.service];
    const url = new URL(req.url);
    const targetUrl = new URL(url.pathname, serviceUrl);

    // Copy query parameters
    url.searchParams.forEach((value, key) => {
      targetUrl.searchParams.append(key, value);
    });

    // Create new request
    const forwardedReq = new Request(targetUrl, {
      method: req.method,
      headers: req.headers,
      body: req.body,
      signal: AbortSignal.timeout(service.timeout)
    });

    // Forward request
    return fetch(forwardedReq);
  }

  private async recordMetrics(
    service: string,
    status: number,
    duration: number
  ): Promise<void> {
    await this.metrics.recordMetric({
      name: 'api_request',
      value: duration,
      labels: {
        service,
        status: status.toString()
      }
    });
  }

  private startMonitoring(): void {
    setInterval(async () => {
      for (const [name, service] of Object.entries(this.config.services)) {
        try {
          const health = await this.checkServiceHealth(name, service);
          this.loadBalancer.updateNodeHealth(name, health);
        } catch (error) {
          this.logger.error(`Health check failed for ${name}`, error as Error);
          this.loadBalancer.updateNodeHealth(name, { status: 'unhealthy' });
        }
      }
    }, this.config.monitoring.metricsInterval);
  }

  private async checkServiceHealth(
    name: string,
    service: { url: string; healthCheck: string }
  ): Promise<{ status: 'healthy' | 'unhealthy' }> {
    const healthUrl = new URL(service.healthCheck, service.url);
    const response = await fetch(healthUrl, {
      signal: AbortSignal.timeout(5000)
    });
    return {
      status: response.ok ? 'healthy' : 'unhealthy'
    };
  }
} 