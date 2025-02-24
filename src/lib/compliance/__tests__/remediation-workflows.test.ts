import { RemediationWorkflowSystem } from '../remediation-workflows';
import { supabase } from '@/lib/supabaseClient';
import { AlertService } from '../../email/alert-service';

// Mock supabase and AlertService
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
    })
  }
}));

jest.mock('../../email/alert-service', () => ({
  AlertService: {
    createAlert: jest.fn().mockResolvedValue({})
  }
}));

describe('RemediationWorkflowSystem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createWorkflow', () => {
    it('should create a workflow for unauthorized access violation', async () => {
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

      expect(workflow.violationId).toBe(violation.id);
      expect(workflow.violationType).toBe(violation.type);
      expect(workflow.severity).toBe(violation.severity);
      expect(workflow.status).toBe('initiated');
      expect(workflow.steps.length).toBeGreaterThan(0);
      expect(supabase.from).toHaveBeenCalledWith('remediation_workflows');
    });

    it('should create a workflow for PHI exposure violation', async () => {
      const violation = {
        id: 'test-violation',
        type: 'phi_exposure',
        severity: 'critical',
        description: 'Test violation',
        metadata: { record_id: 'test-record' },
        status: 'new',
        remediationSteps: []
      };

      const workflow = await RemediationWorkflowSystem.createWorkflow(violation);

      expect(workflow.violationId).toBe(violation.id);
      expect(workflow.violationType).toBe(violation.type);
      expect(workflow.severity).toBe(violation.severity);
      expect(workflow.status).toBe('initiated');
      expect(workflow.steps.length).toBeGreaterThan(0);
      expect(supabase.from).toHaveBeenCalledWith('remediation_workflows');
    });
  });

  describe('processAutomatedSteps', () => {
    it('should process automated steps for unauthorized access', async () => {
      const workflow = {
        id: 'test-workflow',
        violationId: 'test-violation',
        violationType: 'unauthorized_access',
        severity: 'high',
        status: 'initiated',
        steps: [
          {
            id: 'step1',
            description: 'Lock user account',
            type: 'automated',
            status: 'pending'
          },
          {
            id: 'step2',
            description: 'Review access logs',
            type: 'manual',
            status: 'pending'
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Mock violation data
      (supabase.from as jest.Mock).mockImplementation((table) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { metadata: { user_id: 'test-user' } }
        }),
        insert: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({})
      }));

      await RemediationWorkflowSystem.createWorkflow(workflow);

      expect(supabase.from).toHaveBeenCalledWith('hipaa_violations');
      expect(supabase.from).toHaveBeenCalledWith('users');
    });

    it('should handle failed automated steps', async () => {
      const workflow = {
        id: 'test-workflow',
        violationId: 'test-violation',
        violationType: 'encryption_failure',
        severity: 'critical',
        status: 'initiated',
        steps: [
          {
            id: 'step1',
            description: 'Verify encryption system status',
            type: 'automated',
            status: 'pending'
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Mock encryption system verification failure
      (supabase.rpc as jest.Mock).mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: { healthy: false } })
      });

      await expect(RemediationWorkflowSystem.createWorkflow(workflow))
        .rejects
        .toThrow('Encryption system verification failed');

      expect(supabase.from).toHaveBeenCalledWith('remediation_workflows');
    });
  });

  describe('updateManualStep', () => {
    it('should update manual step status', async () => {
      const workflowId = 'test-workflow';
      const stepId = 'test-step';
      const status = 'completed';
      const notes = 'Step completed successfully';

      // Mock workflow data
      (supabase.from as jest.Mock).mockImplementation((table) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            steps: [{
              id: stepId,
              type: 'manual',
              status: 'pending'
            }]
          }
        }),
        update: jest.fn().mockResolvedValue({})
      }));

      await RemediationWorkflowSystem.updateManualStep(workflowId, stepId, status, notes);

      expect(supabase.from).toHaveBeenCalledWith('remediation_workflows');
    });

    it('should not update automated step status', async () => {
      const workflowId = 'test-workflow';
      const stepId = 'test-step';
      const status = 'completed';

      // Mock workflow data with automated step
      (supabase.from as jest.Mock).mockImplementation((table) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            steps: [{
              id: stepId,
              type: 'automated',
              status: 'pending'
            }]
          }
        })
      }));

      await expect(RemediationWorkflowSystem.updateManualStep(workflowId, stepId, status))
        .rejects
        .toThrow('Cannot manually update automated step');
    });
  });

  describe('getWorkflow', () => {
    it('should retrieve workflow by ID', async () => {
      const workflowId = 'test-workflow';
      const mockWorkflow = {
        id: workflowId,
        violationId: 'test-violation',
        violationType: 'unauthorized_access',
        severity: 'high',
        status: 'in_progress',
        steps: []
      };

      (supabase.from as jest.Mock).mockImplementation((table) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockWorkflow })
      }));

      const workflow = await RemediationWorkflowSystem.getWorkflow(workflowId);

      expect(workflow).toEqual(mockWorkflow);
      expect(supabase.from).toHaveBeenCalledWith('remediation_workflows');
    });
  });

  describe('getWorkflowsByViolation', () => {
    it('should retrieve workflows for a violation', async () => {
      const violationId = 'test-violation';
      const mockWorkflows = [
        {
          id: 'workflow-1',
          violationId,
          status: 'completed'
        },
        {
          id: 'workflow-2',
          violationId,
          status: 'in_progress'
        }
      ];

      (supabase.from as jest.Mock).mockImplementation((table) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({ data: mockWorkflows })
      }));

      const workflows = await RemediationWorkflowSystem.getWorkflowsByViolation(violationId);

      expect(workflows).toEqual(mockWorkflows);
      expect(supabase.from).toHaveBeenCalledWith('remediation_workflows');
    });
  });
}); 