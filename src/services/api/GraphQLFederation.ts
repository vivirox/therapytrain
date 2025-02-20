import { singleton } from '@/lib/decorators';
import { EventEmitter } from 'events';
import { Logger } from '@/lib/logger';
import { RedisService } from '@/services/RedisService';
import { MetricsService } from '@/services/MetricsService';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { ApolloGateway, RemoteGraphQLDataSource } from '@apollo/gateway';
import { ApolloServer } from '@apollo/server';
import { gql } from 'graphql-tag';

interface ServiceConfig {
  name: string;
  url: string;
  schema: string;
}

interface FederationConfig {
  services: ServiceConfig[];
  pollInterval?: number;
  enableIntrospection?: boolean;
  debug?: boolean;
}

@singleton()
export class GraphQLFederation extends EventEmitter {
  private static instance: GraphQLFederation;
  private readonly logger: Logger;
  private readonly redis: RedisService;
  private readonly metrics: MetricsService;
  private gateway: ApolloGateway | null = null;
  private server: ApolloServer | null = null;
  private config: FederationConfig;

  constructor() {
    super();
    this.logger = new Logger();
    this.redis = RedisService.getInstance();
    this.metrics = MetricsService.getInstance();
    this.config = {
      services: [],
      pollInterval: 10000, // 10 seconds
      enableIntrospection: false,
      debug: false
    };
  }

  public static getInstance(): GraphQLFederation {
    if (!GraphQLFederation.instance) {
      GraphQLFederation.instance = new GraphQLFederation();
    }
    return GraphQLFederation.instance;
  }

  public async initialize(config: Partial<FederationConfig>): Promise<void> {
    this.config = {
      ...this.config,
      ...config
    };

    // Create gateway
    this.gateway = new ApolloGateway({
      serviceList: this.config.services.map(service => ({
        name: service.name,
        url: service.url
      })),
      buildService: (service) => {
        return new RemoteGraphQLDataSource({
          url: service.url,
          willSendRequest: ({ request, context }) => {
            // Add any necessary headers
            request.http?.headers.set('x-federation-service', service.name);
          }
        });
      },
      experimental_pollInterval: this.config.pollInterval,
      debug: this.config.debug
    });

    // Create server
    this.server = new ApolloServer({
      gateway: this.gateway,
      introspection: this.config.enableIntrospection
    });

    // Start server
    await this.server.start();

    // Start monitoring
    this.startMonitoring();
  }

  public async registerService(config: ServiceConfig): Promise<void> {
    // Validate schema
    const typeDefs = gql(config.schema);
    const schema = buildSubgraphSchema([{ typeDefs }]);

    // Add to configuration
    this.config.services.push(config);

    // Store schema in Redis for caching
    await this.redis.set(
      `schema:${config.name}`,
      config.schema,
      60 * 60 // 1 hour TTL
    );

    // Emit event
    this.emit('serviceRegistered', config);

    // Reinitialize if gateway exists
    if (this.gateway) {
      await this.initialize(this.config);
    }
  }

  public async unregisterService(name: string): Promise<void> {
    // Remove from configuration
    this.config.services = this.config.services.filter(s => s.name !== name);

    // Remove schema from Redis
    await this.redis.del(`schema:${name}`);

    // Emit event
    this.emit('serviceUnregistered', name);

    // Reinitialize if gateway exists
    if (this.gateway) {
      await this.initialize(this.config);
    }
  }

  public async getServiceSchema(name: string): Promise<string | null> {
    return this.redis.get(`schema:${name}`);
  }

  public getServer(): ApolloServer | null {
    return this.server;
  }

  private startMonitoring(): void {
    setInterval(async () => {
      try {
        // Check service health
        for (const service of this.config.services) {
          try {
            const response = await fetch(service.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                query: '{ _service { sdl } }'
              })
            });

            const health = response.ok ? 'healthy' : 'unhealthy';
            await this.recordMetrics(service.name, health);
          } catch (error) {
            this.logger.error(`Health check failed for ${service.name}`, error as Error);
            await this.recordMetrics(service.name, 'unhealthy');
          }
        }
      } catch (error) {
        this.logger.error('Error in federation monitoring', error as Error);
      }
    }, this.config.pollInterval);
  }

  private async recordMetrics(
    service: string,
    health: 'healthy' | 'unhealthy'
  ): Promise<void> {
    await this.metrics.recordMetric({
      name: 'graphql_federation_health',
      value: health === 'healthy' ? 1 : 0,
      labels: {
        service
      }
    });
  }
} 