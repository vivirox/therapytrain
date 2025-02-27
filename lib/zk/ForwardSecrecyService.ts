import { createECDH, randomBytes } from 'crypto';
import { KeyPair } from './types';
import { SecurityAuditService } from '@/services/SecurityAuditService';

const KEY_ROTATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const KEY_OVERLAP_PERIOD = 5 * 60 * 1000; // 5 minutes
const CURVE = 'secp256k1';

export class ForwardSecrecyService {
  private static instance: ForwardSecrecyService;
  private currentKeyPair: KeyPair | null = null;
  private nextKeyPair: KeyPair | null = null;
  private lastRotation: Date = new Date();
  private rotationTimer: NodeJS.Timeout | null = null;
  private securityAudit: SecurityAuditService;

  private constructor() {
    this.securityAudit = new SecurityAuditService();
    this.initializeKeyRotation();
  }

  public static getInstance(): ForwardSecrecyService {
    if (!ForwardSecrecyService.instance) {
      ForwardSecrecyService.instance = new ForwardSecrecyService();
    }
    return ForwardSecrecyService.instance;
  }

  private async initializeKeyRotation(): Promise<void> {
    try {
      this.currentKeyPair = await this.generateKeyPair();
      this.nextKeyPair = await this.generateKeyPair();
      this.scheduleNextRotation();

      await this.securityAudit.logKeyGeneration({
        operation: 'initialize_key_rotation',
        status: 'success'
      });
    } catch (error) {
      await this.securityAudit.logError({
        operation: 'initialize_key_rotation',
        error
      });
      throw error;
    }
  }

  private async generateKeyPair(): Promise<KeyPair> {
    try {
      const ecdh = createECDH(CURVE);
      const privateKey = randomBytes(32);
      ecdh.setPrivateKey(privateKey);
      const publicKey = ecdh.getPublicKey();

      return {
        publicKey: publicKey.toString('base64'),
        privateKey: privateKey.toString('base64')
      };
    } catch (error) {
      await this.securityAudit.logError({
        operation: 'generate_key_pair',
        error
      });
      throw error;
    }
  }

  private scheduleNextRotation(): void {
    if (this.rotationTimer) {
      clearTimeout(this.rotationTimer);
    }

    this.rotationTimer = setTimeout(async () => {
      await this.rotateKeys();
    }, KEY_ROTATION_INTERVAL);
  }

  private async rotateKeys(): Promise<void> {
    try {
      this.currentKeyPair = this.nextKeyPair;
      this.nextKeyPair = await this.generateKeyPair();
      this.lastRotation = new Date();
      this.scheduleNextRotation();

      await this.securityAudit.logKeyRotation({
        operation: 'rotate_keys',
        status: 'success'
      });
    } catch (error) {
      await this.securityAudit.logError({
        operation: 'rotate_keys',
        error
      });
      throw error;
    }
  }

  public getCurrentPublicKey(): string {
    if (!this.currentKeyPair) {
      throw new Error('Key pair not initialized');
    }
    return this.currentKeyPair.publicKey;
  }

  public async getSharedSecret(theirPublicKey: string): Promise<string> {
    try {
      if (!this.currentKeyPair) {
        throw new Error('Key pair not initialized');
      }

      const ecdh = createECDH(CURVE);
      const privateKeyBuffer = Buffer.from(this.currentKeyPair.privateKey, 'base64');
      ecdh.setPrivateKey(privateKeyBuffer);

      const theirPublicKeyBuffer = Buffer.from(theirPublicKey, 'base64');
      const sharedSecret = ecdh.computeSecret(theirPublicKeyBuffer);

      await this.securityAudit.logKeyOperation({
        operation: 'compute_shared_secret',
        status: 'success'
      });

      return sharedSecret.toString('base64');
    } catch (error) {
      await this.securityAudit.logError({
        operation: 'compute_shared_secret',
        error
      });
      throw error;
    }
  }

  public isKeyValid(timestamp: Date): boolean {
    const age = Date.now() - timestamp.getTime();
    return age <= KEY_ROTATION_INTERVAL + KEY_OVERLAP_PERIOD;
  }

  public async cleanup(): Promise<void> {
    if (this.rotationTimer) {
      clearTimeout(this.rotationTimer);
      this.rotationTimer = null;
    }
  }
} 