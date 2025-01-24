import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';

/**
 * Service for handling end-to-end encryption of sensitive therapy session data
 */
export class EncryptionService {
  private static instance: EncryptionService;
  private sessionKeys: Map<string, string> = new Map();
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32;
  private readonly IV_LENGTH = 16;
  private readonly AUTH_TAG_LENGTH = 16;

  private constructor() {}

  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Generate a new encryption key for a session
   * @param sessionId Unique session identifier
   * @returns The generated session key
   */
  public generateSessionKey(sessionId: string): string {
    const key = randomBytes(this.KEY_LENGTH).toString('hex');
    this.sessionKeys.set(sessionId, key);
    return key;
  }

  /**
   * Encrypt session data using the session-specific key
   * @param sessionId Session identifier
   * @param data Data to encrypt
   * @returns Encrypted data with IV and auth tag
   */
  public encryptSessionData(sessionId: string, data: any): string {
    const key = this.sessionKeys.get(sessionId);
    if (!key) {
      throw new Error('No encryption key found for session');
    }

    const iv = randomBytes(this.IV_LENGTH);
    const cipher = createCipheriv(
      this.ALGORITHM,
      Buffer.from(key, 'hex'),
      iv
    );

    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data), 'utf8'),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Combine IV, encrypted data, and auth tag
    const result = Buffer.concat([iv, encrypted, authTag]);
    return result.toString('base64');
  }

  /**
   * Decrypt session data using the session-specific key
   * @param sessionId Session identifier
   * @param encryptedData Encrypted data (base64 string)
   * @returns Decrypted data
   */
  public decryptSessionData(sessionId: string, encryptedData: string): any {
    const key = this.sessionKeys.get(sessionId);
    if (!key) {
      throw new Error('No encryption key found for session');
    }

    const data = Buffer.from(encryptedData, 'base64');
    
    // Extract IV, encrypted data, and auth tag
    const iv = data.subarray(0, this.IV_LENGTH);
    const encrypted = data.subarray(
      this.IV_LENGTH,
      data.length - this.AUTH_TAG_LENGTH
    );
    const authTag = data.subarray(data.length - this.AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(
      this.ALGORITHM,
      Buffer.from(key, 'hex'),
      iv
    );
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return JSON.parse(decrypted.toString('utf8'));
  }

  /**
   * Remove a session key when the session ends
   * @param sessionId Session identifier
   */
  public clearSessionKey(sessionId: string): void {
    this.sessionKeys.delete(sessionId);
  }

  /**
   * Hash sensitive data for storage or comparison
   * @param data Data to hash
   * @returns Hashed data
   */
  public hashData(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }
}

export default EncryptionService;
