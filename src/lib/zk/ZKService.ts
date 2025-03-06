import {
  KeyPair,
  SecureMessage,
  ZKProof,
  ValidationResult,
  MessageMetadata,
} from "./types";
import { generateProof, verifyProof } from "./validation";
import { encrypt, decrypt, generateMessageId } from "./crypto";
import { SecurityAuditService } from "@/services/SecurityAuditService";
import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { ForwardSecrecyService } from "./ForwardSecrecyService";
import { cache } from "react";
import { createECDH, randomBytes, createHash } from "crypto";

// Constants
const ENCRYPTION_VERSION = "1.0.0";
const SESSION_KEY_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const MESSAGE_COUNT_THRESHOLD = 100; // Rotate after 100 messages
const KEY_TRANSITION_PERIOD = 5 * 60 * 1000; // 5 minutes overlap for smooth transition
const MAX_RETRY_ATTEMPTS = 3;
const ROTATION_LOCK_TIMEOUT = 30000; // 30 seconds max lock time

interface SessionKeyMetadata {
  messageCount: number;
  lastRotation: Date;
  status: "active" | "rotating" | "expired";
  rotationLockExpiry?: Date;
}

export class ZKService {
  private securityAudit: SecurityAuditService;
  private supabase: SupabaseClient;
  private forwardSecrecy: ForwardSecrecyService;
  private keyMetadata: Map<string, SessionKeyMetadata> = new Map();
  private rotationLocks: Set<string> = new Set();

