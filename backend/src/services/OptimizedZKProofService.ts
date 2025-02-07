import { Worker } from 'worker_threads';
import path from 'path';
import crypto from 'crypto';
import LRU from 'lru-cache';
import { SecurityAuditService } from "./SecurityAuditService";
import { VerificationKeyService } from "./VerificationKeyService";
import { ProofGenerationInput, ProofOutput, ZKUtils } from "../zk/types";

interface ProofResult {
    error?: string;
    proof?: string;
}

interface VerificationResult {
    error?: string;
    isValid?: boolean;
}

interface CacheEntry {
    proof: string;
    timestamp: number;
}

export class OptimizedZKProofService {
    private readonly proofCache: LRU<string, CacheEntry>;
    private readonly workerPool: Worker[] = [];
    private readonly workerMetrics: Map<number, WorkerPoolMetrics>;
    private readonly maxWorkers: number;
    private currentWorker = 0;
    private isInitialized = false;
    private proofWorker: Worker;
    private verificationWorker: Worker;

    constructor(private readonly verificationKeyService: VerificationKeyService, private readonly securityAuditService: SecurityAuditService, maxWorkers = 4, maxCacheSize = 1000, private readonly cacheTTL = 3600000 // 1 hour
    ) {
        this.maxWorkers = maxWorkers;
        this.workerMetrics = new Map();
        this.proofCache = new LRU({
            max: maxCacheSize,
            ttl: cacheTTL,
            updateAgeOnGet: true,
            dispose: (key: unknown, value: unknown) => {
                this.handleCacheDisposal(key, value as CacheEntry);
            }
        });
        this.proofWorker = new Worker(path.join(__dirname, '../workers/proof.worker.js'));
        this.verificationWorker = new Worker(path.join(__dirname, '../workers/verify.worker.js'));
    }

    async initialize(): Promise<void> {
        if (this.isInitialized)
            return;
        try {
            await this.initializeWorkerPool();
            this.isInitialized = true;
            await this.securityAuditService.recordAlert('ZK_SERVICE_INITIALIZED', 'LOW', { maxWorkers: this.maxWorkers });
        }
        catch (error) {
            await this.securityAuditService.recordAlert('ZK_SERVICE_INIT_ERROR', 'HIGH', { error: error instanceof Error ? error.message : 'Unknown error' });
            throw error;
        }
    }

    private async initializeWorkerPool(): Promise<void> {
        const workerScript = path.join(__dirname, '../workers/proof.worker.js');
        for (let i = 0; i < this.maxWorkers; i++) {
            const worker = new Worker(workerScript);
            worker.on('error', this.handleWorkerError.bind(this));
            this.workerPool.push(worker);
            this.workerMetrics.set(i, {
                totalProofsGenerated: 0,
                averageProofTime: 0,
                currentLoad: 0,
                errorRate: 0
            });
        }
    }

    private async handleWorkerError(error: Error, workerId: number): Promise<void> {
        const metrics = this.workerMetrics.get(workerId);
        if (metrics) {
            metrics.errorRate = (metrics.errorRate * metrics.totalProofsGenerated + 1) /
                (metrics.totalProofsGenerated + 1);
        }
        await this.securityAuditService.recordAlert('WORKER_ERROR', 'HIGH', {
            error: error.message,
            workerId,
            metrics: metrics || 'No metrics available'
        });
    }

    private getOptimalWorker(): {
        worker: Worker;
        workerId: number;
    } {
        // Simple round-robin for now, but can be enhanced with load balancing
        const workerId = this.currentWorker;
        const worker = this.workerPool[workerId];
        this.currentWorker = (this.currentWorker + 1) % this.maxWorkers;
        return { worker, workerId };
    }

    private calculateInputHash(input: ProofGenerationInput): string {
        const normalizedInput = {
            sessionId: input.sessionId,
            startTimestamp: input.startTimestamp,
            endTimestamp: input.endTimestamp,
            sessionData: input.sessionData,
            metadata: input.metadata,
            therapistCredential: input.therapistCredential
        };
        return crypto.createHash('sha256')
            .update(JSON.stringify(normalizedInput))
            .digest('hex');
    }

    private handleCacheDisposal(key: string, value: CacheEntry): void {
        this.securityAuditService.recordAlert(
            'PROOF_CACHE_DISPOSAL',
            'LOW',
            {
                key,
                proofAge: Date.now() - value.timestamp
            }
        );
    }

