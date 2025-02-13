import * as secp256k1 from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { Point } from '../zkProof';
import { InnerProductArgument, InnerProductProof } from './innerProduct';
import { ZKRangeProofService } from './zkRangeProofService';

export interface RangeProof {
    A: string;       // Commitment to aL and aR
    S: string;       // Commitment to sL and sR
    T1: string;      // Commitment to t1
    T2: string;      // Commitment to t2
    taux: string;    // Blinding factor for inner product
    mu: string;      // Blinding factor for A and S
    innerProduct: InnerProductProof;
}

/**
 * Implementation of Bulletproofs range proof protocol
 */
export class BulletproofsRangeProof {
    private innerProduct: InnerProductArgument;
    private n: number;  // Bit size of the range
    private zkRangeProofService: ZKRangeProofService;
    private generatorCache: Map<string, Point>;
    private basePoint: Point;
    private g: Point;
    private h: Point;
    private g_vec: Point[];
    private h_vec: Point[];
    private generatorsInitialized: boolean;

    constructor(bitSize: number = 64, zkRangeProofService: ZKRangeProofService) {
        // Ensure bitSize is a power of 2
        if ((bitSize & (bitSize - 1)) !== 0) {
            throw new Error('Bit size must be a power of 2');
        }
        this.n = bitSize;
        this.innerProduct = new InnerProductArgument(2 * this.n);
        this.zkRangeProofService = zkRangeProofService;
        this.generatorCache = new Map();
        this.basePoint = Point.fromPrivateKey(1n);
        this.generatorsInitialized = false;
    }

    private initializeGenerators(): void {
        try {
            // Create a fixed-size buffer for the seed
            const seedBuffer = new Uint8Array(32);
            
            // Generate deterministic seeds for each generator
            const tempSeed = sha256('noble_secp256k1_bulletproofs_v1');
            const seedData = new Uint8Array(Buffer.from(tempSeed, 'hex'));
            seedBuffer.set(seedData.slice(0, 32));

            // Initialize base generator G
            const g = Point.BASE;
            if (!this.validatePoint(g)) {
                throw new Error('Failed to validate base generator G');
            }
            this.g = g;

            // Generate h using the seed
            const scalar = this.normalizeScalar(seedBuffer);
            const h = g.multiply(scalar);
            if (!this.validatePoint(h)) {
                throw new Error('Failed to validate generator H');
            }
            this.h = h;

            // Generate vector generators
            this.g_vec = [];
            this.h_vec = [];
            
            for (let i = 0; i < this.n; i++) {
                // Update seed for each generator
                const g_seed = new Uint8Array(seedBuffer);
                const h_seed = new Uint8Array(seedBuffer);
                g_seed[0] = i;
                h_seed[0] = i + 128; // Offset for h vector to ensure different seeds
                
                const g_scalar = this.normalizeScalar(g_seed);
                const h_scalar = this.normalizeScalar(h_seed);
                
                const g_i = g.multiply(g_scalar);
                const h_i = g.multiply(h_scalar);
                
                if (!this.validatePoint(g_i) || !this.validatePoint(h_i)) {
                    throw new Error(`Failed to validate vector generators at index ${i}`);
                }
                
                this.g_vec.push(g_i);
                this.h_vec.push(h_i);
            }

            // Verify all generators are initialized
            if (!this.g || !this.h || this.g_vec.length !== this.n || this.h_vec.length !== this.n) {
                throw new Error('Generator initialization incomplete');
            }

            this.generatorsInitialized = true;
        } catch (error) {
            console.error('Generator initialization failed:', error);
            throw new Error(`Failed to initialize generators: ${error.message}`);
        }
    }

    private normalizeScalar(bytes: Uint8Array): bigint {
        const scalar = bytesToNumberBE(bytes) % secp256k1.CURVE.n;
        if (scalar === BigInt(0)) {
            throw new Error('Invalid scalar: zero');
        }
        return scalar;
    }

