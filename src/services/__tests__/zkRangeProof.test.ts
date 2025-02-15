import { ZKRangeProofService, RangeProofInput, RangeProofData } from '../zkRangeProof';

describe('ZKRangeProofService', () => {
    let zkRangeProof: ZKRangeProofService;

    beforeEach(() => {
        zkRangeProof = ZKRangeProofService.getInstance();
    });

    describe('generateRangeProof', () => {
        it('should generate valid range proof', async () => {
            const input: RangeProofInput = {
                value: 50,
                min: 0,
                max: 100
            };

            const proof = await zkRangeProof.generateRangeProof(input);

            expect(proof).toBeDefined();
            expect(proof.commitment).toBeDefined();
            expect(proof.proof).toBeDefined();
            expect(proof.publicInputs).toEqual({
                min: 0,
                max: 100
            });
        });

        it('should reject invalid range', async () => {
            const input: RangeProofInput = {
                value: 150,
                min: 0,
                max: 100
            };

            await expect(zkRangeProof.generateRangeProof(input))
                .rejects
                .toThrow('Value must be within range');
        });
    });

    describe('verifyRangeProof', () => {
        it('should verify valid range proof', async () => {
            const input: RangeProofInput = {
                value: 50,
                min: 0,
                max: 100
            };

            const proof = await zkRangeProof.generateRangeProof(input);
            const isValid = await zkRangeProof.verifyRangeProof(proof);

            expect(isValid).toBe(true);
        });

        it('should reject invalid proof data', async () => {
            const invalidProof = {
                commitment: '',
                proof: '',
                publicInputs: {
                    min: 0,
                    max: 100
                }
            };

            await expect(zkRangeProof.verifyRangeProof(invalidProof))
                .resolves
                .toBe(false);
        });
    });

    describe('generateAggregatedProof', () => {
        it('should generate valid aggregated proof for multiple values', async () => {
            const inputs: RangeProofInput[] = [
                { value: 25, min: 0, max: 50 },
                { value: 75, min: 50, max: 100 }
            ];

            const proof = await zkRangeProof.generateAggregatedProof(inputs);

            expect(proof).toBeDefined();
            expect(proof.commitment).toBeDefined();
            expect(proof.proof).toBeDefined();
            expect(proof.publicInputs).toEqual({
                min: 0,
                max: 100
            });
        });

        it('should handle large number of proofs efficiently', async () => {
            const inputs: RangeProofInput[] = Array.from({ length: 10 }, (_, i) => ({
                value: i * 10,
                min: i * 10,
                max: (i + 1) * 10
            }));

            const startTime = Date.now();
            const proof = await zkRangeProof.generateAggregatedProof(inputs);
            const endTime = Date.now();

            expect(proof).toBeDefined();
            expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
        });

        it('should verify aggregated proof correctly', async () => {
            const inputs: RangeProofInput[] = [
                { value: 25, min: 0, max: 50 },
                { value: 75, min: 50, max: 100 },
                { value: 150, min: 100, max: 200 }
            ];

            const proof = await zkRangeProof.generateAggregatedProof(inputs);
            const isValid = await zkRangeProof.verifyAggregatedProof(proof);

            expect(isValid).toBe(true);
        });

        it('should handle proofs with different bit sizes', async () => {
            const inputs: RangeProofInput[] = [
                { value: 5, min: 0, max: 10 },      // 4-bit
                { value: 100, min: 0, max: 1000 },  // 10-bit
                { value: 50, min: 0, max: 100 }     // 7-bit
            ];

            const proof = await zkRangeProof.generateAggregatedProof(inputs);
            const isValid = await zkRangeProof.verifyAggregatedProof(proof);

            expect(isValid).toBe(true);
        });

        it('should reject invalid values in aggregated proof', async () => {
            const inputs: RangeProofInput[] = [
                { value: 25, min: 0, max: 50 },
                { value: 150, min: 50, max: 100 }  // Invalid value
            ];

            await expect(zkRangeProof.generateAggregatedProof(inputs))
                .rejects
                .toThrow('Value must be within range');
        });

        it('should handle empty input array', async () => {
            await expect(zkRangeProof.generateAggregatedProof([]))
                .rejects
                .toThrow('No proofs to aggregate');
        });

        it('should optimize proof size through aggregation', async () => {
            const inputs: RangeProofInput[] = Array.from({ length: 5 }, (_, i) => ({
                value: i * 10,
                min: i * 10,
                max: (i + 1) * 10
            }));

            // Generate individual proofs
            const individualProofs = await Promise.all(
                inputs.map(input => zkRangeProof.generateRangeProof(input))
            );
            const individualProofsSize = individualProofs
                .reduce((size, proof) => size + proof.proof.length, 0);

            // Generate aggregated proof
            const aggregatedProof = await zkRangeProof.generateAggregatedProof(inputs);
            const aggregatedProofSize = aggregatedProof.proof.length;

            // Aggregated proof should be smaller than sum of individual proofs
            expect(aggregatedProofSize).toBeLessThan(individualProofsSize);
        });

        it('should handle parallel verification correctly', async () => {
            // Generate enough proofs to trigger parallel verification
            const inputs: RangeProofInput[] = Array.from({ length: 8 }, (_, i) => ({
                value: i * 10,
                min: i * 10,
                max: (i + 1) * 10
            }));

            const proof = await zkRangeProof.generateAggregatedProof(inputs);
            const isValid = await zkRangeProof.verifyAggregatedProof(proof);

            expect(isValid).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should handle minimum value in range', async () => {
            const input: RangeProofInput = {
                value: 0,
                min: 0,
                max: 100
            };

            const proof = await zkRangeProof.generateRangeProof(input);
            const isValid = await zkRangeProof.verifyRangeProof(proof);

            expect(isValid).toBe(true);
        });

        it('should handle maximum value in range', async () => {
            const input: RangeProofInput = {
                value: 100,
                min: 0,
                max: 100
            };

            const proof = await zkRangeProof.generateRangeProof(input);
            const isValid = await zkRangeProof.verifyRangeProof(proof);

            expect(isValid).toBe(true);
        });

        it('should handle non-integer values', async () => {
            const input: RangeProofInput = {
                value: 50.5,
                min: 0,
                max: 100
            };

            await expect(zkRangeProof.generateRangeProof(input))
                .rejects
                .toThrow('Value must be an integer');
        });
    });
}); 