import { HomomorphicEncryption, HomomorphicConfig } from '../homomorphic-encryption';

describe('HomomorphicEncryption', () => {
  let encryption: HomomorphicEncryption;
  
  beforeEach(async () => {
    const config: Partial<HomomorphicConfig> = {
      polyModulusDegree: 8192,
      securityLevel: 128,
      scheme: 'bfv'
    };
    encryption = HomomorphicEncryption.getInstance(config);
    await encryption.initialize();
  });

  afterEach(() => {
    encryption.destroy();
  });

  describe('BFV Scheme', () => {
    it('should encrypt and decrypt integers', async () => {
      const data = [1, 2, 3, 4, 5];
      const encrypted = await encryption.encrypt(data);
      
      expect(encrypted.algorithm).toBe('SEAL-BFV');
      expect(encrypted.data).toBeDefined();
      expect(encrypted.scheme).toBe('bfv');
      expect(encrypted.metadata.polyModulusDegree).toBe(8192);
      expect(encrypted.metadata.securityLevel).toBe(128);

      const decrypted = await encryption.decrypt(encrypted);
      expect(decrypted).toEqual(data);
    });

    it('should perform homomorphic addition', async () => {
      const data1 = [1, 2, 3];
      const data2 = [4, 5, 6];
      const expected = [5, 7, 9];

      const encrypted1 = await encryption.encrypt(data1);
      const encrypted2 = await encryption.encrypt(data2);
      
      const result = await encryption.add(encrypted1, encrypted2);
      const decrypted = await encryption.decrypt(result);
      
      expect(decrypted).toEqual(expected);
    });

    it('should perform homomorphic multiplication', async () => {
      const data1 = [2, 3, 4];
      const data2 = [3, 4, 5];
      const expected = [6, 12, 20];

      const encrypted1 = await encryption.encrypt(data1);
      const encrypted2 = await encryption.encrypt(data2);
      
      const result = await encryption.multiply(encrypted1, encrypted2);
      const decrypted = await encryption.decrypt(result);
      
      expect(decrypted).toEqual(expected);
    });

    it('should perform scalar multiplication', async () => {
      const data = [1, 2, 3];
      const scalar = 3;
      const expected = [3, 6, 9];

      const encrypted = await encryption.encrypt(data);
      const result = await encryption.multiplyPlain(encrypted, scalar);
      const decrypted = await encryption.decrypt(result);
      
      expect(decrypted).toEqual(expected);
    });
  });

  describe('CKKS Scheme', () => {
    beforeEach(async () => {
      const config: Partial<HomomorphicConfig> = {
        polyModulusDegree: 8192,
        securityLevel: 128,
        scheme: 'ckks'
      };
      encryption = HomomorphicEncryption.getInstance(config);
      await encryption.initialize();
    });

    it('should encrypt and decrypt floating point numbers', async () => {
      const data = [1.5, 2.7, 3.14];
      const encrypted = await encryption.encrypt(data);
      
      expect(encrypted.algorithm).toBe('SEAL-CKKS');
      expect(encrypted.data).toBeDefined();
      expect(encrypted.scheme).toBe('ckks');
      expect(encrypted.scale).toBeDefined();

      const decrypted = await encryption.decrypt(encrypted);
      
      // CKKS is approximate, so we check with some tolerance
      decrypted.forEach((value, index) => {
        expect(value).toBeCloseTo(data[index], 4);
      });
    });

    it('should perform homomorphic addition with floating point numbers', async () => {
      const data1 = [1.5, 2.5, 3.5];
      const data2 = [0.5, 1.5, 2.5];
      const expected = [2.0, 4.0, 6.0];

      const encrypted1 = await encryption.encrypt(data1);
      const encrypted2 = await encryption.encrypt(data2);
      
      const result = await encryption.add(encrypted1, encrypted2);
      const decrypted = await encryption.decrypt(result);
      
      decrypted.forEach((value, index) => {
        expect(value).toBeCloseTo(expected[index], 4);
      });
    });

    it('should perform homomorphic multiplication with floating point numbers', async () => {
      const data1 = [1.5, 2.0, 2.5];
      const data2 = [2.0, 2.5, 3.0];
      const expected = [3.0, 5.0, 7.5];

      const encrypted1 = await encryption.encrypt(data1);
      const encrypted2 = await encryption.encrypt(data2);
      
      const result = await encryption.multiply(encrypted1, encrypted2);
      const decrypted = await encryption.decrypt(result);
      
      decrypted.forEach((value, index) => {
        expect(value).toBeCloseTo(expected[index], 4);
      });
    });

    it('should perform scalar multiplication with floating point numbers', async () => {
      const data = [1.5, 2.5, 3.5];
      const scalar = 2.5;
      const expected = [3.75, 6.25, 8.75];

      const encrypted = await encryption.encrypt(data);
      const result = await encryption.multiplyPlain(encrypted, scalar);
      const decrypted = await encryption.decrypt(result);
      
      decrypted.forEach((value, index) => {
        expect(value).toBeCloseTo(expected[index], 4);
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error when context is not initialized', async () => {
      const encryption = HomomorphicEncryption.getInstance();
      await expect(encryption.encrypt([1, 2, 3])).rejects.toThrow(
        'Homomorphic encryption context not initialized'
      );
    });

    it('should handle invalid encrypted data', async () => {
      const invalidData = {
        data: 'invalid-base64-data',
        iv: '',
        algorithm: 'SEAL-BFV',
        keyId: '',
        metadata: {},
        scheme: 'bfv' as const
      };

      await expect(encryption.decrypt(invalidData)).rejects.toThrow();
    });

    it('should handle incompatible schemes in operations', async () => {
      const bfvConfig: Partial<HomomorphicConfig> = {
        scheme: 'bfv'
      };
      const ckksConfig: Partial<HomomorphicConfig> = {
        scheme: 'ckks'
      };

      const bfvEncryption = HomomorphicEncryption.getInstance(bfvConfig);
      const ckksEncryption = HomomorphicEncryption.getInstance(ckksConfig);

      await bfvEncryption.initialize();
      await ckksEncryption.initialize();

      const bfvData = await bfvEncryption.encrypt([1, 2, 3]);
      const ckksData = await ckksEncryption.encrypt([1.5, 2.5, 3.5]);

      await expect(bfvEncryption.add(bfvData, ckksData)).rejects.toThrow();
    });
  });

  describe('Resource Management', () => {
    it('should clean up resources on destroy', () => {
      const spy = jest.spyOn(encryption['context']!.publicKey, 'delete');
      encryption.destroy();
      expect(spy).toHaveBeenCalled();
      expect(encryption['context']).toBeNull();
    });

    it('should handle multiple initializations', async () => {
      await encryption.initialize(); // Second initialization
      expect(encryption['context']).toBeDefined();
      await encryption.initialize(); // Third initialization
      expect(encryption['context']).toBeDefined();
    });
  });
}); 