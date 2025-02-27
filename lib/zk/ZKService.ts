import { KeyPair, SecureMessage, ZKProof, ValidationResult, MessageMetadata } from './types';
import { generateProof, verifyProof } from './validation';
import { encrypt, decrypt, generateMessageId } from './crypto';
import { SecurityAuditService } from '@/services/SecurityAuditService';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { ForwardSecrecyService } from './ForwardSecrecyService';
import { cache } from 'react';
import { createECDH, randomBytes } from 'crypto';

// Constants
const ENCRYPTION_VERSION = '1.0.0';
const SESSION_KEY_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const MESSAGE_COUNT_THRESHOLD = 100; // Rotate after 100 messages
const KEY_TRANSITION_PERIOD = 5 * 60 * 1000; // 5 minutes overlap for smooth transition
const MAX_RETRY_ATTEMPTS = 3;
const ROTATION_LOCK_TIMEOUT = 30000; // 30 seconds max lock time

interface SessionKeyMetadata {
  messageCount: number;
  lastRotation: Date;
  status: 'active' | 'rotating' | 'expired';
  rotationLockExpiry?: Date;
}

export class ZKService {
  private static instance: ZKService;
  private securityAudit: SecurityAuditService;
  private supabase: SupabaseClient;
  private forwardSecrecy: ForwardSecrecyService;
  private keyMetadata: Map<string, SessionKeyMetadata> = new Map();
  private rotationLocks: Set<string> = new Set();

  constructor(supabaseClient?: SupabaseClient, securityAudit?: SecurityAuditService) {
    this.securityAudit = securityAudit || new SecurityAuditService();
    if (supabaseClient) {
      this.supabase = supabaseClient;
    } else {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error('Supabase environment variables are required');
      }
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
    }
    this.forwardSecrecy = ForwardSecrecyService.getInstance();
  }

  public static getInstance(supabaseClient?: SupabaseClient, securityAudit?: SecurityAuditService): ZKService {
    if (!ZKService.instance) {
      ZKService.instance = new ZKService(supabaseClient, securityAudit);
    }
    return ZKService.instance;
  }

  public getVersion(): string {
    return ENCRYPTION_VERSION;
  }

  public async encryptMessageWithSessionKey(
    message: string,
    publicKey: string,
    metadata: MessageMetadata
  ): Promise<SecureMessage> {
    try {
      const iv = await this.generateIV();
      const encryptedContent = await encrypt(message, publicKey, iv);
      const messageId = generateMessageId();
      const proof = await generateProof(message, metadata);

      await this.securityAudit.logMessageEncryption({
        messageId,
        userId: metadata.senderId,
        recipientId: metadata.recipientId,
        threadId: metadata.threadId,
        status: 'success'
      });

      return {
        id: messageId,
        encryptedContent,
        iv,
        proof,
        metadata
      };
    } catch (error) {
      await this.securityAudit.logError({
        operation: 'encrypt_message',
        error,
        metadata
      });
      throw error;
    }
  }

  public async decryptMessageWithSessionKey(
    encryptedContent: string,
    iv: string,
    privateKey: string
  ): Promise<string> {
    try {
      return await decrypt(encryptedContent, privateKey, iv);
    } catch (error) {
      await this.securityAudit.logError({
        operation: 'decrypt_message',
        error
      });
      throw error;
    }
  }

  public async verifyMessageProof(proof: string, message: string): Promise<boolean> {
    try {
      return await verifyProof(proof);
    } catch (error) {
      await this.securityAudit.logError({
        operation: 'verify_proof',
        error
      });
      throw error;
    }
  }

  private async generateIV(): Promise<string> {
    if (typeof window === 'undefined') {
      return randomBytes(16).toString('base64');
    } else {
      const iv = window.crypto.getRandomValues(new Uint8Array(16));
      return Buffer.from(iv).toString('base64');
    }
  }
} 