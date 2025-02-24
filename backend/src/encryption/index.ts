import crypto from 'crypto';

export interface EncryptionConfig {
    algorithm: string;
    keySize: number;
    ivSize: number;
    saltSize: number;
    iterations: number;
    digest: string;
}

export interface EncryptionKey {
    id: string;
    key: Buffer;
    iv: Buffer;
    salt: Buffer;
    createdAt: Date;
    expiresAt: Date;
    algorithm: string;
}

export interface EncryptionResult {
    ciphertext: Buffer;
    iv: Buffer;
    salt: Buffer;
    keyId: string;
}

export class EncryptionService {
    private static instance: EncryptionService;
    private readonly config: EncryptionConfig = {
        algorithm: 'aes-256-gcm',
        keySize: 32,
        ivSize: 16,
        saltSize: 32,
        iterations: 100000,
        digest: 'sha512'
    };

    private constructor() {}

    public static getInstance(): EncryptionService {
        if (!EncryptionService.instance) {
            EncryptionService.instance = new EncryptionService();
        }
        return EncryptionService.instance;
    }

    public async encrypt(data: Buffer | string, key: EncryptionKey): Promise<EncryptionResult> {
        const cipher = crypto.createCipheriv(this.config.algorithm, key.key, key.iv);
        const ciphertext = Buffer.concat([
            cipher.update(typeof data === 'string' ? Buffer.from(data) : data),
            cipher.final()
        ]);

        return {
            ciphertext,
            iv: key.iv,
            salt: key.salt,
            keyId: key.id
        };
    }

    public async decrypt(encryptedData: EncryptionResult, key: EncryptionKey): Promise<Buffer> {
        const decipher = crypto.createDecipheriv(this.config.algorithm, key.key, encryptedData.iv);
        return Buffer.concat([
            decipher.update(encryptedData.ciphertext),
            decipher.final()
        ]);
    }

    public generateKey(): EncryptionKey {
        const id = crypto.randomBytes(16).toString('hex');
        const key = crypto.randomBytes(this.config.keySize);
        const iv = crypto.randomBytes(this.config.ivSize);
        const salt = crypto.randomBytes(this.config.saltSize);
        const createdAt = new Date();
        const expiresAt = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

        return {
            id,
            key,
            iv,
            salt,
            createdAt,
            expiresAt,
            algorithm: this.config.algorithm
        };
    }

    public deriveKey(password: string, salt: Buffer): Buffer {
        return crypto.pbkdf2Sync(
            password,
            salt,
            this.config.iterations,
            this.config.keySize,
            this.config.digest
        );
    }
}

export const encryptionService = EncryptionService.getInstance(); 