    private validateScalar(scalar: bigint): bigint {
        if (typeof scalar !== 'bigint') {
            throw new Error('Input must be BigInt');
        }
        // Ensure positive and within valid range
        const modulus = secp256k1.CURVE.n;
        let validScalar = scalar % modulus;
        if (validScalar < 0n) {
            validScalar += modulus;
        }
        return validScalar;
    }

    private validatePoint(point: Point): boolean {
        try {
            // Check if point is an instance of Point
            if (!(point instanceof Point)) {
                throw new Error('Invalid point: not a Point instance');
            }

            // Check if point coordinates are valid field elements
            const { x, y } = point.toAffine();
            if (!this.isValidFieldElement(x) || !this.isValidFieldElement(y)) {
                throw new Error('Invalid point: coordinates not in valid field range');
            }

            // Verify point is on the curve: y^2 = x^3 + 7 (secp256k1 curve equation)
            const p = secp256k1.CURVE.p;
            const ySquared = (y * y) % p;
            const xCubed = (x * x * x) % p;
            const seven = BigInt(7);
            if (ySquared !== (xCubed + seven) % p) {
                throw new Error('Invalid point: not on the curve');
            }

            // Verify point order (cofactor check)
            const n = secp256k1.CURVE.n;
            const multiplied = point.multiply(n);
            if (!multiplied.equals(Point.ZERO)) {
                throw new Error('Invalid point: not in the main subgroup');
            }

            return true;
        } catch (error) {
            console.error('Point validation failed:', error);
            return false;
        }
    }

    private isValidFieldElement(value: bigint): boolean {
        return value >= BigInt(0) && value < secp256k1.CURVE.p;
    }

    private getGenerator(index: number): Point {
        if (!this.generatorsInitialized) {
            this.initializeGenerators();
        }

        if (index < 0) {
            throw new Error('Invalid generator index: negative value');
        }

        if (index === 0) {
            return this.g;
        }

        const vectorIndex = index - 1;
        if (vectorIndex < this.n) {
            return this.g_vec[vectorIndex];
        } else if (vectorIndex < 2 * this.n) {
            return this.h_vec[vectorIndex - this.n];
        }

        throw new Error(`Invalid generator index: ${index} exceeds maximum value ${2 * this.n}`);
    }

    private getBlindingGenerator(): Point {
        return this.getGenerator(2 * this.n); // Use last generator for blinding
    }

    /**
     * Generate a range proof for a value v in [0, 2^n)
     */
    public async prove(
        values: bigint | bigint[],
        blindingFactors: bigint | bigint[]
    ): Promise<RangeProof> {
        try {
            // Convert single values to arrays
            const valueArray = Array.isArray(values) ? values : [values];
            const blindingArray = Array.isArray(blindingFactors) ? blindingFactors : [blindingFactors];

            if (valueArray.length !== blindingArray.length) {
                throw new Error('Number of values must match number of blinding factors');
            }

            // Validate all values are in range
            valueArray.forEach(value => {
                if (typeof value !== 'bigint') {
                    throw new Error('Values must be BigInt');
                }
                if (value < 0n || value >= (1n << BigInt(this.n))) {
                    throw new Error('Value out of range');
                }
            });

            // Generate vector commitments
            const { A, S, commitments } = await this.generateVectorCommitments(
                valueArray,
                blindingArray
            );

            // Generate polynomial commitments
            const { T1, T2, taux, mu } = await this.generatePolyCommitments(
                valueArray,
                blindingArray
            );

            // Generate inner product proof
            const innerProduct = await this.generateInnerProductProof(
                valueArray,
                blindingArray,
                A,
                S,
                T1,
                T2
            );

            return {
                A: A.toHex(),
                S: S.toHex(),
                T1: T1.toHex(),
                T2: T2.toHex(),
                taux: taux.toString(),
                mu: mu.toString(),
                innerProduct
            };
        } catch (error) {
            console.error('Error generating range proof:', error);
            throw error;
        }
    }

