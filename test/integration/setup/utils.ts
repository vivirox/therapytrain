import { TestEnvironment } from './environment';
import { TestPatient, TestProvider, TestOrganization } from './mocks/ehr';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';
import { Server } from 'http';

export class TestUtils {
  constructor(private env: TestEnvironment) {}
  
  // Data generation helpers
  generateTestPatient(overrides: Partial<TestPatient> = {}): TestPatient {
    return {
      id: uuidv4(),
      externalId: `EXT${Math.floor(Math.random() * 10000)}`,
      name: `Test Patient ${Math.floor(Math.random() * 1000)}`,
      dateOfBirth: new Date(1980, 0, 1),
      status: 'active',
      ...overrides
    };
  }
  
  generateTestProvider(overrides: Partial<TestProvider> = {}): TestProvider {
    return {
      id: uuidv4(),
      externalId: `PROV${Math.floor(Math.random() * 10000)}`,
      name: `Dr. Test Provider ${Math.floor(Math.random() * 1000)}`,
      speciality: 'Family Medicine',
      status: 'active',
      ...overrides
    };
  }
  
  generateTestOrganization(overrides: Partial<TestOrganization> = {}): TestOrganization {
    return {
      id: uuidv4(),
      externalId: `ORG${Math.floor(Math.random() * 10000)}`,
      name: `Test Organization ${Math.floor(Math.random() * 1000)}`,
      type: 'Hospital',
      status: 'active',
      ...overrides
    };
  }
  
  // Database helpers
  async clearDatabase() {
    const { pool, schema } = this.env.database;
    
    // Get all tables in the schema
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1
    `, [schema]);
    
    // Truncate all tables
    for (const row of result.rows) {
      await pool.query(`TRUNCATE TABLE ${schema}.${row.table_name} CASCADE`);
    }
  }
  
  // Redis helpers
  async clearRedis() {
    await this.env.redis.flushall();
  }
  
  // Mock webhook server
  async createMockWebhookServer(
    url: string,
    options: {
      onEvent: (event: any, headers: Record<string, string>) => void | Promise<void>;
    }
  ): Promise<{ stop: () => Promise<void> }> {
    const app = express();
    app.use(express.json());
    
    let server: Server;
    
    // Parse URL to get port
    const urlParts = new URL(url);
    const port = parseInt(urlParts.port);
    
    // Set up webhook endpoint
    app.post(urlParts.pathname, async (req, res) => {
      try {
        // Extract headers we care about
        const relevantHeaders: Record<string, string> = {};
        ['x-signature', 'x-timestamp', 'x-request-id'].forEach(header => {
          if (req.headers[header]) {
            relevantHeaders[header] = req.headers[header] as string;
          }
        });
        
        // Call event handler
        await options.onEvent(req.body, relevantHeaders);
        
        res.status(200).json({ status: 'ok' });
      } catch (error) {
        console.error('Webhook handler error:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Start server
    await new Promise<void>((resolve) => {
      server = app.listen(port, () => {
        console.log(`Mock webhook server listening on port ${port}`);
        resolve();
      });
    });
    
    return {
      stop: async () => {
        return new Promise((resolve, reject) => {
          server.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    };
  }
  
  // Performance measurement
  async measurePerformance<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; duration: number; memoryUsage: number }> {
    const startMemory = process.memoryUsage().heapUsed;
    const startTime = Date.now();
    
    const result = await operation();
    
    const duration = Date.now() - startTime;
    const memoryUsage = process.memoryUsage().heapUsed - startMemory;
    
    return { result, duration, memoryUsage };
  }
  
  // Load testing
  async runLoadTest(config: {
    duration: number;
    rps: number;
    operation: () => Promise<any>;
  }): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    maxResponseTime: number;
  }> {
    const startTime = Date.now();
    const endTime = startTime + config.duration;
    const interval = 1000 / config.rps;
    
    const results: number[] = [];
    let successfulRequests = 0;
    let failedRequests = 0;
    
    while (Date.now() < endTime) {
      const operationStart = Date.now();
      
      try {
        await config.operation();
        successfulRequests++;
        results.push(Date.now() - operationStart);
      } catch (error) {
        failedRequests++;
      }
      
      // Wait for next interval
      const elapsed = Date.now() - operationStart;
      if (elapsed < interval) {
        await new Promise(resolve => setTimeout(resolve, interval - elapsed));
      }
    }
    
    // Calculate statistics
    results.sort((a, b) => a - b);
    const totalRequests = successfulRequests + failedRequests;
    const averageResponseTime = results.reduce((a, b) => a + b, 0) / results.length;
    const p95Index = Math.floor(results.length * 0.95);
    const p95ResponseTime = results[p95Index];
    const maxResponseTime = results[results.length - 1];
    
    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      p95ResponseTime,
      maxResponseTime
    };
  }
  
  // Network traffic capture
  async captureNetworkTraffic(
    operation: () => Promise<any>
  ): Promise<{ request: string; response: string }[]> {
    const traffic: { request: string; response: string }[] = [];
    
    // TODO: Implement network traffic capture
    // This would typically involve setting up a proxy or intercepting requests
    // For now, return empty array
    await operation();
    return traffic;
  }
  
  // Audit log verification
  async verifyAuditLog(expected: {
    action: string;
    resourceType?: string;
    resourceId?: string;
    userId?: string;
    count?: number;
  }): Promise<boolean> {
    const { pool, schema } = this.env.database;
    
    let query = `
      SELECT COUNT(*) as count
      FROM ${schema}.audit_logs
      WHERE action = $1
    `;
    
    const params: any[] = [expected.action];
    
    if (expected.resourceType) {
      query += ` AND resource_type = $${params.length + 1}`;
      params.push(expected.resourceType);
    }
    
    if (expected.resourceId) {
      query += ` AND resource_id = $${params.length + 1}`;
      params.push(expected.resourceId);
    }
    
    if (expected.userId) {
      query += ` AND user_id = $${params.length + 1}`;
      params.push(expected.userId);
    }
    
    const result = await pool.query(query, params);
    const count = parseInt(result.rows[0].count);
    
    return expected.count ? count === expected.count : count > 0;
  }
  
  // Security event verification
  async verifySecurityEvent(expected: {
    type: string;
    source?: string;
    severity?: string;
    count?: number;
  }): Promise<boolean> {
    const { pool, schema } = this.env.database;
    
    let query = `
      SELECT COUNT(*) as count
      FROM ${schema}.audit_logs
      WHERE action = 'security_event'
      AND details->>'type' = $1
    `;
    
    const params: any[] = [expected.type];
    
    if (expected.source) {
      query += ` AND details->>'source' = $${params.length + 1}`;
      params.push(expected.source);
    }
    
    if (expected.severity) {
      query += ` AND details->>'severity' = $${params.length + 1}`;
      params.push(expected.severity);
    }
    
    const result = await pool.query(query, params);
    const count = parseInt(result.rows[0].count);
    
    return expected.count ? count === expected.count : count > 0;
  }
  
  // Condition waiting helper
  async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms timeout`);
  }
}

// Export factory function
export function createTestUtils(env: TestEnvironment): TestUtils {
  return new TestUtils(env);
} 