  constructor(
    supabaseClient?: SupabaseClient,
    securityAudit?: SecurityAuditService,
  ) {
    this.securityAudit = securityAudit || new SecurityAuditService();
    if (supabaseClient) {
      this.supabase = supabaseClient;
    } else {
      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ) {
        throw new Error("Supabase environment variables are required");
      }
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      );
    }
    this.forwardSecrecy = new ForwardSecrecyService();
  }

  public setSupabaseClient(supabaseClient: SupabaseClient): void {
    this.supabase = supabaseClient;
  }

  public getVersion(): string {
    return ENCRYPTION_VERSION;
  }

  // Session key management
  public async getOrCreateSessionKeys(
    threadId: string,
  ): Promise<{ id: string; publicKey: string; privateKey: string }> {
    // Initialize metadata if not exists
    if (!this.keyMetadata.has(threadId)) {
      this.keyMetadata.set(threadId, {
        messageCount: 0,
        lastRotation: new Date(),
        status: "active",
      });
    }

    // Check if rotation is needed
    await this.checkAndRotateKeys(threadId);

    // Try to get existing active or rotating keys
    const { data: existingKeys } = await this.supabase
      .from("session_keys")
      .select("*")
      .eq("thread_id", threadId)
      .in("status", ["active", "rotating"])
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existingKeys) {
      return existingKeys;
    }

    // Generate new keys if none exist
    return await this.rotateSessionKeys(threadId);
  }

  private async checkAndRotateKeys(threadId: string): Promise<void> {
    const metadata = this.keyMetadata.get(threadId);
    if (!metadata) return;

    const shouldRotate =
      metadata.messageCount >= MESSAGE_COUNT_THRESHOLD ||
      Date.now() - metadata.lastRotation.getTime() >=
        SESSION_KEY_EXPIRY - KEY_TRANSITION_PERIOD;

    // Check if rotation is needed and not already in progress
    if (shouldRotate && metadata.status === "active") {
      // Try to acquire rotation lock
      if (await this.acquireRotationLock(threadId)) {
        try {
          await this.rotateSessionKeys(threadId);
        } finally {
          this.releaseRotationLock(threadId);
        }
      }
    }
  }

  private async acquireRotationLock(threadId: string): Promise<boolean> {
    const metadata = this.keyMetadata.get(threadId);
    if (!metadata) return false;

    // Check if there's an existing lock that hasn't expired
    if (
      metadata.rotationLockExpiry &&
      metadata.rotationLockExpiry > new Date()
    ) {
      return false;
    }

    // Set lock with expiry
    metadata.rotationLockExpiry = new Date(Date.now() + ROTATION_LOCK_TIMEOUT);
    this.keyMetadata.set(threadId, metadata);

    // Verify in database that no other process has started rotation
    const { data: currentKeys } = await this.supabase
      .from("session_keys")
      .select("status")
      .eq("thread_id", threadId)
      .eq("status", "rotating")
      .single();

    if (currentKeys) {
      // Another process is already rotating
      delete metadata.rotationLockExpiry;
      this.keyMetadata.set(threadId, metadata);
      return false;
    }

    return true;
  }

  private releaseRotationLock(threadId: string): void {
    const metadata = this.keyMetadata.get(threadId);
    if (metadata) {
      delete metadata.rotationLockExpiry;
      this.keyMetadata.set(threadId, metadata);
    }
  }

  private async rotateSessionKeys(
    threadId: string,
  ): Promise<{ id: string; publicKey: string; privateKey: string }> {
    let retryCount = 0;

    try {
      // Get current active keys
      const { data: currentKeys } = await this.supabase
        .from("session_keys")
        .select("*")
        .eq("thread_id", threadId)
        .eq("status", "active")
        .single();

      // Mark current keys as rotating
      if (currentKeys) {
        await this.supabase
          .from("session_keys")
          .update({
            status: "rotating",
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentKeys.id);
      }

      // Generate new keys
      const keyPair = await this.generateKeyPair();
      const expiresAt = new Date(Date.now() + SESSION_KEY_EXPIRY);

      while (retryCount < MAX_RETRY_ATTEMPTS) {
        try {
          // Insert new keys
          const { data: newKeys, error } = await this.supabase
            .from("session_keys")
            .insert({
              thread_id: threadId,
              public_key: keyPair.publicKey,
              private_key: keyPair.privateKey,
              expires_at: expiresAt.toISOString(),
              status: "active",
              created_at: new Date().toISOString(),
              previous_key_id: currentKeys?.id, // Link to previous key for transition
            })
            .select()
            .single();

          if (error) throw error;

          // Mark old keys as expired after transition period
          if (currentKeys) {
            setTimeout(async () => {
              await this.supabase
                .from("session_keys")
                .update({
                  status: "expired",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", currentKeys.id);
            }, KEY_TRANSITION_PERIOD);
          }

          // Update metadata
          this.keyMetadata.set(threadId, {
            messageCount: 0,
            lastRotation: new Date(),
            status: "active",
          });

          // Log successful rotation
          await this.securityAudit.logEvent({
            type: "key_rotation",
            threadId,
            status: "success",
            metadata: {
              expiresAt: expiresAt.toISOString(),
              previousKeyId: currentKeys?.id,
            },
          });

          return newKeys;
        } catch (error) {
          retryCount++;
          if (retryCount === MAX_RETRY_ATTEMPTS) throw error;
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount),
          );
        }
      }

      throw new Error("Failed to rotate keys after maximum retry attempts");
    } catch (error) {
      await this.securityAudit.logError({
        operation: "rotate_session_keys",
        error,
        threadId,
      });
      throw error;
    }
  }

  public async getSessionKeys(
    threadId: string,
  ): Promise<{ id: string; publicKey: string; privateKey: string } | null> {
    const { data: keys } = await this.supabase
      .from("session_keys")
      .select("*")
      .eq("thread_id", threadId)
      .gt("expires_at", new Date().toISOString())
      .single();

    return keys;
  }

  // Message encryption
  public async encryptMessageWithSessionKey(
    content: string,
    sessionPublicKey: string,
    metadata: {
      senderId: string;
      recipientId: string;
      threadId: string;
    },
  ): Promise<{
    id: string;
    encryptedContent: string;
    iv: string;
    proof: string;
  }> {
    try {
      // Increment message count and check for rotation
      const keyMeta = this.keyMetadata.get(metadata.threadId);
      if (keyMeta) {
        keyMeta.messageCount++;
        await this.checkAndRotateKeys(metadata.threadId);
      }

      // Generate message proof
      const proof = await this.generateMessageProof({
        content,
        metadata,
      });

      // Get or initialize ratchet for the thread
      const sharedSecret = Buffer.from(sessionPublicKey, "hex");
      const isInitiator = metadata.senderId < metadata.recipientId;
      await this.forwardSecrecy.initializeRatchet(
        metadata.threadId,
        sharedSecret,
        isInitiator,
      );

      // Encrypt with forward secrecy
      const { ciphertext, header } = await this.forwardSecrecy.ratchetEncrypt(
        metadata.threadId,
        Buffer.from(content),
      );

      const messageId = generateMessageId();

      await this.securityAudit.logMessageEncryption({
        messageId,
        userId: metadata.senderId,
        recipientId: metadata.recipientId,
        threadId: metadata.threadId,
        status: "success",
      });

      return {
        id: messageId,
        encryptedContent: ciphertext.toString("base64"),
        iv: header.publicKey.toString("hex"),
        proof,
      };
    } catch (error) {
      await this.securityAudit.logError({
        operation: "encrypt_message",
        error,
        userId: metadata.senderId,
        threadId: metadata.threadId,
      });
      throw error;
    }
  }

  public async decryptMessageWithSessionKey(
    encryptedContent: string,
    iv: string,
    sessionPrivateKey: string,
    metadata: {
      threadId: string;
      messageNumber: number;
      previousChainLength: number;
    },
  ): Promise<string> {
    try {
      const message = {
        ciphertext: Buffer.from(encryptedContent, "base64"),
        header: {
          publicKey: Buffer.from(iv, "hex"),
          messageNumber: metadata.messageNumber,
          previousChainLength: metadata.previousChainLength,
        },
      };

      const decryptedBuffer = await this.forwardSecrecy.ratchetDecrypt(
        metadata.threadId,
        message,
      );

      return decryptedBuffer.toString();
    } catch (error) {
      await this.securityAudit.logError({
        operation: "decrypt_message",
        error,
        threadId: metadata.threadId,
      });
      throw error;
    }
  }

  // Message proofs
  public async generateMessageProof(input: {
    content: string;
    metadata: {
      senderId: string;
      recipientId: string;
      threadId: string;
    };
  }): Promise<string> {
    try {
      const proof = await generateProof({
        message: new TextEncoder().encode(input.content),
        metadata: input.metadata,
        timestamp: Date.now(),
      });

      return proof;
    } catch (error) {
      await this.securityAudit.logError({
        operation: "generate_proof",
        error,
        userId: input.metadata.senderId,
        threadId: input.metadata.threadId,
      });
      throw error;
    }
  }

  public async verifyMessageProof(
    proof: string,
    message: string,
  ): Promise<boolean> {
    try {
      return await verifyProof(proof);
    } catch (error) {
      await this.securityAudit.logError({
        operation: "verify_proof",
        error,
      });
      throw error;
    }
  }

  // Key generation
  private async generateKeyPair(): Promise<{
    publicKey: string;
    privateKey: string;
  }> {
    const privateKey = randomBytes(32).toString("hex");
    const publicKey = createHash("sha256").update(privateKey).digest("hex");
    return { privateKey, publicKey };
  }

  private async generateIV(): Promise<string> {
    if (typeof window === "undefined") {
      return randomBytes(16).toString("base64");
    } else {
      const iv = window.crypto.getRandomValues(new Uint8Array(16));
      return Buffer.from(iv).toString("base64");
    }
  }
}
