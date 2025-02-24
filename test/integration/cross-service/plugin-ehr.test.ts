import { testEnv } from '../setup/environment';
import { createTestUtils } from '../setup/utils';
import { TestPatient } from '../setup/mocks/ehr';
import { PluginService } from '../../../src/services/plugin';
import { EHRService } from '../../../src/services/ehr';

describe('Plugin Service -> EHR Integration', () => {
  let utils: ReturnType<typeof createTestUtils>;
  let pluginService: PluginService;
  let ehrService: EHRService;
  let testPatient: TestPatient;
  
  beforeAll(async () => {
    const env = await testEnv.setup();
    utils = createTestUtils(env);
    
    // Initialize services
    pluginService = env.services.plugins;
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
  
  describe('Plugin Access to EHR Data', () => {
    it('should allow plugins to read patient data with proper permissions', async () => {
      // Create test patient
      const createdPatient = await ehrService.createPatient(testPatient);
      
      // Create and install test plugin
      const pluginCode = `
        module.exports = {
          async readPatient(patientId) {
            const patient = await this.api.patients.get(patientId);
            return patient;
          }
        };
      `;
      
      const plugin = await pluginService.installPlugin({
        id: 'test-plugin',
        version: '1.0.0',
        code: pluginCode,
        metadata: {
          name: 'Test Plugin',
          description: 'Test plugin for EHR access',
          permissions: ['patients:read'],
          author: 'Test Author'
        }
      });
      
      // Enable plugin
      await pluginService.enablePlugin(plugin.id);
      
      // Execute plugin operation
      const result = await pluginService.executeOperation(plugin.id, 'readPatient', [createdPatient.id]);
      
      // Verify result
      expect(result).toMatchObject({
        id: createdPatient.id,
        name: testPatient.name
      });
      
      // Verify audit log
      await expect(utils.verifyAuditLog({
        action: 'patient:read',
        resourceType: 'patient',
        resourceId: createdPatient.id,
        userId: `plugin:${plugin.id}`
      })).resolves.toBe(true);
    });
    
    it('should prevent plugins from accessing data without proper permissions', async () => {
      // Create test patient
      const createdPatient = await ehrService.createPatient(testPatient);
      
      // Create and install test plugin without required permissions
      const pluginCode = `
        module.exports = {
          async readPatient(patientId) {
            const patient = await this.api.patients.get(patientId);
            return patient;
          }
        };
      `;
      
      const plugin = await pluginService.installPlugin({
        id: 'test-plugin',
        version: '1.0.0',
        code: pluginCode,
        metadata: {
          name: 'Test Plugin',
          description: 'Test plugin for EHR access',
          permissions: [], // No permissions
          author: 'Test Author'
        }
      });
      
      // Enable plugin
      await pluginService.enablePlugin(plugin.id);
      
      // Attempt to execute plugin operation
      await expect(
        pluginService.executeOperation(plugin.id, 'readPatient', [createdPatient.id])
      ).rejects.toThrow('PERMISSION_DENIED');
      
      // Verify security event
      await expect(utils.verifySecurityEvent({
        type: 'PERMISSION_DENIED',
        source: `plugin:${plugin.id}`,
        severity: 'HIGH'
      })).resolves.toBe(true);
    });
    
    it('should handle concurrent plugin access to EHR data', async () => {
      // Create multiple test patients
      const patients = await Promise.all(
        Array(10).fill(null).map(() => 
          ehrService.createPatient(utils.generateTestPatient())
        )
      );
      
      // Create and install test plugin
      const pluginCode = `
        module.exports = {
          async readPatients(patientIds) {
            const patients = await Promise.all(
              patientIds.map(id => this.api.patients.get(id))
            );
            return patients;
          }
        };
      `;
      
      const plugin = await pluginService.installPlugin({
        id: 'test-plugin',
        version: '1.0.0',
        code: pluginCode,
        metadata: {
          name: 'Test Plugin',
          description: 'Test plugin for EHR access',
          permissions: ['patients:read'],
          author: 'Test Author'
        }
      });
      
      // Enable plugin
      await pluginService.enablePlugin(plugin.id);
      
      // Execute plugin operation with performance measurement
      const results = await utils.measurePerformance(async () => {
        return await pluginService.executeOperation(
          plugin.id,
          'readPatients',
          [patients.map(p => p.id)]
        );
      });
      
      // Verify performance
      expect(results.duration).toBeLessThan(5000); // 5 seconds max
      expect(results.memoryUsage).toBeLessThan(50 * 1024 * 1024); // 50MB max
      
      // Verify results
      expect(results.result).toHaveLength(patients.length);
      results.result.forEach((patient, index) => {
        expect(patient).toMatchObject({
          id: patients[index].id,
          name: patients[index].name
        });
      });
      
      // Verify audit logs
      await expect(utils.verifyAuditLog({
        action: 'patient:read',
        resourceType: 'patient',
        userId: `plugin:${plugin.id}`,
        count: patients.length
      })).resolves.toBe(true);
    });
    
    it('should handle plugin errors gracefully', async () => {
      // Create test patient
      const createdPatient = await ehrService.createPatient(testPatient);
      
      // Create and install test plugin with error
      const pluginCode = `
        module.exports = {
          async readPatient(patientId) {
            throw new Error('Simulated plugin error');
          }
        };
      `;
      
      const plugin = await pluginService.installPlugin({
        id: 'test-plugin',
        version: '1.0.0',
        code: pluginCode,
        metadata: {
          name: 'Test Plugin',
          description: 'Test plugin for EHR access',
          permissions: ['patients:read'],
          author: 'Test Author'
        }
      });
      
      // Enable plugin
      await pluginService.enablePlugin(plugin.id);
      
      // Execute plugin operation
      await expect(
        pluginService.executeOperation(plugin.id, 'readPatient', [createdPatient.id])
      ).rejects.toThrow('Simulated plugin error');
      
      // Verify error is logged
      await expect(utils.verifyAuditLog({
        action: 'plugin:error',
        resourceType: 'plugin',
        resourceId: plugin.id,
        details: {
          error: 'Simulated plugin error'
        }
      })).resolves.toBe(true);
    });
  });
  
  describe('Plugin Resource Limits', () => {
    it('should enforce memory limits', async () => {
      // Create and install test plugin that consumes memory
      const pluginCode = `
        module.exports = {
          async consumeMemory() {
            const data = [];
            for (let i = 0; i < 1000000; i++) {
              data.push(new Array(1000).fill('test'));
            }
            return data.length;
          }
        };
      `;
      
      const plugin = await pluginService.installPlugin({
        id: 'test-plugin',
        version: '1.0.0',
        code: pluginCode,
        metadata: {
          name: 'Test Plugin',
          description: 'Test plugin for resource limits',
          permissions: [],
          author: 'Test Author'
        }
      });
      
      // Enable plugin
      await pluginService.enablePlugin(plugin.id);
      
      // Execute plugin operation
      await expect(
        pluginService.executeOperation(plugin.id, 'consumeMemory', [])
      ).rejects.toThrow('RESOURCE_EXHAUSTED');
      
      // Verify resource event
      await expect(utils.verifySecurityEvent({
        type: 'RESOURCE_EXHAUSTED',
        source: `plugin:${plugin.id}`,
        severity: 'HIGH',
        details: {
          resource: 'memory'
        }
      })).resolves.toBe(true);
    });
    
    it('should enforce CPU limits', async () => {
      // Create and install test plugin that consumes CPU
      const pluginCode = `
        module.exports = {
          async consumeCPU() {
            let x = 0;
            for (let i = 0; i < 1000000000; i++) {
              x += Math.sqrt(i);
            }
            return x;
          }
        };
      `;
      
      const plugin = await pluginService.installPlugin({
        id: 'test-plugin',
        version: '1.0.0',
        code: pluginCode,
        metadata: {
          name: 'Test Plugin',
          description: 'Test plugin for resource limits',
          permissions: [],
          author: 'Test Author'
        }
      });
      
      // Enable plugin
      await pluginService.enablePlugin(plugin.id);
      
      // Execute plugin operation
      await expect(
        pluginService.executeOperation(plugin.id, 'consumeCPU', [])
      ).rejects.toThrow('RESOURCE_EXHAUSTED');
      
      // Verify resource event
      await expect(utils.verifySecurityEvent({
        type: 'RESOURCE_EXHAUSTED',
        source: `plugin:${plugin.id}`,
        severity: 'HIGH',
        details: {
          resource: 'cpu'
        }
      })).resolves.toBe(true);
    });
  });
}); 