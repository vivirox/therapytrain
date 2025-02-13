import { ZKRangeProofService, RangeProofInput } from '../zkRangeProof';
import { BulletproofsRangeProof } from '../bulletproofs/rangeProof';
import { Point } from '../zkProof';

describe('ZKRangeProof Integration Tests', () => {
    let zkRangeProof: ZKRangeProofService;

    beforeEach(() => {
        zkRangeProof = ZKRangeProofService.getInstance();
    });

    describe('Single Value Range Proofs', () => {
        it('should generate and verify proof for value in range', async () => {
            const input: RangeProofInput = {
                value: 42,
                min: 0,
                max: 100
            };

            // Generate proof
            const proofData = await zkRangeProof.generateRangeProof(input);
            expect(proofData).toBeDefined();
            expect(proofData.commitment).toBeDefined();
            expect(proofData.proof).toBeDefined();

            // Verify the proof
            const isValid = await zkRangeProof.verifyRangeProof(proofData);
            expect(isValid).toBe(true);

            // Verify commitment structure
            const commitment = Point.fromHex(proofData.commitment);
            expect(commitment).toBeDefined();
        });

        it('should handle boundary values correctly', async () => {
            // Test minimum value
            const minInput: RangeProofInput = {
                value: 0,
                min: 0,
                max: 100
            };
            const minProof = await zkRangeProof.generateRangeProof(minInput);
            const minValid = await zkRangeProof.verifyRangeProof(minProof);
            expect(minValid).toBe(true);

            // Test maximum value
            const maxInput: RangeProofInput = {
                value: 100,
                min: 0,
                max: 100
            };
            const maxProof = await zkRangeProof.generateRangeProof(maxInput);
            const maxValid = await zkRangeProof.verifyRangeProof(maxProof);
            expect(maxValid).toBe(true);
        });

        it('should reject proofs for values outside range', async () => {
            // Test value below minimum
            const belowInput: RangeProofInput = {
                value: -1,
                min: 0,
                max: 100
            };
            await expect(zkRangeProof.generateRangeProof(belowInput))
                .rejects
                .toThrow('Value must be within range');

            // Test value above maximum
            const aboveInput: RangeProofInput = {
                value: 101,
                min: 0,
                max: 100
            };
            await expect(zkRangeProof.generateRangeProof(aboveInput))
                .rejects
                .toThrow('Value must be within range');
        });
    });

    describe('Aggregated Range Proofs', () => {
        it('should generate and verify aggregated proof for multiple values', async () => {
            const inputs: RangeProofInput[] = [
                { value: 25, min: 0, max: 50 },
                { value: 75, min: 50, max: 100 },
                { value: 150, min: 100, max: 200 }
            ];

            // Generate aggregated proof
            const proofData = await zkRangeProof.generateAggregatedProof(inputs);
            expect(proofData).toBeDefined();
            expect(proofData.commitment).toBeDefined();
            expect(proofData.proof).toBeDefined();

            // Verify the aggregated proof
            const isValid = await zkRangeProof.verifyAggregatedProof(proofData);
            expect(isValid).toBe(true);

            // Verify commitment structure
            const commitments = proofData.commitment.split(',').map(c => Point.fromHex(c));
            expect(commitments).toHaveLength(inputs.length);
        });

        it('should handle overlapping ranges correctly', async () => {
            const inputs: RangeProofInput[] = [
                { value: 50, min: 0, max: 100 },
                { value: 50, min: 25, max: 75 },
                { value: 50, min: 40, max: 60 }
            ];

            const proofData = await zkRangeProof.generateAggregatedProof(inputs);
            const isValid = await zkRangeProof.verifyAggregatedProof(proofData);
            expect(isValid).toBe(true);
        });

        it('should reject aggregated proofs if any value is outside range', async () => {
            const inputs: RangeProofInput[] = [
                { value: 25, min: 0, max: 50 },    // Valid
                { value: 75, min: 50, max: 100 },  // Valid
                { value: 250, min: 100, max: 200 } // Invalid
            ];

            await expect(zkRangeProof.generateAggregatedProof(inputs))
                .rejects
                .toThrow('Value must be within range');
        });
    });

    describe('Performance and Resource Usage', () => {
        it('should generate and verify proofs within reasonable time', async () => {
            const input: RangeProofInput = {
                value: 42,
                min: 0,
                max: 1000000
            };

            // Measure proof generation time
            const startGenerate = Date.now();
            const proofData = await zkRangeProof.generateRangeProof(input);
            const generateTime = Date.now() - startGenerate;

            // Measure verification time
            const startVerify = Date.now();
            const isValid = await zkRangeProof.verifyRangeProof(proofData);
            const verifyTime = Date.now() - startVerify;

            expect(isValid).toBe(true);
            expect(generateTime).toBeLessThan(5000); // Should take less than 5 seconds
            expect(verifyTime).toBeLessThan(1000);   // Should take less than 1 second
        });

        it('should handle multiple proofs efficiently', async () => {
            const inputs: RangeProofInput[] = Array(10).fill(null).map((_, i) => ({
                value: i * 10,
                min: 0,
                max: 100
            }));

            // Measure aggregated proof generation time
            const startGenerate = Date.now();
            const proofData = await zkRangeProof.generateAggregatedProof(inputs);
            const generateTime = Date.now() - startGenerate;

            // Measure aggregated verification time
            const startVerify = Date.now();
            const isValid = await zkRangeProof.verifyAggregatedProof(proofData);
            const verifyTime = Date.now() - startVerify;

            expect(isValid).toBe(true);
            expect(generateTime).toBeLessThan(10000); // Should take less than 10 seconds
            expect(verifyTime).toBeLessThan(2000);    // Should take less than 2 seconds
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle invalid proof data gracefully', async () => {
            const invalidProof = {
                commitment: 'invalid-commitment',
                proof: 'invalid-proof',
                publicInputs: {
                    min: 0,
                    max: 100
                }
            };

            const isValid = await zkRangeProof.verifyRangeProof(invalidProof);
            expect(isValid).toBe(false);
        });

        it('should handle large ranges efficiently', async () => {
            const input: RangeProofInput = {
                value: 1000000,
                min: 0,
                max: 2000000
            };

            const proofData = await zkRangeProof.generateRangeProof(input);
            const isValid = await zkRangeProof.verifyRangeProof(proofData);
            expect(isValid).toBe(true);
        });

        it('should handle concurrent proof generations', async () => {
            const inputs = Array(5).fill(null).map((_, i) => ({
                value: i * 20,
                min: 0,
                max: 100
            }));

            // Generate multiple proofs concurrently
            const proofs = await Promise.all(
                inputs.map(input => zkRangeProof.generateRangeProof(input))
            );

            // Verify all proofs
            const results = await Promise.all(
                proofs.map(proof => zkRangeProof.verifyRangeProof(proof))
            );

            expect(results.every(r => r === true)).toBe(true);
        });
    });
}); 