import { BulletproofsRangeProof, RangeProof as BulletproofData } from './bulletproofs/rangeProof';
import { Point } from './zkProof';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { cpus } from 'os';
import { InnerProductProof } from './bulletproofs/innerProduct';
import * as secp256k1 from '@noble/secp256k1';

// Cache interface for generators
interface GeneratorCache {
    base: Point;
    blinding: Point;
    generators: Map<number, Point>;
}

export interface RangeProofInput {
    value: number;
    min: number;
    max: number;
}

export interface RangeProofData {
    commitment: string;
    proof: string;
    publicInputs: {
        min: number;
        max: number;
    };
}

/**
 * Service for generating and verifying zero-knowledge range proofs using Bulletproofs
 */
export class ZKRangeProofService {
    private static instance: ZKRangeProofService;
    private bulletproofs: BulletproofsRangeProof;
    private generatorCache!: GeneratorCache; // Use definite assignment assertion
    private readonly maxWorkers: number;

    private constructor() {
        // Initialize with 64-bit range proofs by default
        this.bulletproofs = new BulletproofsRangeProof(64, this);
        this.maxWorkers = Math.max(1, Math.floor(cpus().length / 2)); // Use half of available CPUs
        this.initializeGeneratorCache();
    }

    private initializeGeneratorCache(): void {
        this.generatorCache = {
            base: Point.BASE,
            blinding: this.bulletproofs['getBlindingGenerator'](),
            generators: new Map()
        };
    }

    public static getInstance(): ZKRangeProofService {
        if (!ZKRangeProofService.instance) {
            ZKRangeProofService.instance = new ZKRangeProofService();
        }
        return ZKRangeProofService.instance;
    }

    /**
     * Generate a Bulletproof range proof for a value
     */
    public async generateRangeProof(input: RangeProofInput): Promise<RangeProofData> {
        try {
            // Validate input range first
            this.validateRange(input);

            // Generate random blinding factor
            const blindingFactor = this.generateRandomScalar();

            try {
                // Generate Bulletproof
                const proof = await this.bulletproofs.prove([BigInt(input.value)], [blindingFactor]);

                // Create commitment
                const commitment = Point.BASE.multiply(BigInt(input.value))
                    .add(this.bulletproofs['getBlindingGenerator']().multiply(blindingFactor));

                // Serialize the proof
                return {
                    commitment: commitment.toHex(),
                    proof: this.serializeBulletproof(proof),
                    publicInputs: {
                        min: input.min,
                        max: input.max
                    }
                };
            } catch (error) {
                console.error('Error in Bulletproof generation:', error);
                throw error; // Propagate the original error
            }
        } catch (error) {
            console.error('Error generating range proof:', error);
            throw error; // Propagate validation errors
        }
    }

    /**
     * Verify a Bulletproof range proof
     */
    public async verifyRangeProof(proofData: RangeProofData): Promise<boolean> {
        try {
            // Verify the proof is properly formatted
            this.validateProofData(proofData);

            // Parse the commitment and proof
            const commitment = Point.fromHex(proofData.commitment);
            const proof = this.deserializeBulletproof(proofData.proof);

            // Verify the Bulletproof
            return await this.bulletproofs.verify(proof, commitment);
        } catch (error) {
            console.error('Error verifying range proof:', error);
            return false;
        }
    }

    /**
     * Generate an aggregated range proof for multiple values with optimized performance
     */
    public async generateAggregatedProof(inputs: RangeProofInput[]): Promise<RangeProofData> {
        try {
            if (inputs.length === 0) {
                throw new Error('No proofs to aggregate');
            }

            // Validate all inputs first
            inputs.forEach(this.validateRange);

            try {
                // Sort and group inputs by range for optimal aggregation
                const groupedInputs = this.groupInputsByRange(inputs);
                
                // Process each group in parallel
                const groupResults = await Promise.all(
                    groupedInputs.map(group => this.processInputGroup(group))
                );

                // Combine group results
                const allCommitments: Point[] = [];
                const allProofs: BulletproofData[] = [];
                let globalMin = Infinity;
                let globalMax = -Infinity;

                groupResults.forEach(result => {
                    allCommitments.push(...result.commitments);
                    allProofs.push(result.proof);
                    globalMin = Math.min(globalMin, result.min);
                    globalMax = Math.max(globalMax, result.max);
                });

                // Aggregate the proofs
                const aggregatedProof = await this.aggregateProofs(allProofs);

                return {
                    commitment: allCommitments.map(c => c.toHex()).join(','),
                    proof: this.serializeBulletproof(aggregatedProof),
                    publicInputs: {
                        min: globalMin,
                        max: globalMax
                    }
                };
            } catch (error) {
                console.error('Error in proof aggregation:', error);
                throw error; // Propagate the original error
            }
        } catch (error) {
            console.error('Error generating aggregated range proof:', error);
            throw error; // Propagate validation errors
        }
    }

