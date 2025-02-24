import { testEnv } from '../setup/environment';
import { createTestUtils } from '../setup/utils';
import { TestPatient } from '../setup/mocks/ehr';
import { WebhookService } from '../../../src/services/webhook';
import { EHRService } from '../../../src/services/ehr';

describe('EHR Integration -> Webhook Service', () => {
  let utils: ReturnType<typeof createTestUtils>;
  let webhookService: WebhookService;
  let ehrService: EHRService;
  let testPatient: TestPatient;
  
  beforeAll(async () => {
    const env = await testEnv.setup();
    utils = createTestUtils(env);
    
    // Initialize services
    webhookService = new WebhookService({
      database: env.database.pool,
      redis: env.redis,
      schema: env.database.schema,
      auditService: env.services.audit,
      securityService: env.services.security,
      metricsService: env.services.metrics
    });
    
    ehrService = new EHRService({
      database: env.database.pool,
      redis: env.redis,
      schema: env.database.schema,
      auditService: env.services.audit,
      securityService: env.services.security,
      metricsService: env.services.metrics,
      providers: {
        epic: env.ehrProviders.sandbox.epic,
        cerner: env.ehrProviders.sandbox.cerner,
        allscripts: env.ehrProviders.sandbox.allscripts
      }
    });
  });
  
  beforeEach(async () => {
    // Clear test data
    await utils.clearDatabase();
    await utils.clearRedis();
    
    // Create test patient
    testPatient = utils.generateTestPatient();
  });
  
  afterAll(async () => {
    await testEnv.teardown();
  });
  
  describe('Patient Updates', () => {
    it('should trigger webhook on patient creation', async () => {
      // Set up webhook
      const webhookUrl = 'http://localhost:9999/webhook';
      const webhook = await webhookService.registerWebhook({
        url: webhookUrl,
        events: ['patient:created'],
        secret: 'test-secret'
      });
      
      // Create mock webhook server
      const receivedEvents: any[] = [];
      const mockServer = await utils.createMockWebhookServer(webhookUrl, {
        onEvent: (event) => {
          receivedEvents.push(event);
        }
      });
      
      try {
        // Create patient
        const createdPatient = await ehrService.createPatient(testPatient);
        
        // Wait for webhook to be triggered
        await utils.waitForCondition(() => receivedEvents.length > 0);
        
        // Verify webhook was triggered with correct data
        expect(receivedEvents).toHaveLength(1);
        expect(receivedEvents[0]).toMatchObject({
          event: 'patient:created',
          data: {
            patient: {
              id: createdPatient.id,
              name: testPatient.name
            }
          }
        });
        
        // Verify audit log
        await expect(utils.verifyAuditLog({
          action: 'webhook:triggered',
          resourceType: 'webhook',
          resourceId: webhook.id
        })).resolves.toBe(true);
        
      } finally {
        await mockServer.stop();
      }
    });
    
    it('should trigger webhook on patient update', async () => {
      // Create patient first
      const createdPatient = await ehrService.createPatient(testPatient);
      
      // Set up webhook
      const webhookUrl = 'http://localhost:9999/webhook';
      const webhook = await webhookService.registerWebhook({
        url: webhookUrl,
        events: ['patient:updated'],
        secret: 'test-secret'
      });
      
      // Create mock webhook server
      const receivedEvents: any[] = [];
      const mockServer = await utils.createMockWebhookServer(webhookUrl, {
        onEvent: (event) => {
          receivedEvents.push(event);
        }
      });
      
      try {
        // Update patient
        const updatedPatient = await ehrService.updatePatient({
          ...createdPatient,
          name: 'Updated Name'
        });
        
        // Wait for webhook to be triggered
        await utils.waitForCondition(() => receivedEvents.length > 0);
        
        // Verify webhook was triggered with correct data
        expect(receivedEvents).toHaveLength(1);
        expect(receivedEvents[0]).toMatchObject({
          event: 'patient:updated',
          data: {
            patient: {
              id: updatedPatient.id,
              name: 'Updated Name'
            }
          }
        });
        
        // Verify audit log
        await expect(utils.verifyAuditLog({
          action: 'webhook:triggered',
          resourceType: 'webhook',
          resourceId: webhook.id
        })).resolves.toBe(true);
        
      } finally {
        await mockServer.stop();
      }
    });
    
    it('should handle webhook delivery failures with retries', async () => {
      // Set up webhook
      const webhookUrl = 'http://localhost:9999/webhook';
      const webhook = await webhookService.registerWebhook({
        url: webhookUrl,
        events: ['patient:created'],
        secret: 'test-secret'
      });
      
      // Create mock webhook server that fails initially
      let failureCount = 0;
      const receivedEvents: any[] = [];
      const mockServer = await utils.createMockWebhookServer(webhookUrl, {
        onEvent: (event) => {
          if (failureCount < 2) {
            failureCount++;
            throw new Error('Simulated failure');
          }
          receivedEvents.push(event);
        }
      });
      
      try {
        // Create patient
        const createdPatient = await ehrService.createPatient(testPatient);
        
        // Wait for webhook to be triggered successfully after retries
        await utils.waitForCondition(() => receivedEvents.length > 0);
        
        // Verify webhook was triggered with correct data
        expect(receivedEvents).toHaveLength(1);
        expect(receivedEvents[0]).toMatchObject({
          event: 'patient:created',
          data: {
            patient: {
              id: createdPatient.id,
              name: testPatient.name
            }
          }
        });
        
        // Verify audit logs for retries
        await expect(utils.verifyAuditLog({
          action: 'webhook:delivery:failed',
          resourceType: 'webhook',
          resourceId: webhook.id,
          count: 2
        })).resolves.toBe(true);
        
        await expect(utils.verifyAuditLog({
          action: 'webhook:delivery:succeeded',
          resourceType: 'webhook',
          resourceId: webhook.id,
          count: 1
        })).resolves.toBe(true);
        
      } finally {
        await mockServer.stop();
      }
    });
    
    it('should respect webhook security settings', async () => {
      // Set up webhook with security requirements
      const webhookUrl = 'http://localhost:9999/webhook';
      const webhook = await webhookService.registerWebhook({
        url: webhookUrl,
        events: ['patient:created'],
        secret: 'test-secret',
        security: {
          signatureHeader: 'X-Signature',
          signatureAlgorithm: 'sha256'
        }
      });
      
      // Create mock webhook server that validates signatures
      const receivedEvents: any[] = [];
      const mockServer = await utils.createMockWebhookServer(webhookUrl, {
        onEvent: (event, headers) => {
          // Verify signature
          const signature = headers['x-signature'];
          if (!webhookService.verifySignature(event, 'test-secret', signature)) {
            throw new Error('Invalid signature');
          }
          receivedEvents.push(event);
        }
      });
      
      try {
        // Create patient
        const createdPatient = await ehrService.createPatient(testPatient);
        
        // Wait for webhook to be triggered
        await utils.waitForCondition(() => receivedEvents.length > 0);
        
        // Verify webhook was triggered with correct data and valid signature
        expect(receivedEvents).toHaveLength(1);
        expect(receivedEvents[0]).toMatchObject({
          event: 'patient:created',
          data: {
            patient: {
              id: createdPatient.id,
              name: testPatient.name
            }
          }
        });
        
      } finally {
        await mockServer.stop();
      }
    });
  });
  
  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent webhook deliveries', async () => {
      // Set up webhook
      const webhookUrl = 'http://localhost:9999/webhook';
      await webhookService.registerWebhook({
        url: webhookUrl,
        events: ['patient:created'],
        secret: 'test-secret'
      });
      
      // Create mock webhook server
      const receivedEvents: any[] = [];
      const mockServer = await utils.createMockWebhookServer(webhookUrl, {
        onEvent: (event) => {
          receivedEvents.push(event);
        }
      });
      
      try {
        // Create multiple patients concurrently
        const patients = Array(10).fill(null).map(() => 
          utils.generateTestPatient()
        );
        
        const results = await utils.measurePerformance(async () => {
          await Promise.all(
            patients.map(patient => 
              ehrService.createPatient(patient)
            )
          );
        });
        
        // Wait for all webhooks to be triggered
        await utils.waitForCondition(() => receivedEvents.length === patients.length);
        
        // Verify performance
        expect(results.duration).toBeLessThan(5000); // 5 seconds max
        expect(results.memoryUsage).toBeLessThan(50 * 1024 * 1024); // 50MB max
        
        // Verify all webhooks were triggered
        expect(receivedEvents).toHaveLength(patients.length);
        
      } finally {
        await mockServer.stop();
      }
    });
    
    it('should maintain performance under sustained load', async () => {
      // Set up webhook
      const webhookUrl = 'http://localhost:9999/webhook';
      await webhookService.registerWebhook({
        url: webhookUrl,
        events: ['patient:created'],
        secret: 'test-secret'
      });
      
      // Create mock webhook server
      const receivedEvents: any[] = [];
      const mockServer = await utils.createMockWebhookServer(webhookUrl, {
        onEvent: (event) => {
          receivedEvents.push(event);
        }
      });
      
      try {
        // Run load test
        const results = await utils.runLoadTest({
          duration: 10000, // 10 seconds
          rps: 10, // 10 requests per second
          operation: async () => {
            const patient = utils.generateTestPatient();
            await ehrService.createPatient(patient);
          }
        });
        
        // Verify performance metrics
        expect(results.successfulRequests).toBeGreaterThan(0);
        expect(results.failedRequests).toBe(0);
        expect(results.averageResponseTime).toBeLessThan(200); // 200ms
        expect(results.p95ResponseTime).toBeLessThan(500); // 500ms
        
        // Verify webhooks were triggered for all successful requests
        await utils.waitForCondition(() => 
          receivedEvents.length === results.successfulRequests
        );
        
      } finally {
        await mockServer.stop();
      }
    });
  });
}); 