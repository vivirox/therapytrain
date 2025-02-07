import { OptimizedZKProofService } from '../OptimizedZKProofService';
import { VerificationKeyService } from '../VerificationKeyService';
import { SecurityAuditService } from '../SecurityAuditService';
import { ProofGenerationInput, SessionMetadata, TherapistCredential } from '../../zk/types';
import crypto from 'crypto';

jest.mock('../VerificationKeyService');
jest.mock('../SecurityAuditService');

describe('OptimizedZKProofService', () => {
    let zkService: OptimizedZKProofService;
    let verificationKeyService: jest.Mocked<VerificationKeyService>;
    let securityAuditService: jest.Mocked<SecurityAuditService>;

    beforeEach(async () => {
        verificationKeyService = {
            getCurrentKey: jest.fn(),
        } as any;

        securityAuditService = {
            recordAlert: jest.fn(),
        } as any;

        zkService = new OptimizedZKProofService(
            verificationKeyService,
            securityAuditService,
            2, // Use 2 workers for testing
            100 // Smaller cache size for testing
        );

        await zkService.initialize();
    });

    afterEach(async () => {
        await zkService.cleanup();
    });

    const generateTestInput = (): ProofGenerationInput => {
        const metadata: SessionMetadata = {
            isEmergency: false,
            isRecorded: true,
            isSupervised: true,
            isTraining: false
        };

        const therapistCredential: TherapistCredential = {
            licenseHash: crypto.randomBytes(32).toString('hex'),
            specializationHash: crypto.randomBytes(32).toString('hex'),
            certificationHash: crypto.randomBytes(32).toString('hex'),
            statusHash: crypto.randomBytes(32).toString('hex')
        };

        return {
            sessionId: crypto.randomBytes(32).toString('hex'),
            startTimestamp: Math.floor(Date.now() / 1000),
            endTimestamp: Math.floor(Date.now() / 1000) + 3600,
            therapistPubKey: crypto.randomBytes(32),
            therapistCredentialHash: crypto.randomBytes(32).toString('hex'),
            sessionData: Array(8).fill(null).map(() => crypto.randomBytes(32)),
            metadata,
            therapistCredential,
            signature: {
                R8: crypto.randomBytes(32),
                S: crypto.randomBytes(32)
            }
        };
    };

    describe('Proof Generation', () => {
        it('should generate proof successfully', async () => {
            const input = generateTestInput();
            const result = await zkService.generateProof(input);

            expect(result).toBeDefined();
            expect(result.proof).toBeDefined();
            expect(result.publicSignals).toBeDefined();
            expect(securityAuditService.recordAlert).toHaveBeenCalledWith(
                'PROOF_GENERATED',
                'LOW',
                expect.any(Object)
            );
        }, 30000);

        it('should use cache for identical inputs', async () => {
            const input = generateTestInput();

            // First call should generate new proof
            const result1 = await zkService.generateProof(input);

            // Second call should use cache
            const result2 = await zkService.generateProof(input);

            expect(result1).toEqual(result2);
            expect(securityAuditService.recordAlert).toHaveBeenCalledWith(
                'PROOF_CACHE_HIT',
                'LOW',
                expect.any(Object)
            );
        }, 30000);

        it('should handle worker errors gracefully', async () => {
            const input = generateTestInput();
            // Corrupt the input to cause worker error
            input.sessionData = [];

            await expect(zkService.generateProof(input)).rejects.toThrow();
            expect(securityAuditService.recordAlert).toHaveBeenCalledWith(
                'PROOF_GENERATION_ERROR',
                'HIGH',
                expect.any(Object)
            );
        });

        it('should distribute work across workers', async () => {
            const inputs = Array(4).fill(null).map(() => generateTestInput());

            // Generate proofs concurrently
            const results = await Promise.all(
                inputs.map(input => zkService.generateProof(input))
            );

            expect(results).toHaveLength(4);
            results.forEach(result => {
                expect(result.proof).toBeDefined();
                expect(result.publicSignals).toBeDefined();
            });
        }, 60000);
    });

    describe('Proof Verification', () => {
        it('should verify valid proof', async () => {
            const input = generateTestInput();
            const generatedProof = await zkService.generateProof(input);

            verificationKeyService.getCurrentKey.mockResolvedValue({
                // Mock verification key structure
                protocol: 'groth16',
                curve: 'bn128',
                nPublic: 4
            });

            const isValid = await zkService.verifyProof(generatedProof);
            expect(isValid).toBe(true);
        }, 30000);

        it('should reject invalid proof', async () => {
            const input = generateTestInput();
            const generatedProof = await zkService.generateProof(input);

            // Corrupt the proof
            generatedProof.proof.pi_a[0] = '0';

            verificationKeyService.getCurrentKey.mockResolvedValue({
                protocol: 'groth16',
                curve: 'bn128',
                nPublic: 4
            });

            const isValid = await zkService.verifyProof(generatedProof);
            expect(isValid).toBe(false);
        }, 30000);

        it('should handle verification errors gracefully', async () => {
            const input = generateTestInput();
            const generatedProof = await zkService.generateProof(input);

            verificationKeyService.getCurrentKey.mockRejectedValue(
                new Error('Verification key not found')
            );

            await expect(zkService.verifyProof(generatedProof)).rejects.toThrow();
            expect(securityAuditService.recordAlert).toHaveBeenCalledWith(
                'PROOF_VERIFICATION_ERROR',
                'HIGH',
                expect.any(Object)
            );
        });
    });

    describe('Service Management', () => {
        it('should initialize worker pool correctly', async () => {
            const metrics = await zkService.getMetrics();
            expect(metrics.size).toBe(2); // We configured 2 workers

            metrics.forEach((metric) => {
                expect(metric.totalProofsGenerated).toBe(0);
                expect(metric.errorRate).toBe(0);
                expect(metric.currentLoad).toBe(0);
            });
        });

        it('should cleanup resources properly', async () => {
            await zkService.cleanup();

            // Verify cleanup was logged
            expect(securityAuditService.recordAlert).toHaveBeenCalledWith(
                'ZK_SERVICE_CLEANUP',
                'LOW',
                expect.any(Object)
            );

            // Attempting to use service after cleanup should reinitialize
            const input = generateTestInput();
            const result = await zkService.generateProof(input);
            expect(result).toBeDefined();
        });

        it('should handle worker failures', async () => {
            // Simulate a worker crash by forcing an error
            const worker = (zkService as any).workerPool[0];
            worker.emit('error', new Error('Worker crashed'));

            // Service should still work with remaining worker
            const input = generateTestInput();
            const result = await zkService.generateProof(input);
            expect(result).toBeDefined();
        });
    });
});