    /**
     * Verify an aggregated range proof with optimized batch verification
     */
    public async verifyAggregatedProof(proofData: RangeProofData): Promise<boolean> {
        try {
            this.validateProofData(proofData);

            const commitments = proofData.commitment
                .split(',')
                .map(c => Point.fromHex(c));
            const proof = this.deserializeBulletproof(proofData.proof);

            // Split verification across multiple workers for large batches
            if (commitments.length > this.maxWorkers) {
                return await this.parallelVerification(proof, commitments);
            }

            // Verify the aggregated proof with all commitments
            // Use the verify method with an array of commitments
            return await this.bulletproofs.verify(proof, commitments);
        } catch (error) {
            console.error('Error verifying aggregated range proof:', error);
            return false;
        }
    }

    private groupInputsByRange(inputs: RangeProofInput[]): RangeProofInput[][] {
        // Sort inputs by max value
        const sortedInputs = [...inputs].sort((a, b) => a.max - b.max);
        
        // Group inputs with similar ranges together
        const groups: RangeProofInput[][] = [];
        let currentGroup: RangeProofInput[] = [];
        let currentMax = -1;

        for (const input of sortedInputs) {
            if (currentMax === -1 || input.max <= currentMax * 2) {
                currentGroup.push(input);
            } else {
                groups.push(currentGroup);
                currentGroup = [input];
            }
            currentMax = input.max;
        }

        if (currentGroup.length > 0) {
            groups.push(currentGroup);
        }

        return groups;
    }

    private async processInputGroup(inputs: RangeProofInput[]): Promise<{
        commitments: Point[];
        proof: BulletproofData;
        min: number;
        max: number;
    }> {
        const maxBitSize = Math.ceil(Math.log2(Math.max(...inputs.map(i => i.max))));
        if (maxBitSize > 64) {
            throw new Error('Values too large for aggregation');
        }

        const blindingFactors = inputs.map(() => this.generateRandomScalar());
        
        // Create commitments using cached generators
        const commitments = await Promise.all(
            inputs.map((input, i) => this.createCommitment(BigInt(input.value), blindingFactors[i]))
        );

        const proof = await this.bulletproofs.prove(
            inputs.map(input => BigInt(input.value)),
            blindingFactors
        );

        return {
            commitments,
            proof,
            min: Math.min(...inputs.map(i => i.min)),
            max: Math.max(...inputs.map(i => i.max))
        };
    }

    private async parallelVerification(proof: BulletproofData, commitments: Point[]): Promise<boolean> {
        const chunkSize = Math.ceil(commitments.length / this.maxWorkers);
        const chunks = Array.from({ length: Math.ceil(commitments.length / chunkSize) }, (_, i) =>
            commitments.slice(i * chunkSize, (i + 1) * chunkSize)
        );

        const results = await Promise.all(
            chunks.map(chunk => this.verifyInWorker(proof, chunk))
        );

        return results.every(result => result);
    }

    private async verifyInWorker(proof: BulletproofData, commitments: Point[]): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const worker = new Worker(__filename, {
                workerData: { proof, commitments }
            });

