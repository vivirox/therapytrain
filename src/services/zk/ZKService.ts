import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { SecurityAuditService } from '../security/SecurityAuditService';
import { ForwardSecrecyService } from '../security/ForwardSecrecyService';

interface KeyMetadata {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

interface MessageProof {
  proof: string;
  publicInputs: string[];
  commitment: string;
}

export class ZKService {
  private static instance: ZKService;
  private securityAudit: SecurityAuditService;
  private supabase: ReturnType<typeof createClient>;
  private forwardSecrecy: ForwardSecrecyService;
  private rotationLocks: Map<string, boolean>;

  private constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.securityAudit = new SecurityAuditService();
    this.forwardSecrecy = new ForwardSecrecyService();
    this.rotationLocks = new Map();
  }

  static getInstance(): ZKService {
    if (!ZKService.instance) {
      ZKService.instance = new ZKService();
    }
    return ZKService.instance;
  }

  async decryptMessageWithSessionKey(
    encryptedMessage: string,
    sessionKeyId: string
  ): Promise<string> {
    try {
      const sessionKey = await this.getSessionKey(sessionKeyId);
      if (!sessionKey) {
        throw new Error('Session key not found');
      }

      // Decrypt message using session key
      const decryptedMessage = await this.forwardSecrecy.decrypt(
        encryptedMessage,
        sessionKey
      );

      await this.securityAudit.logDecryption({
        sessionKeyId,
        success: true,
        timestamp: new Date(),
      });

      return decryptedMessage;
    } catch (error) {
      await this.securityAudit.logDecryption({
        sessionKeyId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
      throw error;
    }
  }

  async verifyMessageProof(
    message: string,
    proof: MessageProof
  ): Promise<boolean> {
    try {
      const isValid = await this.forwardSecrecy.verifyProof(message, proof);

      await this.securityAudit.logProofVerification({
        proofId: proof.commitment,
        success: isValid,
        timestamp: new Date(),
      });

      return isValid;
    } catch (error) {
      await this.securityAudit.logProofVerification({
        proofId: proof.commitment,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
      throw error;
    }
  }

  private async getSessionKey(keyId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('session_keys')
      .select('key, expires_at')
      .eq('id', keyId)
      .single();

    if (error) {
      logger.error('Failed to fetch session key', { keyId, error });
      return null;
    }

    if (!data || new Date(data.expires_at) < new Date()) {
      return null;
    }

    return data.key;
  }

  async rotateSessionKeys(): Promise<void> {
    const lockId = 'session_key_rotation';
    if (this.rotationLocks.get(lockId)) {
      logger.info('Session key rotation already in progress');
      return;
    }

    try {
      this.rotationLocks.set(lockId, true);

      // Generate new session keys
      const newKeys = await this.forwardSecrecy.generateSessionKeys();

      // Store new keys
      const { error } = await this.supabase.from('session_keys').insert(
        newKeys.map(key => ({
          id: key.id,
          key: key.key,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        }))
      );

      if (error) {
        throw error;
      }

      await this.securityAudit.logKeyRotation({
        success: true,
        keyCount: newKeys.length,
        timestamp: new Date(),
      });
    } catch (error) {
      await this.securityAudit.logKeyRotation({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
      throw error;
    } finally {
      this.rotationLocks.set(lockId, false);
    }
  }
}

export const zkService = ZKService.getInstance(); 