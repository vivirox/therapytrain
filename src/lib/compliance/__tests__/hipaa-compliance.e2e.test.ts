import { HipaaMonitoringService } from '../hipaa-monitoring';
import { ViolationDetectionSystem } from '../violation-detection';
import { RemediationWorkflowSystem } from '../remediation-workflows';
import { AlertService } from '../../email/alert-service';
import { supabase } from '@/lib/supabaseclient';

// Mock external dependencies
jest.mock('@/lib/supabaseclient', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: {} }),
      single: jest.fn().mockResolvedValue({ data: {} }),
      order: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis()
    })),
    rpc: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({ data: { healthy: true } })
    }),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockResolvedValue({})
    }))
  }
}));

jest.mock('../../email/alert-service', () => ({
  AlertService: {
    createAlert: jest.fn().mockResolvedValue({})
  }
}));

describe('HIPAA Compliance End-to-End', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Unauthorized Access Workflow', () => {
    it('should handle unauthorized access violation from detection through remediation', async () => {
      // 1. Start monitoring
      const subscription = await HipaaMonitoringService.startMonitoring();
      expect(subscription).toBeDefined();

      // 2. Simulate unauthorized access event
      const accessEvent = {
        type: 'access',
        authorized: false,
        user_id: 'test-user',
        data_type: 'phi',
        timestamp: new Date().toISOString()
      };

      // 3. Process event through violation detection
      const violations = await ViolationDetectionSystem.processEvent(accessEvent);
      expect(violations).toHaveLength(1);
      expect(violations[0].type).toBe('unauthorized_access');
      expect(violations[0].severity).toBe('high');

      // 4. Create and execute remediation workflow
      const workflow = await RemediationWorkflowSystem.createWorkflow(violations[0]);
      expect(workflow.status).toBe('initiated');
      expect(workflow.steps.length).toBeGreaterThan(0);

      // 5. Verify automated steps were executed
      const automatedSteps = workflow.steps.filter(step => step.type === 'automated');
      for (const step of automatedSteps) {
        expect(step.status).toBe('completed');
      }

      // 6. Verify alerts were created
      expect(AlertService.createAlert).toHaveBeenCalled();

      // 7. Verify user account was locked
      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(supabase.from('users').update).toHaveBeenCalledWith(
        expect.objectContaining({
          locked: true,
          lock_reason: expect.stringContaining('HIPAA violation')
        })
      );
    });
  });

  describe('PHI Exposure Workflow', () => {
    it('should handle PHI exposure violation from detection through remediation', async () => {
      // 1. Simulate PHI exposure event
      const phiEvent = {
        type: 'data_access',
        data_type: 'phi',
        encrypted: false,
        record_id: 'test-record',
        timestamp: new Date().toISOString()
      };

      // 2. Process event through violation detection
      const violations = await ViolationDetectionSystem.processEvent(phiEvent);
      expect(violations).toHaveLength(1);
      expect(violations[0].type).toBe('phi_exposure');
      expect(violations[0].severity).toBe('critical');

      // 3. Create and execute remediation workflow
      const workflow = await RemediationWorkflowSystem.createWorkflow(violations[0]);
      expect(workflow.status).toBe('initiated');

      // 4. Verify PHI securing steps
      expect(supabase.from).toHaveBeenCalledWith('phi_records');
      expect(supabase.from('phi_records').update).toHaveBeenCalledWith(
        expect.objectContaining({
          access_restricted: true,
          encryption_level: 'maximum'
        })
      );

      // 5. Verify critical alerts were created
      expect(AlertService.createAlert).toHaveBeenCalledWith(
        'hipaa_violation',
        'critical',
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('Encryption Failure Workflow', () => {
    it('should handle encryption failure from detection through remediation', async () => {
      // 1. Simulate encryption failure event
      const encryptionEvent = {
        type: 'encryption',
        status: 'failed',
        data_id: 'test-data',
        data_type: 'patient_record',
        timestamp: new Date().toISOString()
      };

      // 2. Mock encryption system verification failure
      (supabase.rpc as jest.Mock).mockReturnValueOnce({
        single: jest.fn().mockResolvedValue({ data: { healthy: false } })
      });

      // 3. Process event through violation detection
      const violations = await ViolationDetectionSystem.processEvent(encryptionEvent);
      expect(violations).toHaveLength(1);
      expect(violations[0].type).toBe('encryption_failure');

      // 4. Create remediation workflow
      const workflow = await RemediationWorkflowSystem.createWorkflow(violations[0]);
      expect(workflow.status).toBe('initiated');

      // 5. Verify data security steps
      expect(supabase.from).toHaveBeenCalledWith('data_security_incidents');
      expect(supabase.rpc).toHaveBeenCalledWith('verify_encryption_system');
    });
  });

  describe('Manual Step Handling', () => {
    it('should handle manual remediation steps correctly', async () => {
      // 1. Create a workflow with manual steps
      const violation = {
        id: 'test-violation',
        type: 'unauthorized_access',
        severity: 'high',
        description: 'Test violation',
        metadata: { user_id: 'test-user' },
        status: 'new',
        remediationSteps: []
      };

      const workflow = await RemediationWorkflowSystem.createWorkflow(violation);
      const manualStep = workflow.steps.find(step => step.type === 'manual');
      expect(manualStep).toBeDefined();

      // 2. Update manual step status
      const notes = 'Security assessment completed';
      await RemediationWorkflowSystem.updateManualStep(
        workflow.id,
        manualStep!.id,
        'completed',
        notes
      );

      // 3. Verify step update
      expect(supabase.from).toHaveBeenCalledWith('remediation_workflows');
      expect(supabase.from('remediation_workflows').update).toHaveBeenCalledWith(
        expect.objectContaining({
          steps: expect.arrayContaining([
            expect.objectContaining({
              id: manualStep!.id,
              status: 'completed',
              notes
            })
          ])
        })
      );
    });
  });

  describe('Workflow Status Updates', () => {
    it('should update overall workflow status based on step completion', async () => {
      // 1. Create workflow
      const violation = {
        id: 'test-violation',
        type: 'unauthorized_access',
        severity: 'high',
        description: 'Test violation',
        metadata: { user_id: 'test-user' },
        status: 'new',
        remediationSteps: []
      };

      const workflow = await RemediationWorkflowSystem.createWorkflow(violation);
      expect(workflow.status).toBe('initiated');

      // 2. Complete all steps
      for (const step of workflow.steps) {
        if (step.type === 'manual') {
          await RemediationWorkflowSystem.updateManualStep(
            workflow.id,
            step.id,
            'completed',
            'Step completed'
          );
        }
      }

      // 3. Verify workflow completion
      const updatedWorkflow = await RemediationWorkflowSystem.getWorkflow(workflow.id);
      expect(updatedWorkflow?.status).toBe('completed');
    });
  });

  describe('Alert Integration', () => {
    it('should create appropriate alerts throughout the compliance workflow', async () => {
      // 1. Simulate critical violation
      const violation = {
        id: 'test-violation',
        type: 'phi_exposure',
        severity: 'critical',
        description: 'Critical PHI exposure',
        metadata: { record_id: 'test-record' },
        status: 'new',
        remediationSteps: []
      };

      // 2. Create workflow
      await RemediationWorkflowSystem.createWorkflow(violation);

      // 3. Verify alert creation
      expect(AlertService.createAlert).toHaveBeenCalledWith(
        'hipaa_violation',
        'critical',
        expect.any(String),
        expect.any(Object)
      );

      // 4. Verify alert for automated actions
      expect(AlertService.createAlert).toHaveBeenCalledWith(
        'hipaa_violation',
        expect.any(String),
        expect.stringContaining('automated action'),
        expect.any(Object)
      );
    });
  });
}); 