            worker.on('message', resolve);
            worker.on('error', reject);
            worker.on('exit', code => {
                if (code !== 0) {
                    reject(new Error(`Worker stopped with exit code ${code}`));
                }
            });
        });
    }

    private createCommitment(value: bigint, blindingFactor: bigint): Point {
        try {
            const modulus = secp256k1.CURVE.n;
            
            // Ensure inputs are BigInt and validate
            if (typeof value !== 'bigint' || typeof blindingFactor !== 'bigint') {
                throw new Error('Value and blinding factor must be BigInt');
            }

            // Normalize to positive values within valid range
            const validValue = ((value % modulus) + modulus) % modulus;
            const validBlinding = ((blindingFactor % modulus) + modulus) % modulus;

            // Get cached generators with validation
            const basePoint = this.generatorCache.base;
            const blindingPoint = this.getCachedGenerator(0);

            if (!basePoint || !blindingPoint) {
                throw new Error('Invalid generator points');
            }

            // Create commitment with validated scalars
            const valueCommitment = basePoint.multiply(validValue);
            if (!valueCommitment) {
                throw new Error('Failed to create value commitment');
            }

            const blindingCommitment = blindingPoint.multiply(validBlinding);
            if (!blindingCommitment) {
                throw new Error('Failed to create blinding commitment');
            }

            const commitment = valueCommitment.add(blindingCommitment);
            if (!commitment) {
                throw new Error('Failed to combine commitments');
            }

            return commitment;
        } catch (error: unknown) {
            console.error('Error creating commitment:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to create commitment: ${errorMessage}`);
        }
    }

    private getCachedGenerator(index: number): Point {
        const normalizedIndex = index % 1000; // Keep index small
        if (!this.generatorCache.generators.has(normalizedIndex)) {
            const basePoint = this.generatorCache.base;
            const scalar = BigInt(normalizedIndex + 1);
            this.generatorCache.generators.set(
                normalizedIndex,
                basePoint.multiply(scalar)
            );
        }
        return this.generatorCache.generators.get(normalizedIndex)!;
    }

    private async aggregateProofs(proofs: BulletproofData[]): Promise<BulletproofData> {
        if (proofs.length === 0) {
            throw new Error('No proofs to aggregate');
        }
        if (proofs.length === 1) {
            return proofs[0];
        }

        // Determine optimal batch size based on available CPU cores
        const batchSize = Math.max(1, Math.floor(proofs.length / this.maxWorkers));
        const batches: BulletproofData[][] = [];
        
        // Split proofs into batches
        for (let i = 0; i < proofs.length; i += batchSize) {
            batches.push(proofs.slice(i, i + batchSize));
        }

        try {
            // Process batches in parallel
            const batchResults = await Promise.all(
                batches.map(async batch => {
                    // Aggregate points within each batch
                    const aggregatedA = this.aggregatePoints(batch.map(p => p.A));
                    const aggregatedS = this.aggregatePoints(batch.map(p => p.S));
                    const aggregatedT1 = this.aggregatePoints(batch.map(p => p.T1));
                    const aggregatedT2 = this.aggregatePoints(batch.map(p => p.T2));
                    
                    // Combine challenges
                    const combinedTaux = batch.reduce(
                        (acc, p) => (acc + p.taux) % secp256k1.CURVE.n,
                        BigInt(0)
                    );
                    const combinedMu = batch.reduce(
                        (acc, p) => (acc + p.mu) % secp256k1.CURVE.n,
                        BigInt(0)
                    );
                    
                    // Aggregate inner product proofs
                    const innerProductProofs = batch.map(p => p.innerProductProof);
                    const aggregatedInnerProduct = await this.aggregateInnerProductProofs(innerProductProofs);

                    return {
                        A: aggregatedA,
                        S: aggregatedS,
                        T1: aggregatedT1,
                        T2: aggregatedT2,
                        taux: combinedTaux,
                        mu: combinedMu,
                        innerProductProof: aggregatedInnerProduct
                    };
                })
            );

            // Final aggregation of batch results
            const finalProof: BulletproofData = {
                A: this.aggregatePoints(batchResults.map(r => r.A)),
                S: this.aggregatePoints(batchResults.map(r => r.S)),
                T1: this.aggregatePoints(batchResults.map(r => r.T1)),
                T2: this.aggregatePoints(batchResults.map(r => r.T2)),
                taux: batchResults.reduce(
                    (acc, r) => (acc + r.taux) % secp256k1.CURVE.n,
                    BigInt(0)
                ),
                mu: batchResults.reduce(
                    (acc, r) => (acc + r.mu) % secp256k1.CURVE.n,
                    BigInt(0)
                ),
                innerProductProof: await this.aggregateInnerProductProofs(
                    batchResults.map(r => r.innerProductProof)
                )
            };

            return finalProof;
        } catch (error) {
            console.error('Error in proof aggregation:', error);
            throw new Error('Failed to aggregate proofs');
        }
    }

    private aggregatePoints(points: Point[]): Point {
        return points.reduce((sum, point) => sum.add(point), Point.ZERO);
    }

    private async aggregateInnerProductProofs(proofs: InnerProductProof[]): Promise<InnerProductProof> {
        // Aggregate L and R vectors
        const maxLength = Math.max(...proofs.map(p => p.L.length));
        const L_aggregated: string[] = new Array(maxLength);
        const R_aggregated: string[] = new Array(maxLength);

        // For each position in L and R vectors
        for (let i = 0; i < maxLength; i++) {
            const L_points = proofs
                .filter(p => i < p.L.length)
                .map(p => Point.fromHex(p.L[i]));
            const R_points = proofs
                .filter(p => i < p.R.length)
                .map(p => Point.fromHex(p.R[i]));

            L_aggregated[i] = this.aggregatePoints(L_points).toHex();
            R_aggregated[i] = this.aggregatePoints(R_points).toHex();
        }

        // Combine final a and b values
        const a_values = proofs.map(p => BigInt(p.a));
        const b_values = proofs.map(p => BigInt(p.b));

        const a_aggregated = a_values.reduce(
            (sum, val) => (sum + val) % (1n << 256n), 0n
        );
        const b_aggregated = b_values.reduce(
            (sum, val) => (sum + val) % (1n << 256n), 0n
        );

        return {
            L: L_aggregated,
            R: R_aggregated,
            a: a_aggregated.toString(),
            b: b_aggregated.toString()
        };
    }

    private validateRange(input: RangeProofInput): void {
        if (typeof input.value !== 'number' || !Number.isInteger(input.value)) {
            throw new Error('Value must be an integer');
        }
        if (typeof input.min !== 'number' || !Number.isInteger(input.min)) {
            throw new Error('Minimum must be an integer');
        }
        if (typeof input.max !== 'number' || !Number.isInteger(input.max)) {
            throw new Error('Maximum must be an integer');
        }
        if (input.min >= input.max) {
            throw new Error('Minimum must be less than maximum');
        }
        if (input.value < input.min || input.value > input.max) {
            throw new Error('Value must be within range');
        }
    }

    private validateProofData(proofData: RangeProofData): void {
        if (!proofData.commitment || typeof proofData.commitment !== 'string') {
            throw new Error('Invalid commitment');
        }
        if (!proofData.proof || typeof proofData.proof !== 'string') {
            throw new Error('Invalid proof');
        }
        if (!proofData.publicInputs || 
            typeof proofData.publicInputs.min !== 'number' || 
            typeof proofData.publicInputs.max !== 'number') {
            throw new Error('Invalid public inputs');
        }
    }

    private generateRandomScalar(): bigint {
        const randomBytes = new Uint8Array(32);
        crypto.getRandomValues(randomBytes);
        return BigInt('0x' + Buffer.from(randomBytes).toString('hex')) % (1n << 256n);
    }

    private serializeBulletproof(proof: BulletproofData): string {
        return Buffer.from(JSON.stringify(proof)).toString('base64');
    }

    private deserializeBulletproof(serializedProof: string): BulletproofData {
        return JSON.parse(Buffer.from(serializedProof, 'base64').toString());
    }
}

// Worker thread code
if (!isMainThread) {
    const { proof, commitments } = workerData;
    const zkRangeProofService = ZKRangeProofService.getInstance();
    const bulletproofs = new BulletproofsRangeProof(64, zkRangeProofService);
    
    (async () => {
        try {
            // Use verify instead of verifyBatch
            const result = await bulletproofs.verify(proof, commitments);
            parentPort?.postMessage(result);
        } catch (error) {
            parentPort?.postMessage(false);
        }
    })();
}

export default ZKRangeProofService; 