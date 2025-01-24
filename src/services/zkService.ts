import { EncryptionService } from './encryption';
import { AuditLogger } from './auditLogger';
import { ZKProofService, SessionData, ProofData } from './zkProof';

interface SessionMetrics {
  interventionCount: number;
  riskLevel: number;
  engagementScore: number;
}

interface SessionInput {
  sessionId: string;
  timestamp: number;
  durationMinutes: number;
  clientDataHash: string;
  metricsHash: string;
  therapistId: string;
  metrics: SessionMetrics;
}

/**
 * Service for generating and verifying zero-knowledge proofs for session integrity
 */
export class ZKService {
  private static instance: ZKService;
  private zkProof: ZKProofService;
  private encryptionService: EncryptionService;
  private auditLogger: AuditLogger;

  private constructor() {
    this.zkProof = ZKProofService.getInstance();
    this.encryptionService = EncryptionService.getInstance();
    this.auditLogger = AuditLogger.getInstance();
  }

  public static getInstance(): ZKService {
    if (!ZKService.instance) {
      ZKService.instance = new ZKService();
    }
    return ZKService.instance;
  }

  /**
   * Generate a zero-knowledge proof for a therapy session
   */
  public async generateSessionProof(sessionData: SessionInput): Promise<ProofData> {
    try {
      // Validate inputs
      this.validateInputs(sessionData);

      // Generate proof
      const proof = await this.zkProof.generateProof({
        sessionId: sessionData.sessionId,
        timestamp: sessionData.timestamp,
        durationMinutes: sessionData.durationMinutes,
        therapistId: sessionData.therapistId,
        interventionCount: sessionData.metrics.interventionCount,
        riskLevel: sessionData.metrics.riskLevel,
        engagementScore: sessionData.metrics.engagementScore,
        clientDataHash: sessionData.clientDataHash,
        metricsHash: sessionData.metricsHash,
      });
      return proof;
    } catch (error) {
      await this.auditLogger.logProofEvent(
        sessionData.sessionId,
        'N/A',
        'GENERATE',
        'failure',
        { error: error.message }
      );
      throw error;
    }
  }

  /**
   * Verify a zero-knowledge proof for a therapy session
   */
  public async verifySessionProof(proofData: ProofData, publicInputs: {
    sessionId: string;
    timestamp: number;
    durationMinutes: number;
    publicMetricsHash: string;
  }): Promise<boolean> {
    try {
      // Validate public inputs
      this.validatePublicInputs(publicInputs);

      // Verify proof
      const isValid = await this.zkProof.verifyProof(proofData, publicInputs);
      await this.auditLogger.logProofEvent(
        publicInputs.sessionId,
        'N/A',
        'VERIFY',
        isValid ? 'success' : 'failure',
        { publicSignals: publicInputs }
      );
      return isValid;
    } catch (error) {
      await this.auditLogger.logProofEvent(
        publicInputs.sessionId,
        'N/A',
        'VERIFY',
        'failure',
        { error: error.message }
      );
      throw error;
    }
  }

  private validateInputs(data: SessionInput): void {
    if (!data.sessionId || typeof data.sessionId !== 'string') {
      throw new Error('Invalid sessionId');
    }

    if (!Number.isInteger(data.timestamp) || data.timestamp <= 0) {
      throw new Error('Invalid timestamp');
    }

    if (!Number.isInteger(data.durationMinutes) || data.durationMinutes < 0 || data.durationMinutes > 120) {
      throw new Error('Invalid duration');
    }

    if (!data.therapistId || typeof data.therapistId !== 'string') {
      throw new Error('Invalid therapistId');
    }

    if (!Number.isInteger(data.metrics.interventionCount) || data.metrics.interventionCount < 0 || data.metrics.interventionCount > 50) {
      throw new Error('Invalid intervention count');
    }

    if (!Number.isInteger(data.metrics.riskLevel) || data.metrics.riskLevel < 0 || data.metrics.riskLevel > 10) {
      throw new Error('Invalid risk level');
    }

    if (!Number.isInteger(data.metrics.engagementScore) || data.metrics.engagementScore < 0 || data.metrics.engagementScore > 100) {
      throw new Error('Invalid engagement score');
    }

    if (!data.clientDataHash || typeof data.clientDataHash !== 'string') {
      throw new Error('Invalid client data hash');
    }

    if (!data.metricsHash || typeof data.metricsHash !== 'string') {
      throw new Error('Invalid metrics hash');
    }
  }

  private validatePublicInputs(data: {
    sessionId: string;
    timestamp: number;
    durationMinutes: number;
    publicMetricsHash: string;
  }): void {
    if (!data.sessionId || typeof data.sessionId !== 'string') {
      throw new Error('Invalid sessionId');
    }

    if (!Number.isInteger(data.timestamp) || data.timestamp <= 0) {
      throw new Error('Invalid timestamp');
    }

    if (!Number.isInteger(data.durationMinutes) || data.durationMinutes < 0 || data.durationMinutes > 120) {
      throw new Error('Invalid duration');
    }

    if (!data.publicMetricsHash || typeof data.publicMetricsHash !== 'string') {
      throw new Error('Invalid public metrics hash');
    }
  }
}

export default ZKService;
