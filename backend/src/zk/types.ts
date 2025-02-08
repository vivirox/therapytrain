import { Buffer } from 'buffer';

export enum SessionMetadataFlag {
    EMERGENCY_SESSION = 0,
    RECORDED = 1,
    SUPERVISED = 2,
    TRAINING_SESSION = 3
}

export enum TherapistCredentialField {
    LICENSE_HASH = 0,
    SPECIALIZATION_HASH = 1,
    CERTIFICATION_HASH = 2,
    STATUS_HASH = 3
}

export interface SessionMetadata {
    sessionId: string;
    timestamp: number;
    clientId: string;
    therapistId: string;
    encryptionKey?: string;
}

export interface TherapistCredential {
    id: string;
    publicKey: string;
    privateKey?: string;
    metadata: {
        issuedAt: number;
        expiresAt: number;
        issuer: string;
    };
}

export interface ProofGenerationInput {
    sessionData: Array<{
        timestamp: number;
        messageHash: string;
        role: 'THERAPIST' | 'CLIENT';
    }>;
    therapistCredential: {
        id: string;
        licenseNumber: string;
        expirationDate: Date;
        status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
        verificationHash: string;
    };
    metadata: {
        sessionId: string;
        clientId: string;
        timestamp: number;
        protocol: string;
    };
}

export interface ProofOutput {
    proof: string;
    publicSignals: string[];
    metadata: {
        protocol: string;
        timestamp: number;
        verificationKey: string;
    };
}

export interface CircuitMetadata {
    name: string;
    version: string;
    description: string;
    inputs: {
        name: string;
        type: string;
        description: string;
    }[];
    outputs: {
        name: string;
        type: string;
        description: string;
    }[];
}

export interface VerificationKey {
    id: string;
    key: string;
    circuit: string;
    version: string;
    createdAt: number;
    expiresAt: number;
}

export interface ProofVerificationResult {
    verified: boolean;
    error?: string;
    metadata?: {
        verificationTime: number;
        keyId: string;
    };
}

export interface ZKWorkerMessage {
    type: 'GENERATE_PROOF' | 'VERIFY_PROOF' | 'ERROR';
    payload: any;
    error?: string;
}

export interface ZKWorkerResult {
    success: boolean;
    data?: ProofOutput | ProofVerificationResult;
    error?: string;
    metadata?: {
        executionTime: number;
        memoryUsage: number;
    };
}

export interface ZKUtils {
    generateProof(input: ProofGenerationInput): Promise<ProofOutput>;
    verifyProof(proof: ProofOutput): Promise<boolean>;
    generateVerificationKey(): Promise<string>;
}

export interface WorkerPoolMetrics {
    activeWorkers: number;
    pendingTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageProcessingTime: number;
    workers: Array<{
        id: string;
        status: 'IDLE' | 'BUSY' | 'ERROR';
        taskCount: number;
        lastActive: Date;
    }>;
}

export interface ProofGenerationStats {
    totalProofs: number;
    successfulProofs: number;
    failedProofs: number;
    averageGenerationTime: number;
    verificationStats: {
        totalVerifications: number;
        successfulVerifications: number;
        failedVerifications: number;
        averageVerificationTime: number;
    };
}

export class ZKUtils {
    static metadataToFlags(metadata: SessionMetadata): number[] {
        return [
            Number(metadata.isEmergency),
            Number(metadata.isRecorded),
            Number(metadata.isSupervised),
            Number(metadata.isTraining)
        ];
    }

    static credentialToArray(credential: TherapistCredential): string[] {
        return [
            credential.licenseHash,
            credential.specializationHash,
            credential.certificationHash,
            credential.statusHash
        ];
    }

    static async hashCredential(credential: TherapistCredential): Promise<string> {
        const credArray = this.credentialToArray(credential);
        const encoder = new TextEncoder();
        const data = encoder.encode(credArray.join(''));
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Buffer.from(hashBuffer).toString('hex');
    }

    static validateMetadata(metadata: SessionMetadata): void {
        if (typeof metadata.isEmergency !== 'boolean' ||
            typeof metadata.isRecorded !== 'boolean' ||
            typeof metadata.isSupervised !== 'boolean' ||
            typeof metadata.isTraining !== 'boolean') {
            throw new Error('Invalid metadata format');
        }
    }

    static validateCredential(credential: TherapistCredential): void {
        const fields = [
            credential.licenseHash,
            credential.specializationHash,
            credential.certificationHash,
            credential.statusHash
        ];

        if (!fields.every(field => typeof field === 'string' && field.length === 64)) {
            throw new Error('Invalid credential format - all hashes must be 32 bytes (64 hex chars)');
        }
    }

    static async validateProofInput(input: ProofGenerationInput): Promise<void> {
        // Time validation
        if (input.endTimestamp <= input.startTimestamp) {
            throw new Error('End timestamp must be after start timestamp');
        }

        // Session data validation
        if (!input.sessionData || input.sessionData.length !== 8) {
            throw new Error('Session data must contain exactly 8 chunks');
        }

        // Metadata validation
        this.validateMetadata(input.metadata);

        // Credential validation
        this.validateCredential(input.therapistCredential);

        // Signature validation
        if (!input.signature.R8 || !input.signature.S ||
            !(input.signature.R8 instanceof Uint8Array) ||
            !(input.signature.S instanceof Uint8Array)) {
            throw new Error('Invalid signature format');
        }

        // Public key validation
        if (!input.therapistPubKey || !(input.therapistPubKey instanceof Uint8Array)) {
            throw new Error('Invalid public key format');
        }
    }

    static async prepareCircuitInput(input: ProofGenerationInput): Promise<any> {
        await this.validateProofInput(input);

        return {
            sessionId: input.sessionId,
            startTimestamp: input.startTimestamp,
            endTimestamp: input.endTimestamp,
            therapistPubKey: Array.from(input.therapistPubKey).map((b: any) => b.toString()),
            therapistCredentialHash: input.therapistCredentialHash,
            sessionData: input.sessionData.map((d: any) => Array.from(d).map((b: any) => b.toString())),
            metadataFlags: this.metadataToFlags(input.metadata),
            therapistCredential: this.credentialToArray(input.therapistCredential),
            therapistSigR8: Array.from(input.signature.R8).map((b: any) => b.toString()),
            therapistSigS: Array.from(input.signature.S).map((b: any) => b.toString())
        };
    }
}