import { Worker } from 'worker_threads';
import path from 'path';
import crypto from 'crypto';
import { LRUCache } from 'lru-cache';
import { SecurityAuditService } from "./SecurityAuditService";
import { VerificationKeyService } from "./VerificationKeyService";
import { ProofGenerationInput, ProofOutput, ZKUtils } from "@/zk/types";

interface ProofResult {
    error?: string;
    proof?: string;
}

interface VerificationResult {
    error?: string;
    isValid?: boolean;
}

interface WorkerPoolMetrics {
    currentLoad: number;
    totalProofsGenerated: number;
    averageProofTime: number;
    errorRate: number;
}

interface CacheEntry {
    proof: string;
    publicSignals: any[];
    timestamp: number;
}

export class OptimizedZKProofService {
    private readonly proofCache: LRUCache<string, CacheEntry>;
    private readonly workerPool: Worker[];
    private readonly metrics: WorkerPoolMetrics;
    private nextWorkerId: number = 0;
    private isInitialized = false;
    private proofWorker: Worker;
    private verificationWorker: Worker;

    constructor(
        private readonly securityAuditService: SecurityAuditService,
        private readonly verificationKeyService: VerificationKeyService,
        maxWorkers: number = 4,
        maxCacheSize: number = 1000
    ) {
        this.proofCache = new LRUCache<string, CacheEntry>({
            max: maxCacheSize,
            ttl: 1000 * 60 * 60, // 1 hour
            updateAgeOnGet: true,
            updateAgeOnHas: true
        });

        this.workerPool = Array.from({ length: maxWorkers }, () =>
            new Worker(path.join(__dirname, '../workers/zkProofWorker.js'))
        );

        this.metrics = {
            currentLoad: 0,
            totalProofsGenerated: 0,
            averageProofTime: 0,
            errorRate: 0
        };

        this.proofWorker = new Worker(path.join(__dirname, '../workers/proof.worker.js'));
        this.verificationWorker = new Worker(path.join(__dirname, '../workers/verify.worker.js'));

        this.setupWorkerErrorHandling();
    }

    async initialize(): Promise<void> {
        if (this.isInitialized)
            return;
        try {
            await this.securityAuditService.recordAlert('ZK_SERVICE_INITIALIZED', 'LOW', { maxWorkers: this.workerPool.length });
            this.isInitialized = true;
        }
        catch (error) {
            await this.securityAuditService.recordAlert('ZK_SERVICE_INIT_ERROR', 'HIGH', { error: error instanceof Error ? error.message : 'Unknown error' });
            throw error;
        }
    }

    private setupWorkerErrorHandling(): void {
        this.workerPool.forEach((worker, workerId) => {
            worker.on('error', (error) => {
                this.metrics.errorRate = (this.metrics.errorRate * this.metrics.totalProofsGenerated + 1) /
                    (this.metrics.totalProofsGenerated + 1);
                this.securityAuditService.recordAlert('WORKER_ERROR', 'HIGH', {
                    error: error.message,
                    workerId,
                    metrics: this.metrics
                });
            });
        });
    }

    private getOptimalWorker(): {
        worker: Worker;
        workerId: number;
    } {
        // Simple round-robin for now, but can be enhanced with load balancing
        const workerId = this.nextWorkerId;
        const worker = this.workerPool[workerId];
        this.nextWorkerId = (this.nextWorkerId + 1) % this.workerPool.length;
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
            this.metrics.currentLoad++;
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
            this.metrics.currentLoad--;
            this.metrics.totalProofsGenerated++;
            this.metrics.averageProofTime = (this.metrics.averageProofTime * (this.metrics.totalProofsGenerated - 1) +
                (Date.now() - startTime)) / this.metrics.totalProofsGenerated;
            await this.securityAuditService.recordAlert('PROOF_GENERATED', 'LOW', {
                inputHash,
                duration: Date.now() - startTime,
                workerId,
                metrics: this.metrics
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

    async getMetrics(): Promise<WorkerPoolMetrics> {
        return this.metrics;
    }

    async cleanup(): Promise<void> {
        // Cleanup worker pool
        await Promise.all(this.workerPool.map((worker: any) => worker.terminate()));
        this.workerPool.length = 0;
        this.metrics.currentLoad = 0;
        this.metrics.totalProofsGenerated = 0;
        this.metrics.averageProofTime = 0;
        this.metrics.errorRate = 0;
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
