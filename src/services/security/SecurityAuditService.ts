import { dataService } from '@/lib/data';
import { logger } from '@/lib/logger';

interface AuditEvent {
  type: string;
  timestamp: Date;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

interface DecryptionEvent extends AuditEvent {
  sessionKeyId: string;
}

interface ProofVerificationEvent extends AuditEvent {
  proofId: string;
}

interface KeyRotationEvent extends AuditEvent {
  keyCount?: number;
}

export class SecurityAuditService {
  async logDecryption(event: DecryptionEvent): Promise<void> {
    await this.logEvent({
      ...event,
      type: 'decryption',
      metadata: {
        sessionKeyId: event.sessionKeyId,
      },
    });
  }

  async logProofVerification(event: ProofVerificationEvent): Promise<void> {
    await this.logEvent({
      ...event,
      type: 'proof_verification',
      metadata: {
        proofId: event.proofId,
      },
    });
  }

  async logKeyRotation(event: KeyRotationEvent): Promise<void> {
    await this.logEvent({
      ...event,
      type: 'key_rotation',
      metadata: {
        keyCount: event.keyCount,
      },
    });
  }

  private async logEvent(event: AuditEvent): Promise<void> {
    try {
      await dataService.create('security_audit_logs', {
        ...event,
        timestamp: event.timestamp.toISOString(),
      });
      logger.info('Security audit event logged', { event });
    } catch (error) {
      logger.error('Failed to log security audit event', { event, error });
      // Don't throw the error to avoid disrupting the main flow
      // but make sure it's properly logged
    }
  }
} 