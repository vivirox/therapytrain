import { QuantumResistantEncryption, QuantumResistantConfig } from '../quantum-resistant-encryption';

describe('QuantumResistantEncryption', () => {
  let encryption: QuantumResistantEncryption;
  
  beforeEach(() => {
    const config: Partial<QuantumResistantConfig> = {
      kyberSecurityLevel: 1024,
      sphincsVariant: 'small',
      useAesHybridMode: true
    };
    encryption = QuantumResistantEncryption.getInstance(config);
  });

  describe('Key Generation', () => {
    it('should generate Kyber key pairs', async () => {
      const keyPair = await encryption.generateKeyPair('kyber');
      
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      expect(keyPair.type).toBe('kyber');
      expect(keyPair.metadata.algorithm).toBe('KYBER-1024');
      expect(keyPair.metadata.securityLevel).toBe(1024);
      expect(keyPair.metadata.created).toBeInstanceOf(Date);
    });

    it('should generate SPHINCS+ key pairs', async () => {
      const keyPair = await encryption.generateKeyPair('sphincs');
      
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      expect(keyPair.type).toBe('sphincs');
      expect(keyPair.metadata.algorithm).toBe('SPHINCS+');
      expect(keyPair.metadata.securityLevel).toBe(256);
      expect(keyPair.metadata.created).toBeInstanceOf(Date);
    });
  });

  describe('Hybrid Encryption', () => {
    it('should encrypt and decrypt data using hybrid mode', async () => {
      const keyPair = await encryption.generateKeyPair('kyber');
      const testData = 'Test message for hybrid encryption';

      const encrypted = await encryption.encrypt(testData, keyPair.publicKey);
      
      expect(encrypted.algorithm).toBe('KYBER-1024');
      expect(encrypted.data).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.hybridEncryption).toBeDefined();
      expect(encrypted.metadata.mode).toBe('hybrid');

      const decrypted = await encryption.decrypt(encrypted, keyPair.privateKey);
      expect(decrypted.toString()).toBe(testData);
    });

    it('should handle large data in hybrid mode', async () => {
      const keyPair = await encryption.generateKeyPair('kyber');
      const largeData = Buffer.alloc(1024 * 1024); // 1MB of data
      crypto.getRandomValues(new Uint8Array(largeData));

      const encrypted = await encryption.encrypt(largeData, keyPair.publicKey);
      const decrypted = await encryption.decrypt(encrypted, keyPair.privateKey);

      expect(decrypted.length).toBe(largeData.length);
      expect(Buffer.compare(decrypted, largeData)).toBe(0);
    });
  });

  describe('Direct Kyber Encryption', () => {
    let encryptionWithoutHybrid: QuantumResistantEncryption;

    beforeEach(() => {
      encryptionWithoutHybrid = QuantumResistantEncryption.getInstance({
        kyberSecurityLevel: 1024,
        sphincsVariant: 'small',
        useAesHybridMode: false
      });
    });

    it('should encrypt and decrypt data directly with Kyber', async () => {
      const keyPair = await encryptionWithoutHybrid.generateKeyPair('kyber');
      const testData = 'Test message for direct encryption';

      const encrypted = await encryptionWithoutHybrid.encrypt(testData, keyPair.publicKey);
      
      expect(encrypted.algorithm).toBe('KYBER-1024');
      expect(encrypted.data).toBeDefined();
      expect(encrypted.hybridEncryption).toBeUndefined();
      expect(encrypted.metadata.mode).toBe('direct');

      const decrypted = await encryptionWithoutHybrid.decrypt(encrypted, keyPair.privateKey);
      expect(decrypted.toString()).toBe(testData);
    });
  });

  describe('SPHINCS+ Signatures', () => {
    it('should sign and verify data', async () => {
      const keyPair = await encryption.generateKeyPair('sphincs');
      const testData = 'Test message for signing';

      const signature = await encryption.sign(testData, keyPair.privateKey);
      expect(signature).toBeDefined();
      expect(signature.length).toBeGreaterThan(0);

      const isValid = await encryption.verify(testData, signature, keyPair.publicKey);
      expect(isValid).toBe(true);
    });

    it('should handle large data for signing', async () => {
      const keyPair = await encryption.generateKeyPair('sphincs');
      const largeData = Buffer.alloc(1024 * 1024); // 1MB of data
      crypto.getRandomValues(new Uint8Array(largeData));

      const signature = await encryption.sign(largeData, keyPair.privateKey);
      expect(signature).toBeDefined();
      expect(signature.length).toBeGreaterThan(0);

      const isValid = await encryption.verify(largeData, signature, keyPair.publicKey);
      expect(isValid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid key pairs', async () => {
      const keyPair = await encryption.generateKeyPair('kyber');
      const testData = 'Test message';
      const invalidPrivateKey = Buffer.alloc(keyPair.privateKey.length);

      const encrypted = await encryption.encrypt(testData, keyPair.publicKey);
      
      await expect(
        encryption.decrypt(encrypted, invalidPrivateKey)
      ).rejects.toThrow();
    });

    it('should handle invalid signatures', async () => {
      const keyPair = await encryption.generateKeyPair('sphincs');
      const testData = 'Test message';
      const invalidSignature = Buffer.alloc(64);

      const isValid = await encryption.verify(testData, invalidSignature, keyPair.publicKey);
      expect(isValid).toBe(false);
    });
  });
}); 