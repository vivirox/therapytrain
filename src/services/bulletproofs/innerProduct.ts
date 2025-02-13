import * as secp256k1 from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { Point } from '../zkProof';

export interface InnerProductProof {
    L: string[];  // Left commitments
    R: string[];  // Right commitments
    a: string;    // Final a value
    b: string;    // Final b value
}

export interface InnerProductWitness {
    a: bigint[];  // Left vector
    b: bigint[];  // Right vector
}

/**
 * Implementation of the inner product argument for Bulletproofs
 */
export class InnerProductArgument {
    private generators: Point[];
    private h: Point;

    constructor(n: number) {
        // Initialize generators
        this.generators = new Array(n).fill(0).map((_, i) => this.getGenerator(i));
        this.h = this.getGenerator(n); // Additional generator for blinding
    }

    /**
     * Generate an inner product proof
     */
    public async prove(witness: InnerProductWitness): Promise<InnerProductProof> {
        const n = witness.a.length;
        if (n !== witness.b.length || (n & (n - 1)) !== 0) {
            throw new Error('Vector lengths must be equal and a power of 2');
        }

        let a = witness.a;
        let b = witness.b;
        let g = this.generators.slice(0, n);
        
        const L: string[] = [];
        const R: string[] = [];
        
        while (a.length > 1) {
            const n_prime = a.length / 2;
            
            // Split vectors
            const a_L = a.slice(0, n_prime);
            const a_R = a.slice(n_prime);
            const b_L = b.slice(0, n_prime);
            const b_R = b.slice(n_prime);
            const g_L = g.slice(0, n_prime);
            const g_R = g.slice(n_prime);
            
            // Compute L and R commitments
            const L_i = this.computeCommitment(a_L, b_R, g_R, g_L);
            const R_i = this.computeCommitment(a_R, b_L, g_L, g_R);
            
            L.push(L_i.toHex());
            R.push(R_i.toHex());
            
            // Generate challenge
            const x = this.generateChallenge(L_i, R_i);
            const x_inv = this.modInverse(x);
            
            // Update vectors for next round
            a = this.updateVector(a_L, a_R, x, x_inv);
            b = this.updateVector(b_L, b_R, x_inv, x);
            g = this.updateBaseVector(g_L, g_R, x_inv, x);
        }

        return {
            L,
            R,
            a: a[0].toString(),
            b: b[0].toString()
        };
    }

    /**
     * Verify an inner product proof
     */
    public async verify(
        proof: InnerProductProof,
        commitment: Point,
        innerProduct: bigint
    ): Promise<boolean> {
        try {
            const n = 1 << proof.L.length; // n = 2^l where l is the number of rounds
            let g = this.generators.slice(0, n);
            
            // Convert final a, b to bigint
            let a = BigInt(proof.a);
            let b = BigInt(proof.b);
            
            // Verify final inner product
            if (a * b !== innerProduct) {
                return false;
            }
            
            // Reconstruct the commitment
            let P = commitment;
            
            for (let i = 0; i < proof.L.length; i++) {
                const L_i = Point.fromHex(proof.L[i]);
                const R_i = Point.fromHex(proof.R[i]);
                
                // Generate challenge
                const x = this.generateChallenge(L_i, R_i);
                const x_inv = this.modInverse(x);
                
                // Update commitment
                P = L_i.multiply(x.pow(2n))
                    .add(P)
                    .add(R_i.multiply(x_inv.pow(2n)));
                
                // Update base vector
                const n_prime = g.length / 2;
                const g_L = g.slice(0, n_prime);
                const g_R = g.slice(n_prime);
                g = this.updateBaseVector(g_L, g_R, x_inv, x);
            }
            
            // Final verification
            const computed = g[0].multiply(a).add(this.h.multiply(b));
            return computed.toHex() === P.toHex();
            
        } catch (error) {
            console.error('Error verifying inner product proof:', error);
            return false;
        }
    }

    private computeCommitment(
        a_L: bigint[],
        b_R: bigint[],
        g_R: Point[],
        g_L: Point[]
    ): Point {
        // Compute ⟨a_L, b_R⟩
        const c_L = this.innerProduct(a_L, b_R);
        
        // Compute commitment
        let commitment = Point.ZERO;
        
        // Add g_R[i]^a_L[i] terms
        for (let i = 0; i < a_L.length; i++) {
            commitment = commitment.add(g_R[i].multiply(a_L[i]));
        }
        
        // Add g_L[i]^b_R[i] terms
        for (let i = 0; i < b_R.length; i++) {
            commitment = commitment.add(g_L[i].multiply(b_R[i]));
        }
        
        // Add blinding factor
        commitment = commitment.add(this.h.multiply(c_L));
        
        return commitment;
    }

    private generateChallenge(L: Point, R: Point): bigint {
        const data = L.toHex() + R.toHex();
        const hash = sha256(Buffer.from(data, 'hex'));
        return BigInt('0x' + bytesToHex(hash)) % secp256k1.CURVE.n;
    }

    private updateVector(left: bigint[], right: bigint[], x: bigint, x_inv: bigint): bigint[] {
        const n = left.length;
        const result = new Array(n);
        
        for (let i = 0; i < n; i++) {
            result[i] = (left[i] * x + right[i] * x_inv) % secp256k1.CURVE.n;
        }
        
        return result;
    }

    private updateBaseVector(left: Point[], right: Point[], x: bigint, x_inv: bigint): Point[] {
        const n = left.length;
        const result = new Array(n);
        
        for (let i = 0; i < n; i++) {
            result[i] = left[i].multiply(x_inv).add(right[i].multiply(x));
        }
        
        return result;
    }

    private innerProduct(a: bigint[], b: bigint[]): bigint {
        return a.reduce((sum, a_i, i) => 
            (sum + a_i * b[i]) % secp256k1.CURVE.n, 0n
        );
    }

    private modInverse(x: bigint): bigint {
        // Compute modular multiplicative inverse using Fermat's little theorem
        // Only works for prime modulus
        return this.modPow(x, secp256k1.CURVE.n - 2n, secp256k1.CURVE.n);
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
            exponent >>= 1n;
        }
        
        return result;
    }

    private getGenerator(index: number): Point {
        // Use a deterministic base point and multiply by a small scalar
        const basePoint = Point.BASE;
        const scalar = BigInt(index % 1000 + 1); // Keep scalar small
        return basePoint.multiply(scalar);
    }
}

export default InnerProductArgument; 