    private calculateBitSize(max: bigint): number {
        return Math.ceil(Math.log2(Number(max) + 1));
    }

    private valueToVectors(value: bigint, bitSize: number = this.n): {
        aL: bigint[];
        aR: bigint[];
    } {
        const aL: bigint[] = [];
        const aR: bigint[] = [];
        const modulus = 1n << 252n; // Curve order for secp256k1

        // Convert value to binary representation
        for (let i = 0; i < bitSize; i++) {
            const bit = (value >> BigInt(i)) & 1n;
            aL.push(bit);
            // Ensure aR values are valid scalars modulo the curve order
            const complement = (bit === 0n) ? 0n : (modulus - 1n);
            aR.push(complement);
        }

        // Pad with zeros if needed
        while (aL.length < this.n) {
            aL.push(0n);
            aR.push(0n);
        }

        return { aL, aR };
    }

    private async computeVectorCommitment(
        { aL, aR }: { aL: bigint[]; aR: bigint[] },
        alpha: bigint,
        bitSize: number = this.n
    ): Promise<Point> {
        try {
            if (aL.length !== this.n || aR.length !== this.n) {
                throw new Error('Invalid vector length');
            }

            const modulus = 1n << 252n; // Curve order for secp256k1
            let commitment = Point.ZERO;
            
            // Add left vector commitments
            for (let i = 0; i < bitSize; i++) {
                const leftGen = this.getGenerator(i);
                if (!leftGen || !leftGen.multiply) {
                    throw new Error('Invalid generator');
                }
                const scalar = aL[i] % modulus;
                if (scalar !== 0n) {
                    commitment = commitment.add(leftGen.multiply(scalar));
                }
            }
            
            // Add right vector commitments
            for (let i = 0; i < bitSize; i++) {
                const rightGen = this.getGenerator(i + this.n);
                if (!rightGen || !rightGen.multiply) {
                    throw new Error('Invalid generator');
                }
                const scalar = aR[i] % modulus;
                if (scalar !== 0n) {
                    commitment = commitment.add(rightGen.multiply(scalar));
                }
            }
            
            // Add blinding factor
            const blindingGen = this.getBlindingGenerator();
            if (!blindingGen || !blindingGen.multiply) {
                throw new Error('Invalid blinding generator');
            }
            const blindingScalar = alpha % modulus;
            return commitment.add(blindingGen.multiply(blindingScalar));
        } catch (error) {
            console.error('Error in vector commitment:', error);
            throw new Error('Failed to compute vector commitment');
        }
    }

