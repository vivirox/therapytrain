import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

export class FileEncryptionService {
  private static instance: FileEncryptionService;

  private constructor() {}

  public static getInstance(): FileEncryptionService {
    if (!FileEncryptionService.instance) {
      FileEncryptionService.instance = new FileEncryptionService();
    }
    return FileEncryptionService.instance;
  }

  public async generateFileKey(): Promise<{ key: Buffer; iv: Buffer }> {
    const key = randomBytes(32); // 256 bits
    const iv = randomBytes(12); // 96 bits for GCM
    return { key, iv };
  }

  public async generateSalt(): Promise<Buffer> {
    return randomBytes(16);
  }

  public async encryptFileChunk(chunk: ArrayBuffer, key: Buffer, iv: Buffer): Promise<Buffer> {
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encryptedChunk = Buffer.concat([
      cipher.update(Buffer.from(chunk)),
      cipher.final()
    ]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([encryptedChunk, tag]);
  }

  public async decryptFileChunk(chunk: ArrayBuffer, key: Buffer, iv: Buffer): Promise<Buffer> {
    const encryptedData = Buffer.from(chunk);
    const tag = encryptedData.slice(-16); // Last 16 bytes are the auth tag
    const encryptedChunk = encryptedData.slice(0, -16);
    
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    
    return Buffer.concat([
      decipher.update(encryptedChunk),
      decipher.final()
    ]);
  }

  public async getFileKey(version: string, keyId: string | undefined, derivation: any): Promise<Buffer> {
    // TODO: Implement proper key derivation and management
    // For now, generate a new key
    const { key } = await this.generateFileKey();
    return key;
  }
} 