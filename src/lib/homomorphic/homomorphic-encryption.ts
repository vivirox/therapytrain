import * as SEAL from 'node-seal';
import { EncryptedData } from '@/types/services/encryption';

/**
 * Implements homomorphic encryption using Microsoft SEAL library
 * through the node-seal wrapper
 */
export interface HomomorphicConfig {
  polyModulusDegree: 4096 | 8192 | 16384;
  securityLevel: 128 | 192 | 256;
  scheme: 'bfv' | 'ckks';
}

export interface HomomorphicContext {
  publicKey: any;
  secretKey: any;
  encryptor: any;
  decryptor: any;
  evaluator: any;
  encoder: any;
  context: any;
}

export interface HomomorphicEncryptedData extends EncryptedData {
  scheme: 'bfv' | 'ckks';
  scale?: number;
  chain_index?: number;
}

export class HomomorphicEncryption {
  private static instance: HomomorphicEncryption;
  private readonly config: HomomorphicConfig;
  private seal: any;
  private context: HomomorphicContext | null = null;

  private constructor(config: Partial<HomomorphicConfig> = {}) {
    this.config = {
      polyModulusDegree: 8192,
      securityLevel: 128,
      scheme: 'bfv',
      ...config
    };
  }

  public static getInstance(config?: Partial<HomomorphicConfig>): HomomorphicEncryption {
    if (!HomomorphicEncryption.instance) {
      HomomorphicEncryption.instance = new HomomorphicEncryption(config);
    }
    return HomomorphicEncryption.instance;
  }

  /**
   * Initialize the homomorphic encryption context
   */
  public async initialize(): Promise<void> {
    if (this.context) return;

    this.seal = await SEAL();
    
    const schemeType = this.config.scheme === 'bfv' 
      ? this.seal.SchemeType.bfv
      : this.seal.SchemeType.ckks;

    const encParams = this.seal.EncryptionParameters(schemeType);
    
    // Set the polynomial modulus degree
    encParams.setPolyModulusDegree(this.config.polyModulusDegree);

    if (this.config.scheme === 'bfv') {
      // For BFV scheme
      encParams.setCoeffModulus(
        this.seal.CoeffModulus.BFVDefault(
          this.config.polyModulusDegree,
          this.config.securityLevel
        )
      );
      // Set plain modulus to a prime that supports batching
      encParams.setPlainModulus(
        this.seal.PlainModulus.Batching(
          this.config.polyModulusDegree,
          20
        )
      );
    } else {
      // For CKKS scheme
      encParams.setCoeffModulus(
        this.seal.CoeffModulus.Create(
          this.config.polyModulusDegree,
          [60, 40, 40, 60]
        )
      );
    }

    // Create context
    const context = this.seal.Context(
      encParams,
      true,
      this.config.securityLevel
    );

    // Generate keys
    const keyGenerator = this.seal.KeyGenerator(context);
    const publicKey = keyGenerator.createPublicKey();
    const secretKey = keyGenerator.secretKey();

    // Create encryption tools
    const encryptor = this.seal.Encryptor(context, publicKey);
    const decryptor = this.seal.Decryptor(context, secretKey);
    const evaluator = this.seal.Evaluator(context);

    // Create encoder based on scheme
    const encoder = this.config.scheme === 'bfv'
      ? this.seal.BatchEncoder(context)
      : this.seal.CKKSEncoder(context);

    this.context = {
      publicKey,
      secretKey,
      encryptor,
      decryptor,
      evaluator,
      encoder,
      context
    };
  }

  /**
   * Encrypt data using homomorphic encryption
   */
  public async encrypt(data: number[]): Promise<HomomorphicEncryptedData> {
    if (!this.context) {
      throw new Error('Homomorphic encryption context not initialized');
    }

    let encoded;
    if (this.config.scheme === 'bfv') {
      // BFV scheme - encode integers
      encoded = this.context.encoder.encode(Int32Array.from(data));
    } else {
      // CKKS scheme - encode floating point numbers
      encoded = this.context.encoder.encode(
        Float64Array.from(data),
        Math.pow(2, 40)
      );
    }

    const encrypted = this.context.encryptor.encrypt(encoded);
    const serialized = encrypted.save();

    return {
      data: Buffer.from(serialized).toString('base64'),
      iv: '', // Not needed for homomorphic encryption
      algorithm: `SEAL-${this.config.scheme.toUpperCase()}`,
      keyId: '', // Not applicable
      metadata: {
        polyModulusDegree: this.config.polyModulusDegree,
        securityLevel: this.config.securityLevel,
        timestamp: new Date().toISOString()
      },
      scheme: this.config.scheme,
      scale: this.config.scheme === 'ckks' ? Math.pow(2, 40) : undefined,
      chain_index: encrypted.chainIndex
    };
  }

