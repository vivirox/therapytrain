import { BulletproofsRangeProof } from '../rangeProof';
import { Point } from '../../zkProof';

describe('BulletproofsRangeProof', () => {
    let bulletproofs: BulletproofsRangeProof;

    beforeEach(() => {
        bulletproofs = new BulletproofsRangeProof(32); // Use 32-bit range proofs for faster tests
    });

    describe('prove and verify', () => {
        it('should generate and verify valid proof for value in range', async () => {
            const value = 123n;
            const blindingFactor = 456n;

            const proof = await bulletproofs.prove(value, blindingFactor);
            expect(proof).toBeDefined();
            expect(proof.A).toBeDefined();
            expect(proof.S).toBeDefined();
            expect(proof.T1).toBeDefined();
            expect(proof.T2).toBeDefined();
            expect(proof.taux).toBeDefined();
            expect(proof.mu).toBeDefined();
            expect(proof.innerProduct).toBeDefined();

            // Create commitment to value
            const commitment = Point.BASE.multiply(value)
                .add(bulletproofs['getBlindingGenerator']().multiply(blindingFactor));

            const isValid = await bulletproofs.verify(proof, commitment);
            expect(isValid).toBe(true);
        });

        it('should reject proof for value outside range', async () => {
            const value = (1n << 33n); // Value larger than 32 bits
            const blindingFactor = 456n;

            await expect(bulletproofs.prove(value, blindingFactor))
                .rejects
                .toThrow('Value is too large for the given bit size');
        });

        it('should reject invalid proof', async () => {
            const value = 123n;
            const blindingFactor = 456n;

            const proof = await bulletproofs.prove(value, blindingFactor);
            
            // Tamper with the proof
            const tamperedProof = {
                ...proof,
                T1: Point.BASE.multiply(789n).toHex() // Replace T1 with invalid value
            };

            const commitment = Point.BASE.multiply(value)
                .add(bulletproofs['getBlindingGenerator']().multiply(blindingFactor));

            const isValid = await bulletproofs.verify(tamperedProof, commitment);
            expect(isValid).toBe(false);
        });
    });

    describe('edge cases', () => {
        it('should handle zero value', async () => {
            const value = 0n;
            const blindingFactor = 456n;

            const proof = await bulletproofs.prove(value, blindingFactor);
            const commitment = Point.BASE.multiply(value)
                .add(bulletproofs['getBlindingGenerator']().multiply(blindingFactor));

            const isValid = await bulletproofs.verify(proof, commitment);
            expect(isValid).toBe(true);
        });

        it('should handle maximum value in range', async () => {
            const value = (1n << 32n) - 1n; // Maximum 32-bit value
            const blindingFactor = 456n;

            const proof = await bulletproofs.prove(value, blindingFactor);
            const commitment = Point.BASE.multiply(value)
                .add(bulletproofs['getBlindingGenerator']().multiply(blindingFactor));

            const isValid = await bulletproofs.verify(proof, commitment);
            expect(isValid).toBe(true);
        });

        it('should reject negative values', async () => {
            const value = -1n;
            const blindingFactor = 456n;

            await expect(bulletproofs.prove(value, blindingFactor))
                .rejects
                .toThrow();
        });
    });

    describe('constructor', () => {
        it('should reject non-power-of-2 bit sizes', () => {
            expect(() => new BulletproofsRangeProof(100))
                .toThrow('Bit size must be a power of 2');
        });

        it('should accept valid bit sizes', () => {
            expect(() => new BulletproofsRangeProof(64)).not.toThrow();
            expect(() => new BulletproofsRangeProof(32)).not.toThrow();
            expect(() => new BulletproofsRangeProof(16)).not.toThrow();
            expect(() => new BulletproofsRangeProof(8)).not.toThrow();
        });
    });

    describe('performance', () => {
        it('should generate and verify proof within reasonable time', async () => {
            const value = 12345n;
            const blindingFactor = 67890n;

            const startProve = Date.now();
            const proof = await bulletproofs.prove(value, blindingFactor);
            const proveTime = Date.now() - startProve;

            const commitment = Point.BASE.multiply(value)
                .add(bulletproofs['getBlindingGenerator']().multiply(blindingFactor));

            const startVerify = Date.now();
            const isValid = await bulletproofs.verify(proof, commitment);
            const verifyTime = Date.now() - startVerify;

            expect(isValid).toBe(true);
            expect(proveTime).toBeLessThan(5000); // Should take less than 5 seconds
            expect(verifyTime).toBeLessThan(1000); // Should take less than 1 second
        });
    });
}); 