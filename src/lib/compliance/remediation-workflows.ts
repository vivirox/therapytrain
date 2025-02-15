import { supabase } from '@/lib/supabaseclient';
import { AlertService } from '../email/alert-service';
import { HipaaViolationType } from './hipaa-monitoring';
import { ViolationAlert } from './violation-detection';

export interface RemediationStep {
  id: string;
  description: string;
  type: 'automated' | 'manual';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedTo?: string;
  completedAt?: string;
  notes?: string;
}

export interface RemediationWorkflow {
  id: string;
  violationId: string;
  violationType: HipaaViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'initiated' | 'in_progress' | 'completed' | 'failed';
  steps: RemediationStep[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export class RemediationWorkflowSystem {
  private static readonly WORKFLOW_TEMPLATES: Record<HipaaViolationType, RemediationStep[]> = {
    unauthorized_access: [
      {
        id: 'ua_step_1',
        description: 'Lock user account',
        type: 'automated',
        status: 'pending'
      },
      {
        id: 'ua_step_2',
        description: 'Review access logs for suspicious patterns',
        type: 'manual',
        status: 'pending'
      },
      {
        id: 'ua_step_3',
        description: 'Notify security team',
        type: 'automated',
        status: 'pending'
      },
      {
        id: 'ua_step_4',
        description: 'Conduct security assessment',
        type: 'manual',
        status: 'pending'
      }
    ],
    phi_exposure: [
      {
        id: 'pe_step_1',
        description: 'Secure exposed PHI data',
        type: 'automated',
        status: 'pending'
      },
      {
        id: 'pe_step_2',
        description: 'Assess exposure scope',
        type: 'manual',
        status: 'pending'
      },
      {
        id: 'pe_step_3',
        description: 'Initiate breach notification protocol',
        type: 'automated',
        status: 'pending'
      },
      {
        id: 'pe_step_4',
        description: 'Document incident details',
        type: 'manual',
        status: 'pending'
      }
    ],
    encryption_failure: [
      {
        id: 'ef_step_1',
        description: 'Secure affected data',
        type: 'automated',
        status: 'pending'
      },
      {
        id: 'ef_step_2',
        description: 'Verify encryption system status',
        type: 'automated',
        status: 'pending'
      },
      {
        id: 'ef_step_3',
        description: 'Review encryption logs',
        type: 'manual',
        status: 'pending'
      },
      {
        id: 'ef_step_4',
        description: 'Update encryption keys if necessary',
        type: 'manual',
        status: 'pending'
      }
    ],
    audit_gap: [
      {
        id: 'ag_step_1',
        description: 'Identify missing audit records',
        type: 'automated',
        status: 'pending'
      },
      {
        id: 'ag_step_2',
        description: 'Review system logs for gaps',
        type: 'manual',
        status: 'pending'
      },
      {
        id: 'ag_step_3',
        description: 'Verify audit system integrity',
        type: 'automated',
        status: 'pending'
      }
    ],
    retention_violation: [
      {
        id: 'rv_step_1',
        description: 'Identify affected records',
        type: 'automated',
        status: 'pending'
      },
      {
        id: 'rv_step_2',
        description: 'Apply correct retention policy',
        type: 'automated',
        status: 'pending'
      },
      {
        id: 'rv_step_3',
        description: 'Document retention changes',
        type: 'manual',
        status: 'pending'
      }
    ],
    authentication_failure: [
      {
        id: 'af_step_1',
        description: 'Lock affected accounts',
        type: 'automated',
        status: 'pending'
      },
      {
        id: 'af_step_2',
        description: 'Review authentication logs',
        type: 'manual',
        status: 'pending'
      },
      {
        id: 'af_step_3',
        description: 'Reset security credentials',
        type: 'automated',
        status: 'pending'
      }
    ],
    integrity_breach: [
      {
        id: 'ib_step_1',
        description: 'Isolate affected systems',
        type: 'automated',
        status: 'pending'
      },
      {
        id: 'ib_step_2',
        description: 'Verify data integrity',
        type: 'automated',
        status: 'pending'
      },
      {
        id: 'ib_step_3',
        description: 'Restore from backup if necessary',
        type: 'manual',
        status: 'pending'
      }
    ]
  };

  /**
   * Create a new remediation workflow for a violation
   */
  static async createWorkflow(violation: ViolationAlert): Promise<RemediationWorkflow> {
    const workflow: RemediationWorkflow = {
      id: crypto.randomUUID(),
      violationId: violation.id,
      violationType: violation.type,
      severity: violation.severity,
      status: 'initiated',
      steps: this.WORKFLOW_TEMPLATES[violation.type].map(step => ({
        ...step,
        id: crypto.randomUUID()
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      // Store workflow in database
      await supabase.from('remediation_workflows').insert([workflow]);

      // Start automated steps
      await this.processAutomatedSteps(workflow);

      return workflow;
    } catch (error) {
      console.error('Failed to create remediation workflow:', error);
      throw error;
    }
  }

  /**
   * Process automated remediation steps
   */
  private static async processAutomatedSteps(workflow: RemediationWorkflow): Promise<void> {
    const automatedSteps = workflow.steps.filter(step => step.type === 'automated');

    for (const step of automatedSteps) {
      try {
        await this.executeAutomatedStep(workflow, step);
      } catch (error) {
        console.error(`Failed to execute automated step ${step.id}:`, error);
        await this.updateStepStatus(workflow.id, step.id, 'failed');
      }
    }
  }

  /**
   * Execute an automated remediation step
   */
  private static async executeAutomatedStep(workflow: RemediationWorkflow, step: RemediationStep): Promise<void> {
    await this.updateStepStatus(workflow.id, step.id, 'in_progress');

    try {
      switch (step.description) {
        case 'Lock user account':
          await this.lockUserAccount(workflow);
          break;
        case 'Secure exposed PHI data':
          await this.secureExposedPhi(workflow);
          break;
        case 'Secure affected data':
          await this.secureAffectedData(workflow);
          break;
        case 'Verify encryption system status':
          await this.verifyEncryptionSystem(workflow);
          break;
        case 'Identify missing audit records':
          await this.identifyMissingAuditRecords(workflow);
          break;
        case 'Apply correct retention policy':
          await this.applyRetentionPolicy(workflow);
          break;
        case 'Lock affected accounts':
          await this.lockAffectedAccounts(workflow);
          break;
        case 'Reset security credentials':
          await this.resetSecurityCredentials(workflow);
          break;
        case 'Isolate affected systems':
          await this.isolateAffectedSystems(workflow);
          break;
        case 'Verify data integrity':
          await this.verifyDataIntegrity(workflow);
          break;
        default:
          throw new Error(`Unknown automated step: ${step.description}`);
      }

      await this.updateStepStatus(workflow.id, step.id, 'completed');
    } catch (error) {
      console.error(`Failed to execute step ${step.id}:`, error);
      await this.updateStepStatus(workflow.id, step.id, 'failed');
      throw error;
    }
  }

  /**
   * Update the status of a remediation step
   */
  private static async updateStepStatus(
    workflowId: string,
    stepId: string,
    status: RemediationStep['status'],
    notes?: string
  ): Promise<void> {
    try {
      const { data: workflow } = await supabase
        .from('remediation_workflows')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (!workflow) throw new Error('Workflow not found');

      const updatedSteps = workflow.steps.map(step =>
        step.id === stepId
          ? {
              ...step,
              status,
              notes,
              completedAt: status === 'completed' ? new Date().toISOString() : undefined
            }
          : step
      );

      await supabase
        .from('remediation_workflows')
        .update({
          steps: updatedSteps,
          updatedAt: new Date().toISOString(),
          status: this.calculateWorkflowStatus(updatedSteps)
        })
        .eq('id', workflowId);
    } catch (error) {
      console.error('Failed to update step status:', error);
      throw error;
    }
  }

  /**
   * Calculate overall workflow status based on steps
   */
  private static calculateWorkflowStatus(steps: RemediationStep[]): RemediationWorkflow['status'] {
    if (steps.some(step => step.status === 'failed')) return 'failed';
    if (steps.every(step => step.status === 'completed')) return 'completed';
    if (steps.some(step => step.status === 'in_progress')) return 'in_progress';
    return 'initiated';
  }

  /**
   * Automated step implementations
   */
  private static async lockUserAccount(workflow: RemediationWorkflow): Promise<void> {
    const { data: violation } = await supabase
      .from('hipaa_violations')
      .select('metadata')
      .eq('id', workflow.violationId)
      .single();

    if (!violation) throw new Error('Violation not found');

    await supabase
      .from('users')
      .update({
        locked: true,
        locked_at: new Date().toISOString(),
        lock_reason: 'HIPAA violation - unauthorized access'
      })
      .eq('id', violation.metadata.user_id);
  }

  private static async secureExposedPhi(workflow: RemediationWorkflow): Promise<void> {
    const { data: violation } = await supabase
      .from('hipaa_violations')
      .select('metadata')
      .eq('id', workflow.violationId)
      .single();

    if (!violation) throw new Error('Violation not found');

    // Implement PHI securing logic
    await supabase
      .from('phi_records')
      .update({
        access_restricted: true,
        encryption_level: 'maximum',
        last_security_update: new Date().toISOString()
      })
      .eq('id', violation.metadata.record_id);
  }

  private static async secureAffectedData(workflow: RemediationWorkflow): Promise<void> {
    // Implementation similar to secureExposedPhi
    await this.secureExposedPhi(workflow);
  }

  private static async verifyEncryptionSystem(workflow: RemediationWorkflow): Promise<void> {
    // Implement encryption system verification
    const { data: encryptionStatus } = await supabase
      .rpc('verify_encryption_system')
      .single();

    if (!encryptionStatus?.healthy) {
      throw new Error('Encryption system verification failed');
    }
  }

  private static async identifyMissingAuditRecords(workflow: RemediationWorkflow): Promise<void> {
    // Implement audit gap detection
    const { data: gaps } = await supabase
      .rpc('identify_audit_gaps', {
        workflow_id: workflow.id
      });

    if (gaps && gaps.length > 0) {
      await AlertService.createAlert(
        'hipaa_violation',
        'high',
        'Audit gaps identified',
        { gaps }
      );
    }
  }

  private static async applyRetentionPolicy(workflow: RemediationWorkflow): Promise<void> {
    // Implement retention policy application
    await supabase
      .rpc('apply_retention_policy', {
        workflow_id: workflow.id
      });
  }

  private static async lockAffectedAccounts(workflow: RemediationWorkflow): Promise<void> {
    const { data: violation } = await supabase
      .from('hipaa_violations')
      .select('metadata')
      .eq('id', workflow.violationId)
      .single();

    if (!violation) throw new Error('Violation not found');

    for (const userId of violation.metadata.affected_users) {
      await this.lockUserAccount({ ...workflow, metadata: { user_id: userId } });
    }
  }

  private static async resetSecurityCredentials(workflow: RemediationWorkflow): Promise<void> {
    const { data: violation } = await supabase
      .from('hipaa_violations')
      .select('metadata')
      .eq('id', workflow.violationId)
      .single();

    if (!violation) throw new Error('Violation not found');

    await supabase
      .rpc('reset_security_credentials', {
        user_id: violation.metadata.user_id
      });
  }

  private static async isolateAffectedSystems(workflow: RemediationWorkflow): Promise<void> {
    const { data: violation } = await supabase
      .from('hipaa_violations')
      .select('metadata')
      .eq('id', workflow.violationId)
      .single();

    if (!violation) throw new Error('Violation not found');

    await supabase
      .rpc('isolate_systems', {
        system_ids: violation.metadata.affected_systems
      });
  }

  private static async verifyDataIntegrity(workflow: RemediationWorkflow): Promise<void> {
    const { data: violation } = await supabase
      .from('hipaa_violations')
      .select('metadata')
      .eq('id', workflow.violationId)
      .single();

    if (!violation) throw new Error('Violation not found');

    const { data: integrityCheck } = await supabase
      .rpc('verify_data_integrity', {
        record_ids: violation.metadata.affected_records
      });

    if (!integrityCheck?.valid) {
      throw new Error('Data integrity verification failed');
    }
  }

  /**
   * Get workflow by ID
   */
  static async getWorkflow(workflowId: string): Promise<RemediationWorkflow | null> {
    try {
      const { data, error } = await supabase
        .from('remediation_workflows')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to get workflow:', error);
      return null;
    }
  }

  /**
   * Get all workflows for a violation
   */
  static async getWorkflowsByViolation(violationId: string): Promise<RemediationWorkflow[]> {
    try {
      const { data, error } = await supabase
        .from('remediation_workflows')
        .select('*')
        .eq('violation_id', violationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get workflows:', error);
      return [];
    }
  }

  /**
   * Update manual step status
   */
  static async updateManualStep(
    workflowId: string,
    stepId: string,
    status: RemediationStep['status'],
    notes?: string
  ): Promise<void> {
    const step = (await this.getWorkflow(workflowId))?.steps.find(s => s.id === stepId);
    
    if (!step) throw new Error('Step not found');
    if (step.type !== 'manual') throw new Error('Cannot manually update automated step');

    await this.updateStepStatus(workflowId, stepId, status, notes);
  }
} 