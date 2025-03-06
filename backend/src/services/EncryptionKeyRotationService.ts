import { SecurityAuditService } from "./SecurityAuditService";
import {
  HIPAACompliantAuditService,
  HIPAAEventType,
  HIPAAActionType,
} from "./HIPAACompliantAuditService";
import * as fs from "fs/promises";
import * as path from "path";
import crypto from "crypto";

interface EncryptionKey {
  id: string;
  version: number;
  algorithm: string;
  keyMaterial: Buffer;
  iv?: Buffer;
  tag?: Buffer;
  createdAt: Date;
  expiresAt: Date;
  rotatedAt?: Date;
  status: KeyStatus;
  purpose: Array<KeyPurpose>;
  metadata: {
    hash: string;
    backupLocation?: string;
    lastVerified?: Date;
    usageCount: number;
  };
}

interface KeyRotationConfig {
  rotationPeriod: number; // in days
  algorithm: string;
  keySize: number;
  purposes: Array<KeyPurpose>;
  backupRequired: boolean;
  verificationRequired: boolean;
  gracePeriod: number; // in days
}

interface KeyRotationEvent {
  id: string;
  timestamp: Date;
  keyId: string;
  eventType: "CREATION" | "ROTATION" | "BACKUP" | "VERIFICATION" | "DELETION";
  status: "SUCCESS" | "FAILURE";
  details: Record<string, any>;
}

export enum KeyStatus {
  ACTIVE = "ACTIVE",
  ROTATING = "ROTATING",
  EXPIRED = "EXPIRED",
  COMPROMISED = "COMPROMISED",
  BACKED_UP = "BACKED_UP",
  DELETED = "DELETED",
}

export enum KeyPurpose {
  PHI_ENCRYPTION = "PHI_ENCRYPTION",
  AUDIT_LOG_ENCRYPTION = "AUDIT_LOG_ENCRYPTION",
  BACKUP_ENCRYPTION = "BACKUP_ENCRYPTION",
  SECURE_COMMUNICATION = "SECURE_COMMUNICATION",
}

