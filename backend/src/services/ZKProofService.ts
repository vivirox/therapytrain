import * as snarkjs from 'snarkjs';
import * as circomlibjs from 'circomlibjs';
import path from 'path';
import { SecurityAuditService } from './SecurityAuditService';

interface SessionProofInput {
    sessionId: string;
    startTimestamp: number;
    endTimestamp: number;
    therapistPubKey: Uint8Array;
    therapistCredentialHash: string;
    sessionData: Uint8Array[];
    metadataFlags: number[];
    therapistCredential: string[];
    signature: {
        R8: Uint8Array;
        S: Uint8Array;
    };
}

export class ZKProofService {
    private readonly circuitPath: string;
    private readonly keyPath: string;
    private readonly securityAuditService: SecurityAuditService;
    private readonly MAX_SESSION_DURATION = 7200; // 2 hours in seconds

    constructor(securityAuditService: SecurityAuditService) {
        this.circuitPath = path.join(__dirname, '../zk/circuits');
        this.keyPath = path.join(__dirname, '../zk/keys');
        this.securityAuditService = securityAuditService;
    }

    async generateProof(input: SessionProofInput): Promise<{ proof: any; publicSignals: any }> {
        try {
            // Validate input parameters
            this.validateInputs(input);

            // Convert inputs to the format expected by the circuit
            const circuitInput = {
                sessionId: input.sessionId,
                startTimestamp: input.startTimestamp,
                endTimestamp: input.endTimestamp,
                therapistPubKey: Array.from(input.therapistPubKey).map(b => b.toString()),
                therapistCredentialHash: input.therapistCredentialHash,
                maxSessionDuration: this.MAX_SESSION_DURATION,
                sessionData: input.sessionData.map(d => Array.from(d).map(b => b.toString())),
                metadataFlags: input.metadataFlags,
                therapistCredential: input.therapistCredential,
                therapistSigR8: Array.from(input.signature.R8).map(b => b.toString()),
                therapistSigS: Array.from(input.signature.S).map(b => b.toString())
            };

            // Generate the proof
            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                circuitInput,
                path.join(this.circuitPath, 'SessionDataCircuit.wasm'),
                path.join(this.keyPath, 'session_proving_key.zkey')
            );

            await this.securityAuditService.recordAlert(
                'ZK_PROOF_GENERATED',
                'LOW',
                {
                    sessionId: input.sessionId,
                    startTime: input.startTimestamp,
                    endTime: input.endTimestamp
                }
            );

            return { proof, publicSignals };
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'ZK_PROOF_ERROR',
                'HIGH',
                {
                    sessionId: input.sessionId,
                    error: error.message,
                    component: 'proof_generation'
                }
            );
            throw error;
        }
    }

    private validateInputs(input: SessionProofInput): void {
        if (input.endTimestamp <= input.startTimestamp) {
            throw new Error('End timestamp must be after start timestamp');
        }

        if (input.endTimestamp - input.startTimestamp > this.MAX_SESSION_DURATION) {
            throw new Error('Session duration exceeds maximum allowed time');
        }

        if (input.sessionData.length !== 8) {
            throw new Error('Invalid session data length');
        }

        if (input.metadataFlags.length !== 4) {
            throw new Error('Invalid metadata flags length');
        }

        if (input.therapistCredential.length !== 4) {
            throw new Error('Invalid therapist credential length');
        }
    }

    async verifyProof(
        proof: any,
        publicSignals: any
    ): Promise<boolean> {
        try {
            const vKey = require(path.join(this.keyPath, 'verification_key.json'));
            const isValid = await snarkjs.groth16.verify(
                vKey,
                publicSignals,
                proof
            );

            await this.securityAuditService.recordAlert(
                'ZK_PROOF_VERIFIED',
                'LOW',
                {
                    isValid,
                    signalCount: publicSignals.length,
                    timestamp: Date.now()
                }
            );

            return isValid;
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'ZK_PROOF_VERIFICATION_ERROR',
                'HIGH',
                {
                    error: error.message,
                    component: 'proof_verification'
                }
            );
            throw error;
        }
    }

    async compileCircuit(): Promise<void> {
        try {
            const { exec } = require('child_process');
            const circuitName = 'SessionDataCircuit';
            const circuitPath = path.join(this.circuitPath, `${circuitName}.circom`);

            // Compile circuit
            await new Promise((resolve, reject) => {
                exec(`circom ${circuitPath} --r1cs --wasm --sym`, (error: any) => {
                    if (error) reject(error);
                    else resolve(null);
                });
            });

            await this.securityAuditService.recordAlert(
                'ZK_CIRCUIT_COMPILED',
                'LOW',
                {
                    circuitName,
                    timestamp: Date.now()
                }
            );
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'ZK_CIRCUIT_COMPILATION_ERROR',
                'HIGH',
                {
                    error: error.message,
                    component: 'circuit_compilation'
                }
            );
            throw error;
        }
    }
}
