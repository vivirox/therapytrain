import { Pool } from 'pg';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { HIPAACompliantAuditService } from '../../src/services/audit';
import { SecurityService } from '../../src/services/security';
import { MetricsService } from '../../src/services/metrics';
import { PluginService } from '../../src/services/plugin';
import { MockEpicServer, MockCernerServer, MockAllscriptsServer } from './mocks/ehr';

export interface TestEnvironment {
  // Infrastructure
  database: {
    pool: Pool;
    schema: string;
  };
  
  redis: Redis;
  
  // EHR Providers
  ehrProviders: {
    mock: {
      epic: MockEpicServer;
      cerner: MockCernerServer;
      allscripts: MockAllscriptsServer;
    };
    sandbox: {
      epic: string;
      cerner: string;
      allscripts: string;
    };
  };
  
  // Services
  services: {
    audit: HIPAACompliantAuditService;
    security: SecurityService;
    metrics: MetricsService;
    plugins: PluginService;
  };
}

export class TestEnvironmentManager {
  private static instance: TestEnvironmentManager;
  private environment: TestEnvironment | null = null;
  
  private constructor() {}
  
  static getInstance(): TestEnvironmentManager {
    if (!TestEnvironmentManager.instance) {
      TestEnvironmentManager.instance = new TestEnvironmentManager();
    }
    return TestEnvironmentManager.instance;
  }
  
  async setup(): Promise<TestEnvironment> {
    if (this.environment) {
      return this.environment;
    }
    
    // Create unique schema for isolation
    const schema = `test_${uuidv4().replace(/-/g, '_')}`;
    
    // Set up database
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    await pool.query(`CREATE SCHEMA ${schema}`);
    await pool.query(`SET search_path TO ${schema}`);
    
    // Run migrations in the new schema
    await this.runMigrations(pool, schema);
    
    // Set up Redis with unique prefix
    const redis = new Redis(process.env.REDIS_URL, {
      keyPrefix: `${schema}:`
    });
    
    // Set up mock EHR providers
    const mockEpic = new MockEpicServer();
    const mockCerner = new MockCernerServer();
    const mockAllscripts = new MockAllscriptsServer();
    
    await Promise.all([
      mockEpic.start(),
      mockCerner.start(),
      mockAllscripts.start()
    ]);
    
    // Initialize services
    const auditService = new HIPAACompliantAuditService({
      database: pool,
      schema
    });
    
    const securityService = new SecurityService({
      database: pool,
      redis,
      schema
    });
    
    const metricsService = new MetricsService({
      database: pool,
      redis,
      schema
    });
    
    const pluginService = new PluginService({
      database: pool,
      redis,
      schema,
      auditService,
      securityService,
      metricsService
    });
    
    this.environment = {
      database: {
        pool,
        schema
      },
      redis,
      ehrProviders: {
        mock: {
          epic: mockEpic,
          cerner: mockCerner,
          allscripts: mockAllscripts
        },
        sandbox: {
          epic: mockEpic.url,
          cerner: mockCerner.url,
          allscripts: mockAllscripts.url
        }
      },
      services: {
        audit: auditService,
        security: securityService,
        metrics: metricsService,
        plugins: pluginService
      }
    };
    
    return this.environment;
  }
  
  async teardown(): Promise<void> {
    if (!this.environment) {
      return;
    }
    
    const { database, redis, ehrProviders } = this.environment;
    
    // Stop mock servers
    await Promise.all([
      ehrProviders.mock.epic.stop(),
      ehrProviders.mock.cerner.stop(),
      ehrProviders.mock.allscripts.stop()
    ]);
    
    // Clean up Redis
    await redis.flushall();
    await redis.quit();
    
    // Drop schema and close database connection
    await database.pool.query(`DROP SCHEMA ${database.schema} CASCADE`);
    await database.pool.end();
    
    this.environment = null;
  }
  
  private async runMigrations(pool: Pool, schema: string): Promise<void> {
    // Read migration files and execute them
    const migrations = [
      // Core tables
      `
      CREATE TABLE ${schema}.patients (
        id SERIAL PRIMARY KEY,
        external_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        date_of_birth DATE NOT NULL,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
      `,
      
      // Audit logs
      `
      CREATE TABLE ${schema}.audit_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(255) NOT NULL,
        resource_type VARCHAR(255) NOT NULL,
        resource_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
      `,
      
      // Plugin data
      `
      CREATE TABLE ${schema}.plugins (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        version VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        config JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
      `
    ];
    
    for (const migration of migrations) {
      await pool.query(migration);
    }
  }
  
  getEnvironment(): TestEnvironment {
    if (!this.environment) {
      throw new Error('Test environment not initialized. Call setup() first.');
    }
    return this.environment;
  }
}

// Export singleton instance
export const testEnv = TestEnvironmentManager.getInstance(); 