    async generateProof(input: ProofGenerationInput): Promise<ProofOutput> {
        if (!this.isInitialized) {
            await this.initialize();
        }
        const startTime = Date.now();
        const inputHash = this.calculateInputHash(input);
        try {
            // Check cache first
            const cachedProof = this.proofCache.get(inputHash);
            if (cachedProof) {
                await this.securityAuditService.recordAlert('PROOF_CACHE_HIT', 'LOW', {
                    inputHash,
                    proofAge: Date.now() - cachedProof.timestamp
                });
                return { proof: cachedProof.proof } as ProofOutput;
            }
            // Prepare circuit input
            const circuitInput = await ZKUtils.prepareCircuitInput(input);
            // Get optimal worker
            const { worker, workerId } = this.getOptimalWorker();
            const metrics = this.workerMetrics.get(workerId)!;
            metrics.currentLoad++;
            // Generate proof in parallel
            const proof = await new Promise<ProofOutput>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Proof generation timeout'));
                }, 30000); // 30 second timeout
                worker.once('message', (result: ProofResult) => {
                    clearTimeout(timeout);
                    if (result.error) {
                        reject(new Error(result.error));
                    }
                    else {
                        if (!result.proof) {
                            reject(new Error('No proof generated'));
                        }
                        else {
                            // Cache the result
                            this.proofCache.set(inputHash, {
                                proof: result.proof,
                                timestamp: Date.now()
                            });
                            resolve({ proof: result.proof });
                        }
                    }
                });
                worker.once('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
                worker.postMessage({
                    type: 'generate',
                    input: circuitInput,
                    wasmPath: path.join(__dirname, '../zk/build/SessionDataCircuit.wasm'),
                    zkeyPath: path.join(__dirname, '../zk/keys/SessionDataCircuit.zkey')
                });
            });
            // Update metrics
            metrics.currentLoad--;
            metrics.totalProofsGenerated++;
            metrics.averageProofTime = (metrics.averageProofTime * (metrics.totalProofsGenerated - 1) +
                (Date.now() - startTime)) / metrics.totalProofsGenerated;
            await this.securityAuditService.recordAlert('PROOF_GENERATED', 'LOW', {
                inputHash,
                duration: Date.now() - startTime,
                workerId,
                metrics
            });
            return proof;
        }
        catch (error) {
            await this.securityAuditService.recordAlert('PROOF_GENERATION_ERROR', 'HIGH', {
                inputHash,
                error: error instanceof Error ? error.message : 'Unknown error',
                duration: Date.now() - startTime
            });
            throw error;
        }
    }

    async verifyProof(proof: ProofOutput): Promise<boolean> {
        if (!this.isInitialized) {
            await this.initialize();
        }
        const startTime = Date.now();
        const proofHash = crypto.createHash('sha256')
            .update(JSON.stringify(proof))
            .digest('hex');
        try {
            // Get current verification key
            const vKey = await this.verificationKeyService.getCurrentKey('system');
            // Get optimal worker
            const { worker, workerId } = this.getOptimalWorker();
            // Verify the proof in parallel
            const isValid = await new Promise<boolean>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Proof verification timeout'));
                }, 15000); // 15 second timeout
                worker.once('message', (result: VerificationResult) => {
                    clearTimeout(timeout);
                    if (result.error) {
                        reject(new Error(result.error));
                    }
                    else {
                        if (result.isValid === undefined) {
                            reject(new Error('Invalid verification result'));
                        }
                        else {
                            resolve(result.isValid);
                        }
                    }
                });
                worker.once('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
                worker.postMessage({
                    type: 'verify',
                    proof,
                    vKey
                });
            });
            const duration = Date.now() - startTime;
            await this.securityAuditService.recordAlert('PROOF_VERIFIED', 'LOW', {
                proofHash,
                isValid,
                duration,
                workerId
            });
            return isValid;
        }
        catch (error) {
            await this.securityAuditService.recordAlert('PROOF_VERIFICATION_ERROR', 'HIGH', {
                proofHash,
                error: error instanceof Error ? error.message : 'Unknown error',
                duration: Date.now() - startTime
            });
            throw error;
        }
    }

    async getMetrics(): Promise<Map<number, WorkerPoolMetrics>> {
        return new Map(this.workerMetrics);
    }

    async cleanup(): Promise<void> {
        // Cleanup worker pool
        await Promise.all(this.workerPool.map(worker => worker.terminate()));
        this.workerPool.length = 0;
        this.workerMetrics.clear();
        // Clear cache
        this.proofCache.clear();
        this.isInitialized = false;
        await this.securityAuditService.recordAlert('ZK_SERVICE_CLEANUP', 'LOW', { timestamp: Date.now() });
        try {
            await Promise.all([
                this.proofWorker.terminate(),
                this.verificationWorker.terminate()
            ]);
        } catch (error) {
            await this.securityAuditService.recordAlert(
                'ZK_SERVICE_CLEANUP_ERROR',
                'HIGH',
                {
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
            );
            throw error;
        }
    }
}
