import { OptimizedZKProofService } from '../OptimizedZKProofService';
import { VerificationKeyService } from '../VerificationKeyService';
import { SecurityAuditService } from '../SecurityAuditService';
import { Worker } from 'worker_threads';

jest.mock('worker_threads');

describe('OptimizedZKProofService', () => {
    let proofService: OptimizedZKProofService;
    let mockVerificationKeyService: jest.Mocked<VerificationKeyService>;
    let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
    let mockWorker: jest.Mocked<Worker>;

    const mockInput = {
        sessionData: { id: 'test-session' },
        therapistSignature: 'test-signature'
    };

    const mockProof = {
        proof: { pi_a: [], pi_b: [], pi_c: [] },
        publicSignals: ['1', '2', '3']
    };

    beforeEach(() => {
        mockVerificationKeyService = {
            getCurrentKey: jest.fn().mockResolvedValue({
                key: 'test-vkey',
                version: 'v1',
                validFrom: Date.now(),
                validUntil: null,
                signature: 'test-sig'
            })
        } as any;

        mockSecurityAuditService = {
            recordAlert: jest.fn().mockResolvedValue(undefined)
        } as any;

        mockWorker = {
            on: jest.fn(),
            once: jest.fn(),
            postMessage: jest.fn(),
            terminate: jest.fn().mockResolvedValue(undefined)
        } as any;

        (Worker as jest.Mock).mockImplementation(() => mockWorker);

        proofService = new OptimizedZKProofService(
            mockVerificationKeyService,
            mockSecurityAuditService,
            2 // Use 2 workers for testing
        );
    });

    afterEach(async () => {
        await proofService.cleanup();
    });

    describe('generateProof', () => {
        it('should generate proof successfully', async () => {
            mockWorker.once.mockImplementation((event, callback) => {
                callback({ proof: mockProof });
            });

            const result = await proofService.generateProof(mockInput);

            expect(result).toEqual(mockProof);
            expect(mockWorker.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'generate',
                    input: mockInput
                })
            );
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'PROOF_GENERATED',
                'LOW',
                expect.any(Object)
            );
        });

        it('should return cached proof if available', async () => {
            // First call to generate and cache the proof
            mockWorker.once.mockImplementation((event, callback) => {
                callback({ proof: mockProof });
            });
            await proofService.generateProof(mockInput);

            // Reset mocks
            mockWorker.once.mockClear();
            mockWorker.postMessage.mockClear();

            // Second call should use cached proof
            const result = await proofService.generateProof(mockInput);

            expect(result).toEqual(mockProof);
            expect(mockWorker.postMessage).not.toHaveBeenCalled();
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'PROOF_CACHE_HIT',
                'LOW',
                expect.any(Object)
            );
        });

        it('should handle proof generation errors', async () => {
            const error = new Error('Proof generation failed');
            mockWorker.once.mockImplementation((event, callback) => {
                callback({ error: error.message });
            });

            await expect(proofService.generateProof(mockInput))
                .rejects.toThrow('Proof generation failed');

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'PROOF_GENERATION_ERROR',
                'HIGH',
                expect.any(Object)
            );
        });
    });

    describe('verifyProof', () => {
        it('should verify proof successfully', async () => {
            mockWorker.once.mockImplementation((event, callback) => {
                callback({ isValid: true });
            });

            const result = await proofService.verifyProof(mockProof);

            expect(result).toBe(true);
            expect(mockWorker.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'verify',
                    proof: mockProof
                })
            );
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'PROOF_VERIFIED',
                'LOW',
                expect.any(Object)
            );
        });

        it('should handle verification errors', async () => {
            const error = new Error('Verification failed');
            mockWorker.once.mockImplementation((event, callback) => {
                callback({ error: error.message });
            });

            await expect(proofService.verifyProof(mockProof))
                .rejects.toThrow('Verification failed');

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'PROOF_VERIFICATION_ERROR',
                'HIGH',
                expect.any(Object)
            );
        });
    });

    describe('cleanup', () => {
        it('should terminate all workers and clear cache', async () => {
            await proofService.cleanup();

            expect(mockWorker.terminate).toHaveBeenCalledTimes(2); // 2 workers
        });
    });
});
