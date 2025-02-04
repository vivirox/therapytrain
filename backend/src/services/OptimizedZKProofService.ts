import * as snarkjs from 'snarkjs';
import { Worker } from 'worker_threads';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { VerificationKeyService } from './VerificationKeyService';
import { SecurityAuditService } from './SecurityAuditService';
import LRU from 'lru-cache';

interface ProofInput {
    sessionData: any;
    therapistSignature: string;
}

interface ProofOutput {
    proof: any;
    publicSignals: any[];
}

interface CachedProof {
    proof: ProofOutput;
    timestamp: number;
    inputHash: string;
}

export class OptimizedZKProofService {
    private readonly proofCache: LRU<string, CachedProof>;
    private readonly workerPool: Worker[] = [];
    private readonly maxWorkers: number;
    private currentWorker = 0;

    constructor(
        private verificationKeyService: VerificationKeyService,
        private securityAuditService: SecurityAuditService,
        maxWorkers = 4,
        maxCacheSize = 1000,
        private cacheTTL = 3600000 // 1 hour
    ) {
        this.maxWorkers = maxWorkers;
        this.initializeWorkerPool();

        this.proofCache = new LRU({
            max: maxCacheSize,
            ttl: cacheTTL,
            updateAgeOnGet: true
        });
    }

    private initializeWorkerPool() {
        const workerScript = path.join(__dirname, '../workers/proof.worker.js');
        for (let i = 0; i < this.maxWorkers; i++) {
            const worker = new Worker(workerScript);
            worker.on('error', this.handleWorkerError.bind(this));
            this.workerPool.push(worker);
        }
    }

    private async handleWorkerError(error: Error) {
        await this.securityAuditService.recordAlert(
            'WORKER_ERROR',
            'HIGH',
            { error: error.message }
        );
    }

    private getNextWorker(): Worker {
        const worker = this.workerPool[this.currentWorker];
        this.currentWorker = (this.currentWorker + 1) % this.maxWorkers;
        return worker;
    }

    private calculateInputHash(input: ProofInput): string {
        return crypto.createHash('sha256')
            .update(JSON.stringify(input))
            .digest('hex');
    }

    async generateProof(input: ProofInput): Promise<ProofOutput> {
        const startTime = Date.now();
        const inputHash = this.calculateInputHash(input);

        try {
            // Check cache first
            const cachedProof = this.proofCache.get(inputHash);
            if (cachedProof) {
                await this.securityAuditService.recordAlert(
                    'PROOF_CACHE_HIT',
                    'LOW',
                    { inputHash, timeSaved: Date.now() - startTime }
                );
                return cachedProof.proof;
            }

            // Get next available worker
            const worker = this.getNextWorker();

            // Generate proof in parallel
            const proof = await new Promise<ProofOutput>((resolve, reject) => {
                worker.once('message', (result) => {
                    if (result.error) {
                        reject(new Error(result.error));
                    } else {
                        resolve(result.proof);
                    }
                });

                worker.postMessage({
                    type: 'generate',
                    input,
                    wasmPath: path.join(__dirname, '../zk/build/SessionDataCircuit.wasm'),
                    zkeyPath: path.join(__dirname, '../zk/keys/SessionDataCircuit.zkey')
                });
            });

            // Cache the result
            this.proofCache.set(inputHash, {
                proof,
                timestamp: Date.now(),
                inputHash
            });

            const duration = Date.now() - startTime;
            await this.securityAuditService.recordAlert(
                'PROOF_GENERATED',
                'LOW',
                { inputHash, duration }
            );

            return proof;
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'PROOF_GENERATION_ERROR',
                'HIGH',
                { inputHash, error: error.message }
            );
            throw error;
        }
    }

    async verifyProof(proof: ProofOutput): Promise<boolean> {
        const startTime = Date.now();
        const proofHash = crypto.createHash('sha256')
            .update(JSON.stringify(proof))
            .digest('hex');

        try {
            // Get current verification key
            const vKey = await this.verificationKeyService.getCurrentKey('system');

            // Verify the proof in parallel
            const worker = this.getNextWorker();
            const isValid = await new Promise<boolean>((resolve, reject) => {
                worker.once('message', (result) => {
                    if (result.error) {
                        reject(new Error(result.error));
                    } else {
                        resolve(result.isValid);
                    }
                });

                worker.postMessage({
                    type: 'verify',
                    proof,
                    vKey
                });
            });

            const duration = Date.now() - startTime;
            await this.securityAuditService.recordAlert(
                'PROOF_VERIFIED',
                'LOW',
                { proofHash, isValid, duration }
            );

            return isValid;
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'PROOF_VERIFICATION_ERROR',
                'HIGH',
                { proofHash, error: error.message }
            );
            throw error;
        }
    }

    async cleanup() {
        // Cleanup worker pool
        await Promise.all(
            this.workerPool.map(worker => worker.terminate())
        );
        this.workerPool.length = 0;

        // Clear cache
        this.proofCache.clear();
    }
}
