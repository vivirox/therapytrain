// Security configuration types
export interface EncryptionKeyDerivationConfig {
    algorithm: 'pbkdf2';
    iterations: number;
    digest: 'sha512';
}

export interface EncryptionConfig {
    algorithm: 'aes-256-gcm';
    keyLength: number;
    ivLength: number;
    saltLength: number;
    keyDerivation: EncryptionKeyDerivationConfig;
}

export interface SessionConfig {
    duration: number;
    renewalWindow: number;
}

export interface AuditConfig {
    enabled: boolean;
    retention: number;
}

export interface SecurityConfig {
    encryption: EncryptionConfig;
    session: SessionConfig;
    audit: AuditConfig;
}

export const securityConfig: SecurityConfig = {
    encryption: {
        algorithm: 'aes-256-gcm',
        keyLength: 32,
        ivLength: 16,
        saltLength: 16,
        keyDerivation: {
            algorithm: 'pbkdf2',
            iterations: 10_000,
            digest: 'sha512'
        }
    },
    session: {
        duration: 3600,
        renewalWindow: 300
    },
    audit: {
        enabled: true,
        retention: 90 // days
    }
};
