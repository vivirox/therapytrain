import { SecurityAuditService } from './SecurityAuditService';
import { RateLimiterService } from './RateLimiterService';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

interface VerificationKey {
    key: string;
    version: string;
    validFrom: number;
    validUntil: number | null;
    signature: string;
}

export class VerificationKeyService {
    private readonly keysDir: string;
    private currentKey: VerificationKey | null = null;
    private readonly keyCache = new Map<string, VerificationKey>();

    constructor(
        private securityAuditService: SecurityAuditService,
        private rateLimiterService: RateLimiterService
    ) {
        this.keysDir = path.join(__dirname, '../zk/keys');
    }

    async getCurrentKey(requesterId: string): Promise<VerificationKey> {
        try {
            // Check rate limit
            await this.rateLimiterService.checkRateLimit(requesterId, 'KEY_FETCH');

            // Load current key if not cached or expired
            if (!this.currentKey || this.isKeyExpired(this.currentKey)) {
                this.currentKey = await this.loadLatestKey();
            }

            await this.securityAuditService.recordAlert(
                'KEY_FETCH',
                'LOW',
                { requesterId, keyVersion: this.currentKey.version }
            );

            return this.currentKey;
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'KEY_FETCH_ERROR',
                'HIGH',
                { requesterId, error: error.message }
            );
            throw error;
        }
    }

    async getKeyByVersion(version: string, requesterId: string): Promise<VerificationKey> {
        try {
            // Check rate limit
            await this.rateLimiterService.checkRateLimit(requesterId, 'KEY_FETCH');

            // Check cache first
            if (this.keyCache.has(version)) {
                const cachedKey = this.keyCache.get(version)!;
                if (!this.isKeyExpired(cachedKey)) {
                    return cachedKey;
                }
                this.keyCache.delete(version);
            }

            const key = await this.loadKeyByVersion(version);
            this.keyCache.set(version, key);

            await this.securityAuditService.recordAlert(
                'KEY_FETCH_VERSION',
                'LOW',
                { requesterId, keyVersion: version }
            );

            return key;
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'KEY_FETCH_VERSION_ERROR',
                'HIGH',
                { requesterId, version, error: error.message }
            );
            throw error;
        }
    }

    async rotateKey(): Promise<void> {
        try {
            // Run the setup script to generate new keys
            const setupScript = path.join(__dirname, '../zk/scripts/run-setup.sh');
            await new Promise((resolve, reject) => {
                require('child_process').exec(
                    setupScript,
                    { cwd: path.dirname(setupScript) },
                    (error: Error | null) => {
                        if (error) reject(error);
                        else resolve(null);
                    }
                );
            });

            // Invalidate current key
            if (this.currentKey) {
                this.currentKey.validUntil = Date.now();
                await this.saveKey(this.currentKey);
            }

            // Load new key
            this.currentKey = await this.loadLatestKey();
            this.keyCache.clear();

            await this.securityAuditService.recordAlert(
                'KEY_ROTATION',
                'MEDIUM',
                { newVersion: this.currentKey.version }
            );
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'KEY_ROTATION_ERROR',
                'HIGH',
                { error: error.message }
            );
            throw error;
        }
    }

    async revokeKey(version: string, reason: string): Promise<void> {
        try {
            const key = await this.loadKeyByVersion(version);
            key.validUntil = Date.now();
            await this.saveKey(key);
            this.keyCache.delete(version);

            if (this.currentKey?.version === version) {
                this.currentKey = null;
            }

            await this.securityAuditService.recordAlert(
                'KEY_REVOCATION',
                'HIGH',
                { version, reason }
            );
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'KEY_REVOCATION_ERROR',
                'HIGH',
                { version, reason, error: error.message }
            );
            throw error;
        }
    }

    private async loadLatestKey(): Promise<VerificationKey> {
        const vkeyPath = path.join(this.keysDir, 'SessionDataCircuit.vkey.json');
        if (!fs.existsSync(vkeyPath)) {
            throw new Error('Verification key not found');
        }

        const keyContent = fs.readFileSync(vkeyPath, 'utf8');
        const version = crypto.createHash('sha256')
            .update(keyContent)
            .digest('hex')
            .slice(0, 8);

        const key: VerificationKey = {
            key: keyContent,
            version,
            validFrom: Date.now(),
            validUntil: null,
            signature: this.signKey(keyContent)
        };

        await this.saveKey(key);
        return key;
    }

    private async loadKeyByVersion(version: string): Promise<VerificationKey> {
        const keyPath = path.join(this.keysDir, `key_${version}.json`);
        if (!fs.existsSync(keyPath)) {
            throw new Error(`Key version ${version} not found`);
        }

        const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        if (!this.verifyKeySignature(key)) {
            throw new Error(`Invalid signature for key version ${version}`);
        }

        return key;
    }

    private async saveKey(key: VerificationKey): Promise<void> {
        const keyPath = path.join(this.keysDir, `key_${key.version}.json`);
        fs.writeFileSync(keyPath, JSON.stringify(key, null, 2));
    }

    private isKeyExpired(key: VerificationKey): boolean {
        return key.validUntil !== null && key.validUntil <= Date.now();
    }

    private signKey(keyContent: string): string {
        // In production, this should use a proper signing key
        return crypto.createHmac('sha256', process.env.KEY_SIGNING_SECRET || 'dev-secret')
            .update(keyContent)
            .digest('hex');
    }

    private verifyKeySignature(key: VerificationKey): boolean {
        const expectedSignature = this.signKey(key.key);
        return crypto.timingSafeEqual(
            Buffer.from(key.signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    }
}