  /**
   * Decrypt homomorphically encrypted data
   */
  public async decrypt(encryptedData: HomomorphicEncryptedData): Promise<number[]> {
    if (!this.context) {
      throw new Error('Homomorphic encryption context not initialized');
    }

    const encrypted = this.seal.Ciphertext();
    encrypted.load(
      this.context.context,
      Buffer.from(encryptedData.data, 'base64')
    );

    const decrypted = this.context.decryptor.decrypt(encrypted);
    
    if (this.config.scheme === 'bfv') {
      // BFV scheme - decode integers
      const decoded = this.context.encoder.decode(decrypted);
      return Array.from(decoded);
    } else {
      // CKKS scheme - decode floating point numbers
      const decoded = this.context.encoder.decode(decrypted);
      return Array.from(decoded);
    }
  }

  /**
   * Perform addition on encrypted values
   */
  public async add(
    a: HomomorphicEncryptedData,
    b: HomomorphicEncryptedData
  ): Promise<HomomorphicEncryptedData> {
    if (!this.context) {
      throw new Error('Homomorphic encryption context not initialized');
    }

    const encryptedA = this.seal.Ciphertext();
    const encryptedB = this.seal.Ciphertext();

    encryptedA.load(this.context.context, Buffer.from(a.data, 'base64'));
    encryptedB.load(this.context.context, Buffer.from(b.data, 'base64'));

    const result = this.context.evaluator.add(encryptedA, encryptedB);
    const serialized = result.save();

    return {
      data: Buffer.from(serialized).toString('base64'),
      iv: '',
      algorithm: `SEAL-${this.config.scheme.toUpperCase()}`,
      keyId: '',
      metadata: {
        operation: 'add',
        timestamp: new Date().toISOString()
      },
      scheme: this.config.scheme,
      scale: this.config.scheme === 'ckks' ? Math.pow(2, 40) : undefined,
      chain_index: result.chainIndex
    };
  }

  /**
   * Perform multiplication on encrypted values
   */
  public async multiply(
    a: HomomorphicEncryptedData,
    b: HomomorphicEncryptedData
  ): Promise<HomomorphicEncryptedData> {
    if (!this.context) {
      throw new Error('Homomorphic encryption context not initialized');
    }

    const encryptedA = this.seal.Ciphertext();
    const encryptedB = this.seal.Ciphertext();

    encryptedA.load(this.context.context, Buffer.from(a.data, 'base64'));
    encryptedB.load(this.context.context, Buffer.from(b.data, 'base64'));

    const result = this.context.evaluator.multiply(encryptedA, encryptedB);
    const serialized = result.save();

    return {
      data: Buffer.from(serialized).toString('base64'),
      iv: '',
      algorithm: `SEAL-${this.config.scheme.toUpperCase()}`,
      keyId: '',
      metadata: {
        operation: 'multiply',
        timestamp: new Date().toISOString()
      },
      scheme: this.config.scheme,
      scale: this.config.scheme === 'ckks' ? Math.pow(2, 40) : undefined,
      chain_index: result.chainIndex
    };
  }

  /**
   * Perform scalar multiplication on encrypted value
   */
  public async multiplyPlain(
    encrypted: HomomorphicEncryptedData,
    scalar: number
  ): Promise<HomomorphicEncryptedData> {
    if (!this.context) {
      throw new Error('Homomorphic encryption context not initialized');
    }

    const encryptedValue = this.seal.Ciphertext();
    encryptedValue.load(
      this.context.context,
      Buffer.from(encrypted.data, 'base64')
    );

    let encoded;
    if (this.config.scheme === 'bfv') {
      encoded = this.context.encoder.encode([scalar]);
    } else {
      encoded = this.context.encoder.encode(
        [scalar],
        Math.pow(2, 40)
      );
    }

    const result = this.context.evaluator.multiplyPlain(encryptedValue, encoded);
    const serialized = result.save();

    return {
      data: Buffer.from(serialized).toString('base64'),
      iv: '',
      algorithm: `SEAL-${this.config.scheme.toUpperCase()}`,
      keyId: '',
      metadata: {
        operation: 'multiply_plain',
        scalar,
        timestamp: new Date().toISOString()
      },
      scheme: this.config.scheme,
      scale: this.config.scheme === 'ckks' ? Math.pow(2, 40) : undefined,
      chain_index: result.chainIndex
    };
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.context) {
      this.context.publicKey.delete();
      this.context.secretKey.delete();
      this.context.encryptor.delete();
      this.context.decryptor.delete();
      this.context.evaluator.delete();
      this.context.encoder.delete();
      this.context.context.delete();
      this.context = null;
    }
  }
} 