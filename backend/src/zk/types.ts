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
    isEmergency: boolean;
    isRecorded: boolean;
    isSupervised: boolean;
    isTraining: boolean;
}

export interface TherapistCredential {
    licenseHash: string;
    specializationHash: string;
    certificationHash: string;
    statusHash: string;
}

export interface ProofGenerationInput {
    sessionId: string;
    startTimestamp: number;
    endTimestamp: number;
    therapistPubKey: Uint8Array;
    therapistCredentialHash: string;
    sessionData: Uint8Array[];
    metadata: SessionMetadata;
    therapistCredential: TherapistCredential;
    signature: {
        R8: Uint8Array;
        S: Uint8Array;
    };
}

export interface ProofOutput {
    proof: any;
    publicSignals: any[];
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
            therapistPubKey: Array.from(input.therapistPubKey).map(b => b.toString()),
            therapistCredentialHash: input.therapistCredentialHash,
            sessionData: input.sessionData.map(d => Array.from(d).map(b => b.toString())),
            metadataFlags: this.metadataToFlags(input.metadata),
            therapistCredential: this.credentialToArray(input.therapistCredential),
            therapistSigR8: Array.from(input.signature.R8).map(b => b.toString()),
            therapistSigS: Array.from(input.signature.S).map(b => b.toString())
        };
    }
}