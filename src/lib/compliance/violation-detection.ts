import { supabase } from '@/lib/supabaseclient';
import { AlertService } from '../email/alert-service';
import { HipaaViolationType } from './hipaa-monitoring';

export interface ViolationDetectionRule {
  id: string;
  type: HipaaViolationType;
  condition: (event: any) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  remediationSteps: string[];
}

export interface ViolationAlert {
  id: string;
  ruleId: string;
  timestamp: string;
  type: HipaaViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata: Record<string, any>;
  status: 'new' | 'acknowledged' | 'resolved';
  remediationSteps: string[];
}

export class ViolationDetectionSystem {
  private static rules: ViolationDetectionRule[] = [
    {
      id: 'rule_001',
      type: 'unauthorized_access',
      condition: (event) => event.type === 'access' && !event.authorized,
      severity: 'high',
      description: 'Unauthorized access attempt detected',
      remediationSteps: [
        'Lock user account',
        'Review access logs',
        'Notify security team',
        'Document incident'
      ]
    },
    {
      id: 'rule_002',
      type: 'phi_exposure',
      condition: (event) => event.type === 'data_access' && event.data_type === 'phi' && !event.encrypted,
      severity: 'critical',
      description: 'Unencrypted PHI access detected',
      remediationSteps: [
        'Immediately encrypt data',
        'Review access patterns',
        'Update security protocols',
        'Notify privacy officer'
      ]
    },
    {
      id: 'rule_003',
      type: 'encryption_failure',
      condition: (event) => event.type === 'encryption' && event.status === 'failed',
      severity: 'critical',
      description: 'Encryption failure detected',
      remediationSteps: [
        'Secure affected data',
        'Review encryption system',
        'Update encryption keys',
        'Document failure cause'
      ]
    }
  ];

  /**
   * Process an event through all violation detection rules
   */
  static async processEvent(event: any): Promise<ViolationAlert[]> {
    const violations: ViolationAlert[] = [];

    for (const rule of this.rules) {
      if (rule.condition(event)) {
        const alert: ViolationAlert = {
          id: crypto.randomUUID(),
          ruleId: rule.id,
          timestamp: new Date().toISOString(),
          type: rule.type,
          severity: rule.severity,
          description: rule.description,
          metadata: { ...event },
          status: 'new',
          remediationSteps: rule.remediationSteps
        };

        await this.handleViolation(alert);
        violations.push(alert);
      }
    }

    return violations;
  }

  /**
   * Handle a detected violation
   */
  private static async handleViolation(alert: ViolationAlert) {
    try {
      // Store violation in database
      await supabase.from('hipaa_violations').insert([{
        id: alert.id,
        rule_id: alert.ruleId,
        type: alert.type,
        severity: alert.severity,
        description: alert.description,
        metadata: alert.metadata,
        status: alert.status,
        remediation_steps: alert.remediationSteps,
        created_at: alert.timestamp
      }]);

      // Create alert
      await AlertService.createAlert(
        'hipaa_violation',
        alert.severity,
        alert.description,
        {
          violation_type: alert.type,
          metadata: alert.metadata,
          remediation_steps: alert.remediationSteps
        }
      );

      // Handle critical violations immediately
      if (alert.severity === 'critical') {
        await this.handleCriticalViolation(alert);
      }
    } catch (error) {
      console.error('Failed to handle HIPAA violation:', error);
      throw error;
    }
  }

  /**
   * Handle critical violations that require immediate action
   */
  private static async handleCriticalViolation(alert: ViolationAlert) {
    switch (alert.type) {
      case 'unauthorized_access':
        await this.lockUserAccount(alert.metadata.user_id);
        break;
      case 'phi_exposure':
        await this.initiateBreachProtocol(alert);
        break;
      case 'encryption_failure':
        await this.secureAffectedData(alert);
        break;
    }
  }

  /**
   * Lock user account
   */
  private static async lockUserAccount(userId: string) {
    await supabase
      .from('users')
      .update({
        locked: true,
        locked_at: new Date().toISOString(),
        lock_reason: 'HIPAA violation - unauthorized access'
      })
      .eq('id', userId);
  }

  /**
   * Initiate breach protocol
   */
  private static async initiateBreachProtocol(alert: ViolationAlert) {
    await supabase.from('breach_incidents').insert([{
      violation_id: alert.id,
      status: 'initiated',
      severity: alert.severity,
      details: alert.metadata,
      created_at: alert.timestamp
    }]);
  }

  /**
   * Secure affected data
   */
  private static async secureAffectedData(alert: ViolationAlert) {
    // Implement data securing logic based on the type of data affected
    const { data_id, data_type } = alert.metadata;
    
    await supabase
      .from('data_security_incidents')
      .insert([{
        violation_id: alert.id,
        data_id,
        data_type,
        status: 'securing',
        created_at: alert.timestamp
      }]);
  }
} 