    private async generateVectorCommitments(
        values: bigint[],
        blindingFactors: bigint[],
        maxBitSize: number = this.n
    ): Promise<{
        A: Point;
        S: Point;
        commitments: Point[];
    }> {
        try {
            // Validate inputs
            if (!Array.isArray(values) || !Array.isArray(blindingFactors)) {
                throw new Error('Values and blinding factors must be arrays');
            }
            
            if (values.length !== blindingFactors.length) {
                throw new Error('Number of values must match number of blinding factors');
            }

            // Validate and normalize all inputs first
            const normalizedValues = values.map(v => this.validateScalar(v));
            const normalizedBlinds = blindingFactors.map(b => this.validateScalar(b));

            const commitments = await Promise.all(
                normalizedValues.map(async (value, i) => {
                    const bitSize = this.calculateBitSize(value);
                    const vectors = this.valueToVectors(value, bitSize);
                    const alpha = this.generateRandomScalar();
                    const commitment = await this.computeVectorCommitment(vectors, alpha, bitSize);
                    if (!commitment.isValid()) {
                        throw new Error('Generated invalid commitment');
                    }
                    return commitment;
                })
            );

            if (!commitments.length) {
                throw new Error('No commitments generated');
            }

            const A = this.aggregatePoints(commitments);
            const S = this.aggregatePoints(commitments.map(c => c));

            // Validate final points
            this.validatePoint(A);
            this.validatePoint(S);

            return { A, S, commitments };
        } catch (error) {
            console.error('Error generating vector commitments:', error);
            throw new Error(`Failed to generate vector commitments: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private aggregatePoints(points: Point[]): Point {
        if (!points.length) return Point.ZERO;
        return points.reduce((sum, point) => {
            if (!point || !point.add) {
                throw new Error('Invalid point in aggregation');
            }
            return sum.add(point);
        }, Point.ZERO);
    }

    /**
     * Verify a range proof for one or more values
     */
    public async verify(proof: RangeProof, commitments: Point | Point[]): Promise<boolean> {
        try {
            // Handle both single and batch verification
            const commitmentArray = Array.isArray(commitments) ? commitments : [commitments];
            
            // Validate proof structure
            if (!this.validateProofStructure(proof)) {
                return false;
            }

            // Convert hex strings to points with validation
            const points = {
                A: Point.fromHex(proof.A),
                S: Point.fromHex(proof.S),
                T1: Point.fromHex(proof.T1),
                T2: Point.fromHex(proof.T2)
            };

            // Batch verify commitments
            const isValid = await Promise.all(
                commitmentArray.map(commitment => 
                    this.verifyCommitment(commitment, points, proof)
                )
            );

            return isValid.every(result => result === true);
        } catch (error) {
            console.error('Error in range proof verification:', error);
            return false;
        }
    }

    private validateProofStructure(proof: RangeProof): boolean {
        return !!(
            proof.A && proof.S && proof.T1 && proof.T2 &&
            proof.taux && proof.mu && proof.innerProduct
        );
    }

    private async verifyCommitment(
        commitment: Point,
        points: { A: Point; S: Point; T1: Point; T2: Point },
        proof: RangeProof
    ): Promise<boolean> {
        try {
            // Verify the commitment matches the proof
            const verified = await this.innerProduct.verify(
                commitment,
                points,
                BigInt(proof.taux),
                BigInt(proof.mu),
                proof.innerProduct
            );

            return verified;
        } catch (error) {
            console.error('Error verifying commitment:', error);
            return false;
        }
    }

    private convertToBits(value: bigint): bigint[] {
        try {
            if (value < 0n) {
                throw new Error('Value must be non-negative');
            }

            // Initialize array with zeros
            const bits = new Array(this.n).fill(0n);
            
            // Convert to binary and fill array from right to left
            let tempValue = value;
            for (let i = this.n - 1; i >= 0; i--) {
                bits[i] = tempValue & 1n;
                tempValue = tempValue >> 1n;
            }

            // Check if value was too large (remaining bits are non-zero)
            if (tempValue > 0n) {
                throw new Error('Value is too large for the given bit size');
            }

            return bits;
        } catch (error) {
            console.error('Error converting value to bits:', error);
            throw new Error('Failed to convert value to bits');
        }
    }

    private generateRandomVector(length: number): bigint[] {
        try {
            return Array(length).fill(0).map(() => {
                const scalar = this.generateRandomScalar();
                return (scalar % secp256k1.CURVE.n + secp256k1.CURVE.n) % secp256k1.CURVE.n;
            });
        } catch (error) {
            console.error('Error generating random vector:', error);
            throw new Error('Failed to generate random vector');
        }
    }

    private generateRandomScalar(): bigint {
        const modulus = 1n << 252n; // Curve order for secp256k1
        const bytes = new Uint8Array(32);
        crypto.getRandomValues(bytes);
        let scalar = 0n;
        for (let i = 0; i < bytes.length; i++) {
            scalar = (scalar << 8n) | BigInt(bytes[i]);
        }
        return scalar % modulus;
    }

    private generateChallenge(...points: Point[]): bigint {
        const data = points.map(p => p.toHex()).join('');
        const hash = sha256(Buffer.from(data, 'hex'));
        return BigInt('0x' + bytesToHex(hash)) % secp256k1.CURVE.n;
    }

    private computePolynomials(aL: bigint[], aR: bigint[], sL: bigint[], sR: bigint[], alpha: bigint, z: bigint): { t0: bigint, t1: bigint, t2: bigint } {
        try {
            // Compute powers of y
            const yn = new Array(this.n).fill(0n).map((_, i) => this.modPow(z, BigInt(i + 1)));

            // Compute l(X) = aL - z*1^n + sL*X
            const l0 = aL.map((a, i) => (a - z) % secp256k1.CURVE.n);
            const l1 = sL;

            // Compute r(X) = y^n ○ (aR + z*1^n + sR*X) + z^2*2^n
            const r0 = aR.map((a, i) => (a + z) % secp256k1.CURVE.n);
            const r1 = sR;

            // Compute t(X) = <l(X), r(X)>
            const t0 = this.innerProduct(l0, r0);
            const t1 = (this.innerProduct(l0, r1) + this.innerProduct(l1, r0)) % secp256k1.CURVE.n;
            const t2 = this.innerProduct(l1, r1);

            return { t0, t1, t2 };
        } catch (error) {
            throw new Error(`Error computing polynomials: ${error.message}`);
        }
    }

    private innerProduct(a: bigint[], b: bigint[]): bigint {
        if (a.length !== b.length) {
            throw new Error('Vectors must have the same length');
        }
        return a.reduce((sum, ai, i) => (sum + ai * b[i]) % secp256k1.CURVE.n, 0n);
    }

    private modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
        if (modulus === 1n) return 0n;
        let result = 1n;
        base = base % modulus;
        while (exponent > 0n) {
            if (exponent & 1n) {
                result = (result * base) % modulus;
            }
            base = (base * base) % modulus;
            exponent = exponent >> 1n;
        }
        return result;
    }

    private computeT1(aL: bigint[], aR: bigint[], sL: bigint[], sR: bigint[], y: bigint, z: bigint): bigint {
        try {
            let result = BigInt(0);
            
            for (let i = 0; i < this.n; i++) {
                // Validate and normalize input scalars
                const validAL = aL[i] % secp256k1.CURVE.n;
                const validAR = aR[i] % secp256k1.CURVE.n;
                const validSL = sL[i] % secp256k1.CURVE.n;
                const validSR = sR[i] % secp256k1.CURVE.n;
                const validY = y % secp256k1.CURVE.n;
                const validZ = z % secp256k1.CURVE.n;
                
                // Compute terms with validated scalars
                const term1 = (validAL * validSR) % secp256k1.CURVE.n;
                const term2 = (validAR * validSL) % secp256k1.CURVE.n;
                const term3 = (validY * validSL * validSR) % secp256k1.CURVE.n;
                
                // Add terms to result with modular arithmetic
                result = (result + term1 + term2 + term3) % secp256k1.CURVE.n;
            }
            
            return result;
        } catch (error) {
            console.error('Error computing T1:', error);
            throw new Error('Failed to compute T1');
        }
    }

    private computeT2(sL: bigint[], sR: bigint[], y: bigint): bigint {
        try {
            let result = BigInt(0);
            
            for (let i = 0; i < this.n; i++) {
                // Validate and normalize input scalars
                const validSL = sL[i] % secp256k1.CURVE.n;
                const validSR = sR[i] % secp256k1.CURVE.n;
                const validY = y % secp256k1.CURVE.n;
                
                // Compute term with validated scalars
                const term = (validSL * validSR * validY) % secp256k1.CURVE.n;
                
                // Add term to result with modular arithmetic
                result = (result + term) % secp256k1.CURVE.n;
            }
            
            return result;
        } catch (error) {
            console.error('Error computing T2:', error);
            throw new Error('Failed to compute T2');
        }
    }

    private computeTaux(
        tau1: bigint,
        tau2: bigint,
        x: bigint,
        z: bigint,
        alpha: bigint
    ): bigint {
        return (tau2 * x * x + tau1 * x + z * z * alpha) % secp256k1.CURVE.n;
    }

    private computeInnerProductVectors(
        aL: bigint[],
        aR: bigint[],
        sL: bigint[],
        sR: bigint[],
        y: bigint,
        z: bigint,
        x: bigint
    ): { l: bigint[]; r: bigint[] } {
        const l = aL.map((a, i) => (a - z + sL[i] * x) % secp256k1.CURVE.n);
        const r = aR.map((a, i) => {
            const yi = this.modPow(y, BigInt(i), secp256k1.CURVE.n);
            return (yi * (a + z + sR[i] * x) + z * z * (1n << BigInt(i))) % secp256k1.CURVE.n;
        });
        return { l, r };
    }

    private computeVerificationVectors(
        y: bigint,
        z: bigint,
        x: bigint,
        numValues: number
    ): { l: bigint[]; r: bigint[] } {
        try {
            const l = new Array(this.n * numValues).fill(0n);
            const r = new Array(this.n * numValues).fill(0n);

            for (let i = 0; i < this.n * numValues; i++) {
                // Compute powers of y for the current position
                const yi = this.modPow(y, BigInt(i + 1));

                // Left vector: -z + x*sL
                l[i] = (0n - z) % secp256k1.CURVE.n;

                // Right vector: yi * (z + x*sR) + z^2 * 2^i
                const powerOfTwo = (1n << BigInt(i % this.n));
                r[i] = (yi * z + z * z * powerOfTwo) % secp256k1.CURVE.n;
            }

            return { l, r };
        } catch (error) {
            console.error('Error computing verification vectors:', error);
            throw new Error('Failed to compute verification vectors');
        }
    }

    private computeTCommitment(
        V: Point,
        T1: Point,
        T2: Point,
        x: bigint,
        z: bigint,
        taux: bigint
    ): boolean {
        const lhs = V.multiply(z * z)
            .add(T1.multiply(x))
            .add(T2.multiply(x * x));
        
        const rhs = this.commitToScalar(taux, 0n);
        return lhs.toHex() === rhs.toHex();
    }

    private commitToScalar(value: bigint, blinding: bigint): Point {
        return Point.BASE.multiply(value)
            .add(this.getBlindingGenerator().multiply(blinding));
    }

    private computeAggregatedTCommitment(
        commitments: Point[],
        T1: Point,
        T2: Point,
        x: bigint,
        z: bigint,
        taux: bigint
    ): boolean {
        try {
            // Compute z^2 * V + delta(y,z) * G + T1*x + T2*x^2
            let commitment = Point.ZERO;

            // Add z^2 * V for each commitment
            for (let i = 0; i < commitments.length; i++) {
                commitment = commitment.add(commitments[i].multiply(z * z));
            }

            // Add T1*x + T2*x^2
            commitment = commitment
                .add(T1.multiply(x))
                .add(T2.multiply(x * x));

            // Add blinding factor
            const blindingGen = this.getBlindingGenerator();
            const tCommitment = blindingGen.multiply(taux);

            // Check if commitments match
            return commitment.equals(tCommitment);
        } catch (error) {
            console.error('Error in aggregated T commitment:', error);
            return false;
        }
    }

    private computeInnerProduct(a: bigint[], b: bigint[]): bigint {
        if (a.length !== b.length) {
            throw new Error('Vectors must have the same length');
        }

        try {
            return a.reduce((sum, ai, i) => {
                const product = (ai * b[i]) % secp256k1.CURVE.n;
                return (sum + product) % secp256k1.CURVE.n;
            }, 0n);
        } catch (error) {
            console.error('Error computing inner product:', error);
            throw new Error('Failed to compute inner product');
        }
    }

    private createCommitment(value: bigint, blindingFactor: bigint): Point {
        try {
            // Ensure value and blinding factor are within the valid range
            const validValue = value % secp256k1.CURVE.n;
            const validBlinding = blindingFactor % secp256k1.CURVE.n;

            // Validate scalars are positive
            if (validValue < BigInt(0) || validBlinding < BigInt(0)) {
                throw new Error('Scalars must be positive');
            }

            // Create base point commitment with validated value
            const basePoint = Point.BASE.multiply(validValue);

            // Create blinding point with validated blinding factor
            const blindingPoint = this.getBlindingGenerator().multiply(validBlinding);

            // Return combined commitment
            return basePoint.add(blindingPoint);
        } catch (error) {
            console.error('Error creating commitment:', error);
            throw new Error('Failed to create commitment');
        }
    }

    private computeCommitment(value: bigint, blinding: bigint): Point {
        try {
            // Get the base point for the commitment
            const basePoint = secp256k1.Point.fromPrivateKey(1n);
            
            // Get the blinding generator
            const blindingGen = this.getBlindingGenerator();
            
            // Compute commitment = value*G + blinding*H
            return basePoint.multiply(value).add(blindingGen.multiply(blinding));
        } catch (error) {
            console.error('Error computing commitment:', error);
            throw new Error('Failed to compute commitment');
        }
    }

    private async generatePolyCommitments(
        values: bigint[],
        blindingFactors: bigint[],
        maxBitSize: number = this.n
    ): Promise<{
        T1: Point;
        T2: Point;
        taux: bigint;
        mu: bigint;
    }> {
        try {
            const modulus = secp256k1.CURVE.n;
            
            // Validate inputs are arrays
            if (!Array.isArray(values) || !Array.isArray(blindingFactors)) {
                throw new Error('Values and blinding factors must be arrays');
            }

            // Validate all inputs are BigInt
            if (!values.every(v => typeof v === 'bigint') || 
                !blindingFactors.every(b => typeof b === 'bigint')) {
                throw new Error('All values and blinding factors must be BigInt');
            }

            // Normalize all inputs
            const normalizedValues = values.map(v => this.validateScalar(v));
            const normalizedBlinds = blindingFactors.map(b => this.validateScalar(b));
            
            // Generate random values for polynomial coefficients
            const tau1 = this.generateRandomScalar();
            const tau2 = this.generateRandomScalar();
            
            // Calculate polynomial terms
            let t1 = 0n;
            let t2 = 0n;
            
            for (let i = 0; i < normalizedValues.length; i++) {
                const term1 = (normalizedValues[i] * normalizedBlinds[i]) % modulus;
                const term2 = ((normalizedValues[i] * normalizedValues[i]) % modulus * normalizedBlinds[i]) % modulus;
                
                t1 = (t1 + term1) % modulus;
                t2 = (t2 + term2) % modulus;
            }
            
            // Validate generators
            const g0 = this.getGenerator(0);
            const g1 = this.getGenerator(1);
            const h = this.getBlindingGenerator();
            
            this.validatePoint(g0);
            this.validatePoint(g1);
            this.validatePoint(h);
            
            // Generate commitments with validated scalars
            let T1: Point;
            let T2: Point;
            
            try {
                const t1Commitment = g0.multiply(t1);
                const tau1Commitment = h.multiply(tau1);
                T1 = t1Commitment.add(tau1Commitment);
                
                const t2Commitment = g1.multiply(t2);
                const tau2Commitment = h.multiply(tau2);
                T2 = t2Commitment.add(tau2Commitment);
                
                // Validate generated points
                this.validatePoint(T1);
                this.validatePoint(T2);
            } catch (error) {
                throw new Error(`Failed to generate commitments: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            
            // Calculate taux and mu with modular arithmetic
            const taux = (tau1 + tau2) % modulus;
            const mu = this.generateRandomScalar();
            
            return { T1, T2, taux, mu };
        } catch (error) {
            console.error('Error generating polynomial commitments:', error);
            throw new Error(`Failed to generate polynomial commitments: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}