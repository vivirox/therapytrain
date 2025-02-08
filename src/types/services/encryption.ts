export interface EncryptionKey {
  id: string;
  type: 'symmetric' | 'asymmetric';
  algorithm: string;
  created: Date;
  expires?: Date;
  metadata: Record<string, unknown>;
}

export interface EncryptedData {
  data: string;  // Base64 encoded encrypted data
  iv: string;    // Initialization vector
  keyId: string;
  algorithm: string;
  metadata: Record<string, unknown>;
}

export interface KeyRotationPolicy {
  interval: number;
  algorithm: string;
  keyType: 'symmetric' | 'asymmetric';
  retentionPeriod: number;
}

export interface EncryptionMetrics {
  operationsCount: number;
  averageLatency: number;
  errorRate: number;
  keyUsage: Record<string, number>;
}

export interface EncryptionService {
  encrypt(data: string | Buffer, keyId?: string): Promise<EncryptedData>;
  decrypt(encryptedData: EncryptedData): Promise<string>;
  generateKey(type: 'symmetric' | 'asymmetric', metadata?: Record<string, unknown>): Promise<EncryptionKey>;
  rotateKeys(policy: KeyRotationPolicy): Promise<void>;
  getKey(keyId: string): Promise<EncryptionKey>;
  revokeKey(keyId: string): Promise<void>;
  getMetrics(): Promise<EncryptionMetrics>;
}

export interface EncryptionConfig {
  defaultAlgorithm: string;
  keyRotationInterval: number;
  minKeyLength: number;
  enableKeyRotation: boolean;
  retentionPolicy: {
    enabled: boolean;
    duration: number;
  };
} 