export class EncryptionKeyRotationService {
  getActiveKey(BACKUP_ENCRYPTION: KeyPurpose) {
    throw new Error("Method not implemented.");
  }
  async getKey(keyId: string): Promise<EncryptionKey> {
    try {
      const fileName = `key-${keyId}.json`;
      const filePath = path.join(this.keysPath, fileName);

      const content = await fs.readFile(filePath, "utf-8");
      const keyData = JSON.parse(content);

      return {
        ...keyData,
        keyMaterial: Buffer.from(keyData.keyMaterial, "base64"),
        iv: keyData.iv ? Buffer.from(keyData.iv, "base64") : undefined,
      };
    } catch (error) {
      await this.securityAuditService.recordAlert(
        "KEY_RETRIEVAL_ERROR",
        "HIGH",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          keyId,
        },
      );
      throw new Error(`Failed to retrieve key: ${keyId}`);
    }
  }
  private readonly keysPath: string;
  private readonly backupPath: string;
  private readonly rotationConfigs: Map<KeyPurpose, KeyRotationConfig> =
    new Map();
  private activeKeys: Map<KeyPurpose, EncryptionKey> = new Map();
  private rotationSchedules: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly securityAuditService: SecurityAuditService,
    private readonly hipaaAuditService: HIPAACompliantAuditService,
    keysPath?: string,
  ) {
    this.keysPath = keysPath || path.join(__dirname, "../keys");
    this.backupPath = path.join(this.keysPath, "backup");
    this.initializeRotationConfigs();
  }

  private initializeRotationConfigs(): void {
    // PHI Encryption Keys
    this.rotationConfigs.set(KeyPurpose.PHI_ENCRYPTION, {
      rotationPeriod: 90, // 90 days
      algorithm: "aes-256-gcm",
      keySize: 32, // 256 bits
      purposes: [KeyPurpose.PHI_ENCRYPTION],
      backupRequired: true,
      verificationRequired: true,
      gracePeriod: 7, // 7 days
    });

    // Audit Log Encryption Keys
    this.rotationConfigs.set(KeyPurpose.AUDIT_LOG_ENCRYPTION, {
      rotationPeriod: 180, // 180 days
      algorithm: "aes-256-gcm",
      keySize: 32,
      purposes: [KeyPurpose.AUDIT_LOG_ENCRYPTION],
      backupRequired: true,
      verificationRequired: true,
      gracePeriod: 14,
    });

    // Backup Encryption Keys
    this.rotationConfigs.set(KeyPurpose.BACKUP_ENCRYPTION, {
      rotationPeriod: 365, // 365 days
      algorithm: "aes-256-gcm",
      keySize: 32,
      purposes: [KeyPurpose.BACKUP_ENCRYPTION],
      backupRequired: true,
      verificationRequired: true,
      gracePeriod: 30,
    });

    // Secure Communication Keys
    this.rotationConfigs.set(KeyPurpose.SECURE_COMMUNICATION, {
      rotationPeriod: 30, // 30 days
      algorithm: "aes-256-gcm",
      keySize: 32,
      purposes: [KeyPurpose.SECURE_COMMUNICATION],
      backupRequired: false,
      verificationRequired: true,
      gracePeriod: 2,
    });
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.keysPath, { recursive: true });
      await fs.mkdir(this.backupPath, { recursive: true });

      // Load existing keys
      await this.loadExistingKeys();

      // Initialize missing keys
      for (const purpose of Object.values(KeyPurpose)) {
        if (!this.activeKeys.has(purpose)) {
          await this.generateNewKey(purpose);
        }
      }

      // Schedule rotations
      this.scheduleKeyRotations();

      await this.hipaaAuditService.logEvent({
        eventType: HIPAAEventType.SYSTEM_OPERATION,
        timestamp: new Date(),
        action: {
          type: HIPAAActionType.CREATE,
          status: "SUCCESS",
          details: {
            operation: "KEY_ROTATION_SERVICE_INIT",
          },
        },
        resource: {
          type: "SYSTEM",
          id: "key-rotation",
          description: "Encryption Key Rotation Service",
        },
      });
    } catch (error) {
      await this.securityAuditService.recordAlert(
        "KEY_ROTATION_INIT_ERROR",
        "HIGH",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      );
      throw error;
    }
  }

  async rotateKey(purpose: KeyPurpose): Promise<void> {
    try {
      const currentKey = this.activeKeys.get(purpose);
      if (!currentKey) {
        throw new Error(`No active key found for purpose: ${purpose}`);
      }

      // Generate new key
      const newKey = await this.generateNewKey(purpose);

      // Mark old key as rotating
      currentKey.status = KeyStatus.ROTATING;
      currentKey.rotatedAt = new Date();
      await this.saveKey(currentKey);

      // Set new key as active
      this.activeKeys.set(purpose, newKey);

      // Backup if required
      const config = this.rotationConfigs.get(purpose);
      if (config?.backupRequired) {
        await this.backupKey(newKey);
      }

      await this.logKeyRotationEvent({
        id: crypto.randomBytes(16).toString("hex"),
        timestamp: new Date(),
        keyId: newKey.id,
        eventType: "ROTATION",
        status: "SUCCESS",
        details: {
          purpose,
          oldKeyId: currentKey.id,
          algorithm: newKey.algorithm,
        },
      });
    } catch (error) {
      await this.securityAuditService.recordAlert(
        "KEY_ROTATION_ERROR",
        "HIGH",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          purpose,
        },
      );
      throw error;
    }
  }

  private async generateNewKey(purpose: KeyPurpose): Promise<EncryptionKey> {
    const config = this.rotationConfigs.get(purpose);
    if (!config) {
      throw new Error(`No configuration found for purpose: ${purpose}`);
    }

    try {
      const keyMaterial = crypto.randomBytes(config.keySize);
      const iv = crypto.randomBytes(16);
      const keyId = crypto.randomBytes(16).toString("hex");

      const key: EncryptionKey = {
        id: keyId,
        version: 1,
        algorithm: config.algorithm,
        keyMaterial,
        iv,
        createdAt: new Date(),
        expiresAt: new Date(
          Date.now() + config.rotationPeriod * 24 * 60 * 60 * 1000,
        ),
        status: KeyStatus.ACTIVE,
        purpose: config.purposes,
        metadata: {
          hash: this.calculateKeyHash(keyMaterial),
          usageCount: 0,
        },
      };

      await this.saveKey(key);

      await this.logKeyRotationEvent({
        id: crypto.randomBytes(16).toString("hex"),
        timestamp: new Date(),
        keyId: key.id,
        eventType: "CREATION",
        status: "SUCCESS",
        details: {
          purpose,
          algorithm: key.algorithm,
        },
      });

      return key;
    } catch (error) {
      await this.securityAuditService.recordAlert(
        "KEY_GENERATION_ERROR",
        "HIGH",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          purpose,
        },
      );
      throw error;
    }
  }

  private async backupKey(key: EncryptionKey): Promise<void> {
    try {
      const backupFileName = `key-${key.id}-${new Date().toISOString()}.backup`;
      const backupPath = path.join(this.backupPath, backupFileName);

      // In a real implementation, this would use proper key wrapping
      // and secure backup procedures
      await fs.writeFile(
        backupPath,
        JSON.stringify({
          ...key,
          keyMaterial: key.keyMaterial.toString("base64"),
          iv: key.iv?.toString("base64"),
        }),
      );

      key.metadata.backupLocation = backupPath;
      await this.saveKey(key);

      await this.logKeyRotationEvent({
        id: crypto.randomBytes(16).toString("hex"),
        timestamp: new Date(),
        keyId: key.id,
        eventType: "BACKUP",
        status: "SUCCESS",
        details: {
          backupPath,
          purposes: key.purpose,
        },
      });
    } catch (error) {
      await this.securityAuditService.recordAlert("KEY_BACKUP_ERROR", "HIGH", {
        error: error instanceof Error ? error.message : "Unknown error",
        keyId: key.id,
      });
      throw error;
    }
  }

  private async loadExistingKeys(): Promise<void> {
    try {
      const files = await fs.readdir(this.keysPath);
      const keyFiles = files.filter(
        (f: any) => f.startsWith("key-") && f.endsWith(".json"),
      );

      for (const file of keyFiles) {
        const content = await fs.readFile(
          path.join(this.keysPath, file),
          "utf-8",
        );
        const keyData = JSON.parse(content);

        const key: EncryptionKey = {
          ...keyData,
          keyMaterial: Buffer.from(keyData.keyMaterial, "base64"),
          iv: keyData.iv ? Buffer.from(keyData.iv, "base64") : undefined,
        };

        // Only set as active if not expired or rotated
        if (
          key.status === KeyStatus.ACTIVE &&
          new Date(key.expiresAt) > new Date()
        ) {
          for (const purpose of key.purpose) {
            this.activeKeys.set(purpose, key);
          }
        }
      }
    } catch (error) {
      await this.securityAuditService.recordAlert("KEY_LOAD_ERROR", "HIGH", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  private async saveKey(key: EncryptionKey): Promise<void> {
    try {
      const fileName = `key-${key.id}.json`;
      const filePath = path.join(this.keysPath, fileName);

      await fs.writeFile(
        filePath,
        JSON.stringify(
          {
            ...key,
            keyMaterial: key.keyMaterial.toString("base64"),
            iv: key.iv?.toString("base64"),
          },
          null,
          2,
        ),
      );
    } catch (error) {
      await this.securityAuditService.recordAlert("KEY_SAVE_ERROR", "HIGH", {
        error: error instanceof Error ? error.message : "Unknown error",
        keyId: key.id,
      });
      throw error;
    }
  }

  private scheduleKeyRotations(): void {
    for (const [purpose, key] of this.activeKeys.entries()) {
      const config = this.rotationConfigs.get(purpose);
      if (!config) continue;

      const timeUntilRotation = new Date(key.expiresAt).getTime() - Date.now();
      if (timeUntilRotation <= 0) {
        // Rotate immediately if expired
        this.rotateKey(purpose).catch((error) => {
          this.securityAuditService.recordAlert(
            "KEY_ROTATION_SCHEDULE_ERROR",
            "HIGH",
            {
              error: error instanceof Error ? error.message : "Unknown error",
              purpose,
            },
          );
        });
      } else {
        // Schedule future rotation
        const timeout = setTimeout(() => {
          this.rotateKey(purpose).catch((error) => {
            this.securityAuditService.recordAlert(
              "KEY_ROTATION_SCHEDULE_ERROR",
              "HIGH",
              {
                error: error instanceof Error ? error.message : "Unknown error",
                purpose,
              },
            );
          });
        }, timeUntilRotation);

        this.rotationSchedules.set(key.id, timeout);
      }
    }
  }

  private calculateKeyHash(keyMaterial: Buffer): string {
    return crypto
      .createHash("sha256")
      .update(keyMaterial.toString("hex"))
      .digest("hex");
  }

  private async logKeyRotationEvent(event: KeyRotationEvent): Promise<void> {
    await this.hipaaAuditService.logEvent({
      eventType: HIPAAEventType.SYSTEM_OPERATION,
      timestamp: new Date(),
      action: {
        type:
          event.eventType === "CREATION"
            ? HIPAAActionType.CREATE
            : HIPAAActionType.UPDATE,
        status: event.status,
        details: event.details,
      },
      resource: {
        type: "SYSTEM",
        id: event.keyId,
        description: "Encryption Key",
      },
    });
  }

  async cleanup(): Promise<void> {
    try {
      // Clear rotation schedules
      for (const timeout of this.rotationSchedules.values()) {
        clearTimeout(timeout);
      }
      this.rotationSchedules.clear();

      // Clear active keys
      this.activeKeys.clear();
    } catch (error) {
      await this.securityAuditService.recordAlert(
        "KEY_ROTATION_CLEANUP_ERROR",
        "HIGH",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      );
      throw error;
    }
  }
}
