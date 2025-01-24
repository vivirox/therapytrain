/**
 * Service for handling end-to-end encryption of sensitive therapy session data
 */
export class EncryptionService {
  private static instance: EncryptionService;
  private sessionKeys: Map<string, CryptoKey> = new Map();
  private readonly ALGORITHM = 'AES-GCM';
  private readonly KEY_LENGTH = 256; // bits
  private readonly IV_LENGTH = 12; // bytes for AES-GCM

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
   * @returns The generated session key as base64
   */
  public async generateSessionKey(sessionId: string): Promise<string> {
    const key = await window.crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      true,
      ['encrypt', 'decrypt']
    );
    
    this.sessionKeys.set(sessionId, key);
    const exportedKey = await window.crypto.subtle.exportKey('raw', key);
    return btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
  }

  /**
   * Encrypt session data using the session-specific key
   * @param sessionId Session identifier
   * @param data Data to encrypt
   * @returns Encrypted data with IV as base64
   */
  public async encryptSessionData(sessionId: string, data: any): Promise<string> {
    const key = this.sessionKeys.get(sessionId);
    if (!key) {
      throw new Error('No encryption key found for session');
    }

    const iv = window.crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    const encodedData = new TextEncoder().encode(JSON.stringify(data));

    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv
      },
      key,
      encodedData
    );

    // Combine IV and encrypted data
    const result = new Uint8Array(iv.length + encryptedData.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encryptedData), iv.length);

    return btoa(String.fromCharCode(...result));
  }

  /**
   * Decrypt session data using the session-specific key
   * @param sessionId Session identifier
   * @param encryptedData Encrypted data with IV
   * @returns Decrypted data
   */
  public async decryptSessionData(sessionId: string, encryptedData: string): Promise<any> {
    const key = this.sessionKeys.get(sessionId);
    if (!key) {
      throw new Error('No encryption key found for session');
    }

    const data = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const iv = data.slice(0, this.IV_LENGTH);
    const ciphertext = data.slice(this.IV_LENGTH);

    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: this.ALGORITHM,
        iv
      },
      key,
      ciphertext
    );

    return JSON.parse(new TextDecoder().decode(decryptedData));
  }

  /**
   * Import an existing session key
   * @param sessionId Session identifier
   * @param keyBase64 Base64 encoded key
   */
  public async importSessionKey(sessionId: string, keyBase64: string): Promise<void> {
    const keyData = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
    const key = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      this.ALGORITHM,
      true,
      ['encrypt', 'decrypt']
    );
    this.sessionKeys.set(sessionId, key);
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
  public async hashData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }
}

export default EncryptionService;
