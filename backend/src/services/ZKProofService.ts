import { SecurityAuditService } from "./SecurityAuditService";
import { VerificationKeyService } from "./VerificationKeyService";
import * as snarkjs from 'snarkjs';
import * as path from 'path';
import * as fs from 'fs/promises';
import crypto from 'crypto';
import { Worker } from 'worker_threads';
interface ProofInput {
    sessionId: string;
    startTimestamp: number;
    endTimestamp: number;
    therapistPubKey: string[];
    therapistCredentialHash: string;
    maxSessionDuration: number;
    minSessionDuration: number;
    currentTimestamp: number;
    sessionData: number[];
    therapistSigR8: string[];
    therapistSigS: string[];
    therapistCredential: number[];
    metadataFlags: number[];
    encryptionNonce: string;
    previousSessionHash: string;
}
interface ProofOutput {
    proof: any;
    publicSignals: string[];
}
interface ProofVerificationResult {
    isValid: boolean;
    error?: string;
}
export class ZKProofService {
    private readonly circuitPath: string;
    private readonly workerPool: Worker[] = [];
    private readonly maxWorkers = 4;
    constructor(private readonly securityAuditService: SecurityAuditService, private readonly verificationKeyService: VerificationKeyService) {
        this.circuitPath = path.join(__dirname, '../zk/circuits/SessionDataCircuit.wasm');
    }
    async initialize(): Promise<void> {
        try {
            // Initialize worker pool
            for (let i = 0; i < this.maxWorkers; i++) {
                const worker = new Worker(path.join(__dirname, '../zk/workers/proof-worker.js'));
                this.workerPool.push(worker);
            }
            await this.verificationKeyService.initialize();
        }
        catch (error) {
            await this.securityAuditService.recordAlert('ZK_SERVICE_INIT_ERROR', 'HIGH', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async generateProof(input: ProofInput): Promise<ProofOutput> {
        try {
            // Validate input
            this.validateProofInput(input);
            // Get available worker
            const worker = await this.getAvailableWorker();
            // Generate proof using worker
            const proof = await new Promise<ProofOutput>((resolve, reject) => {
                worker.once('message', (result: unknown) => {
                    if (result.error) {
                        reject(new Error(result.error));
                    }
                    else {
                        resolve(result as ProofOutput);
                    }
                });
                worker.postMessage({
                    type: 'generate',
                    input,
                    circuitPath: this.circuitPath
                });
            });
            await this.securityAuditService.recordAlert('PROOF_GENERATED', 'LOW', {
                sessionId: input.sessionId,
                timestamp: input.currentTimestamp
            });
            return proof;
        }
        catch (error) {
            await this.securityAuditService.recordAlert('PROOF_GENERATION_ERROR', 'HIGH', {
                error: error instanceof Error ? error.message : 'Unknown error',
                sessionId: input.sessionId
            });
            throw error;
        }
    }
    async verifyProof(proof: any, publicSignals: string[]): Promise<ProofVerificationResult> {
        try {
            const verificationKey = await this.verificationKeyService.getCurrentKey();
            const isValid = await snarkjs.groth16.verify(verificationKey, publicSignals, proof);
            await this.securityAuditService.recordAlert('PROOF_VERIFIED', 'LOW', {
                isValid,
                timestamp: Date.now()
            });
            return { isValid };
        }
        catch (error) {
            await this.securityAuditService.recordAlert('PROOF_VERIFICATION_ERROR', 'HIGH', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                isValid: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    private validateProofInput(input: ProofInput): void {
        const now = Math.floor(Date.now() / 1000);
        // Validate timestamps
        if (input.startTimestamp > input.endTimestamp) {
            throw new Error('Start timestamp must be before end timestamp');
        }
        if (input.endTimestamp - input.startTimestamp > input.maxSessionDuration) {
            throw new Error('Session duration exceeds maximum allowed duration');
        }
        if (input.endTimestamp - input.startTimestamp < input.minSessionDuration) {
            throw new Error('Session duration is less than minimum required duration');
        }
        if (Math.abs(input.currentTimestamp - now) > 3600) {
            throw new Error('Current timestamp is too far from actual time');
        }
        // Validate arrays
        if (input.therapistPubKey.length !== 256) {
            throw new Error('Invalid therapist public key length');
        }
        if (input.sessionData.length !== 8) {
            throw new Error('Invalid session data length');
        }
        if (input.metadataFlags.length !== 4) {
            throw new Error('Invalid metadata flags length');
        }
        // Validate nonce
        if (!input.encryptionNonce || input.encryptionNonce === '0') {
            throw new Error('Invalid encryption nonce');
        }
        // Validate previous session hash
        if (!input.previousSessionHash) {
            throw new Error('Missing previous session hash');
        }
    }
    private async getAvailableWorker(): Promise<Worker> {
        // Simple round-robin worker selection
        const worker = this.workerPool.shift();
        if (!worker) {
            throw new Error('No workers available');
        }
        this.workerPool.push(worker);
        return worker;
    }
    async cleanup(): Promise<void> {
        try {
            // Terminate all workers
            await Promise.all(this.workerPool.map(worker => worker.terminate()));
            this.workerPool.length = 0;
        }
        catch (error) {
            await this.securityAuditService.recordAlert('ZK_SERVICE_CLEANUP_ERROR', 'HIGH', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
}
