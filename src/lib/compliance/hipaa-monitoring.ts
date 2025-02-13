import { supabase } from '@/lib/supabaseclient';
import { AlertService } from '../email/alert-service';
import { ViolationDetectionSystem } from './violation-detection';

export type HipaaViolationType = 
  | 'unauthorized_access'
  | 'phi_exposure'
  | 'encryption_failure'
  | 'audit_gap'
  | 'retention_violation'
  | 'authentication_failure'
  | 'integrity_breach';

interface HipaaViolation {
  type: HipaaViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata: Record<string, any>;
  remediation_steps?: string[];
}

export class HipaaMonitoringService {
  private static readonly VIOLATION_THRESHOLDS = {
    unauthorized_access: {
      medium: 2, // attempts
      high: 5,
      critical: 10,
    },
    authentication_failure: {
      medium: 3, // failures
      high: 7,
      critical: 15,
    },
    phi_exposure: {
      medium: 1, // instances
      high: 3,
      critical: 5,
    },
  };

  /**
   * Start real-time monitoring for HIPAA violations
   */
  static async startMonitoring() {
    // Subscribe to relevant tables for real-time monitoring
    const subscription = supabase
      .channel('hipaa-monitoring')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'phi_access_logs',
      }, this.handlePhiAccessChange)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'authentication_logs',
      }, this.handleAuthenticationChange)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'encryption_logs',
      }, this.handleEncryptionChange)
      .subscribe();

    return subscription;
  }

  /**
   * Handle changes to PHI access logs
   */
  private static async handlePhiAccessChange(payload: any) {
    const { new: newRecord, old: oldRecord, eventType } = payload;

    // Process event through violation detection system
    const violations = await ViolationDetectionSystem.processEvent({
      type: 'access',
      authorized: newRecord.authorized,
      user_id: newRecord.user_id,
      data_type: newRecord.data_type,
      encrypted: newRecord.encrypted,
      timestamp: newRecord.timestamp
    });

    // Additional monitoring logic can remain
    if (eventType === 'INSERT' && !newRecord.authorized) {
      const violations = await this.detectUnauthorizedAccess(newRecord.user_id);
      await this.handleViolations(violations);
    }

    if (eventType === 'UPDATE' && newRecord.exposure_level !== oldRecord.exposure_level) {
      const violations = await this.detectPhiExposure(newRecord);
      await this.handleViolations(violations);
    }
  }

  /**
   * Handle changes to authentication logs
   */
  private static async handleAuthenticationChange(payload: any) {
    const { new: newRecord } = payload;

    // Process event through violation detection system
    await ViolationDetectionSystem.processEvent({
      type: 'authentication',
      status: newRecord.status,
      user_id: newRecord.user_id,
      timestamp: newRecord.timestamp
    });

    // Additional monitoring logic can remain
    if (newRecord.status === 'failed') {
      const violations = await this.detectAuthenticationFailures(newRecord.user_id);
      await this.handleViolations(violations);
    }
  }

  /**
   * Handle changes to encryption logs
   */
  private static async handleEncryptionChange(payload: any) {
    const { new: newRecord } = payload;

    // Process event through violation detection system
    await ViolationDetectionSystem.processEvent({
      type: 'encryption',
      status: newRecord.status,
      data_id: newRecord.data_id,
      data_type: newRecord.data_type,
      timestamp: newRecord.timestamp
    });

    // Additional monitoring logic can remain
    if (newRecord.status === 'failed') {
      const violations = await this.detectEncryptionFailures(newRecord);
      await this.handleViolations(violations);
    }
  }

  /**
   * Detect unauthorized access attempts
   */
  private static async detectUnauthorizedAccess(userId: string): Promise<HipaaViolation[]> {
    const timeWindow = new Date();
    timeWindow.setHours(timeWindow.getHours() - 1);

    const { count } = await supabase
      .from('phi_access_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('authorized', false)
      .gte('created_at', timeWindow.toISOString());

    const violations: HipaaViolation[] = [];

    if (count >= this.VIOLATION_THRESHOLDS.unauthorized_access.critical) {
      violations.push({
        type: 'unauthorized_access',
        severity: 'critical',
        description: `Critical: ${count} unauthorized access attempts detected in the last hour`,
        metadata: { user_id: userId, attempt_count: count },
        remediation_steps: [
          'Immediately lock user account',
          'Initiate security audit',
          'Review access logs for potential breach',
          'Notify security team',
        ],
      });
    } else if (count >= this.VIOLATION_THRESHOLDS.unauthorized_access.high) {
      violations.push({
        type: 'unauthorized_access',
        severity: 'high',
        description: `High: ${count} unauthorized access attempts detected`,
        metadata: { user_id: userId, attempt_count: count },
        remediation_steps: [
          'Temporarily suspend user access',
          'Review recent activity',
          'Require additional authentication',
        ],
      });
    } else if (count >= this.VIOLATION_THRESHOLDS.unauthorized_access.medium) {
      violations.push({
        type: 'unauthorized_access',
        severity: 'medium',
        description: `Medium: ${count} unauthorized access attempts detected`,
        metadata: { user_id: userId, attempt_count: count },
        remediation_steps: [
          'Flag account for review',
          'Monitor for additional attempts',
          'Consider additional verification steps',
        ],
      });
    }

    return violations;
  }

  /**
   * Detect potential PHI exposure
   */
  private static async detectPhiExposure(record: any): Promise<HipaaViolation[]> {
    const violations: HipaaViolation[] = [];

    if (record.exposure_level === 'high') {
      violations.push({
        type: 'phi_exposure',
        severity: 'critical',
        description: 'Critical: High-risk PHI exposure detected',
        metadata: {
          record_id: record.id,
          exposure_type: record.exposure_type,
        },
        remediation_steps: [
          'Immediately revoke access',
          'Initiate incident response',
          'Document exposure details',
          'Prepare breach notification',
        ],
      });
    } else if (record.exposure_level === 'medium') {
      violations.push({
        type: 'phi_exposure',
        severity: 'high',
        description: 'High: Potential PHI exposure detected',
        metadata: {
          record_id: record.id,
          exposure_type: record.exposure_type,
        },
        remediation_steps: [
          'Review access permissions',
          'Document incident details',
          'Assess notification requirements',
        ],
      });
    }

    return violations;
  }

  /**
   * Detect authentication failures
   */
  private static async detectAuthenticationFailures(userId: string): Promise<HipaaViolation[]> {
    const timeWindow = new Date();
    timeWindow.setHours(timeWindow.getHours() - 1);

    const { count } = await supabase
      .from('authentication_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'failed')
      .gte('created_at', timeWindow.toISOString());

    const violations: HipaaViolation[] = [];

    if (count >= this.VIOLATION_THRESHOLDS.authentication_failure.critical) {
      violations.push({
        type: 'authentication_failure',
        severity: 'critical',
        description: `Critical: ${count} authentication failures detected`,
        metadata: { user_id: userId, failure_count: count },
        remediation_steps: [
          'Lock account immediately',
          'Require admin intervention',
          'Review login attempt patterns',
          'Check for suspicious IP addresses',
        ],
      });
    } else if (count >= this.VIOLATION_THRESHOLDS.authentication_failure.high) {
      violations.push({
        type: 'authentication_failure',
        severity: 'high',
        description: `High: ${count} authentication failures detected`,
        metadata: { user_id: userId, failure_count: count },
        remediation_steps: [
          'Require additional verification',
          'Monitor login attempts',
          'Review recent activity',
        ],
      });
    }

    return violations;
  }

  /**
   * Detect encryption failures
   */
  private static async detectEncryptionFailures(record: any): Promise<HipaaViolation[]> {
    const violations: HipaaViolation[] = [];

    if (record.failure_type === 'key_rotation') {
      violations.push({
        type: 'encryption_failure',
        severity: 'high',
        description: 'High: Encryption key rotation failure detected',
        metadata: {
          record_id: record.id,
          failure_type: record.failure_type,
        },
        remediation_steps: [
          'Verify key management system',
          'Check key rotation logs',
          'Ensure backup keys are accessible',
          'Monitor affected data',
        ],
      });
    } else if (record.failure_type === 'encryption_process') {
      violations.push({
        type: 'encryption_failure',
        severity: 'critical',
        description: 'Critical: Data encryption process failure',
        metadata: {
          record_id: record.id,
          failure_type: record.failure_type,
        },
        remediation_steps: [
          'Stop affected operations',
          'Secure unencrypted data',
          'Review encryption system',
          'Prepare incident report',
        ],
      });
    }

    return violations;
  }

  /**
   * Handle detected violations
   */
  private static async handleViolations(violations: HipaaViolation[]) {
    for (const violation of violations) {
      // Create alert for the violation
      await AlertService.createAlert(
        'hipaa_violation',
        violation.severity,
        violation.description,
        {
          violation_type: violation.type,
          metadata: violation.metadata,
          remediation_steps: violation.remediation_steps,
        }
      );

      // Log violation for audit purposes
      await this.logViolation(violation);

      // Trigger immediate actions for critical violations
      if (violation.severity === 'critical') {
        await this.handleCriticalViolation(violation);
      }
    }
  }

  /**
   * Log violation for audit purposes
   */
  private static async logViolation(violation: HipaaViolation) {
    try {
      await supabase.from('hipaa_violation_logs').insert([{
        type: violation.type,
        severity: violation.severity,
        description: violation.description,
        metadata: violation.metadata,
        remediation_steps: violation.remediation_steps,
        created_at: new Date().toISOString(),
      }]);
    } catch (error) {
      console.error('Failed to log HIPAA violation:', error);
    }
  }

  /**
   * Handle critical violations that require immediate action
   */
  private static async handleCriticalViolation(violation: HipaaViolation) {
    switch (violation.type) {
      case 'unauthorized_access':
        await this.lockUserAccount(violation.metadata.user_id);
        break;
      case 'phi_exposure':
        await this.initiateBreachProtocol(violation);
        break;
      case 'encryption_failure':
        await this.initiateEncryptionFailureProtocol(violation);
        break;
    }
  }

  /**
   * Lock user account
   */
  private static async lockUserAccount(userId: string) {
    try {
      await supabase
        .from('users')
        .update({ locked: true, locked_at: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('Failed to lock user account:', error);
    }
  }

  /**
   * Initiate breach protocol
   */
  private static async initiateBreachProtocol(violation: HipaaViolation) {
    try {
      await supabase.from('breach_incidents').insert([{
        violation_id: violation.metadata.record_id,
        status: 'initiated',
        severity: violation.severity,
        details: violation.metadata,
        created_at: new Date().toISOString(),
      }]);
    } catch (error) {
      console.error('Failed to initiate breach protocol:', error);
    }
  }

  /**
   * Initiate encryption failure protocol
   */
  private static async initiateEncryptionFailureProtocol(violation: HipaaViolation) {
    try {
      await supabase.from('encryption_incidents').insert([{
        violation_id: violation.metadata.record_id,
        status: 'initiated',
        failure_type: violation.metadata.failure_type,
        details: violation.metadata,
        created_at: new Date().toISOString(),
      }]);
    } catch (error) {
      console.error('Failed to initiate encryption failure protocol:', error);
    }
  }
} 