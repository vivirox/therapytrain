import { ZKProofService } from "./ZKProofService";
import { SecurityAuditService } from "./SecurityAuditService";
import { VerificationKeyService } from "./VerificationKeyService";
import { Worker } from 'worker_threads';
import * as snarkjs from 'snarkjs';
jest.mock('worker_threads');
jest.mock('snarkjs');
jest.mock('./SecurityAuditService');
jest.mock('./VerificationKeyService');
describe('ZKProofService', () => {
    let zkProofService: ZKProofService;
    let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
    let mockVerificationKeyService: jest.Mocked<VerificationKeyService>;
    let mockWorker: jest.Mocked<Worker>;
    const mockInput = {
        sessionId: '123',
        startTimestamp: Math.floor(Date.now() / 1000) - 3600,
        endTimestamp: Math.floor(Date.now() / 1000),
        therapistPubKey: Array(256).fill('0'),
        therapistCredentialHash: 'hash123',
        maxSessionDuration: 7200,
        minSessionDuration: 1800,
        currentTimestamp: Math.floor(Date.now() / 1000),
        sessionData: Array(8).fill(0),
        therapistSigR8: Array(256).fill('0'),
        therapistSigS: Array(256).fill('0'),
        therapistCredential: Array(4).fill(0),
        metadataFlags: Array(4).fill(0),
        encryptionNonce: '123456',
        previousSessionHash: 'prev_hash_123'
    };
    beforeEach(() => {
        mockSecurityAuditService = {
            recordAlert: jest.fn()
        } as any;
        mockVerificationKeyService = {
            getCurrentKey: jest.fn()
        } as any;
        mockWorker = {
            postMessage: jest.fn(),
            once: jest.fn(),
            terminate: jest.fn()
        } as any;
        (Worker as jest.Mock).mockImplementation(() => mockWorker);
        zkProofService = new ZKProofService(mockSecurityAuditService, mockVerificationKeyService);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('initialize', () => {
        it('should initialize workers and verification key service', async () => {
            await zkProofService.initialize();
            expect(Worker).toHaveBeenCalledTimes(4);
            expect(mockVerificationKeyService.getCurrentKey).toHaveBeenCalled();
            expect(mockSecurityAuditService.recordAlert).not.toHaveBeenCalled();
        });
        it('should handle initialization errors', async () => {
            const error = new Error('Init failed');
            mockVerificationKeyService.getCurrentKey.mockRejectedValue(error);
            await expect(zkProofService.initialize()).rejects.toThrow(error);
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('ZK_SERVICE_INIT_ERROR', 'HIGH', expect.objectContaining({
                error: error.message
            }));
        });
    });
    describe('generateProof', () => {
        beforeEach(async () => {
            await zkProofService.initialize();
        });
        it('should generate a proof successfully', async () => {
            const mockProof = { proof: 'test-proof' };
            mockWorker.once.mockImplementation((event: string, callback: (data: any) => void) => {
                if (event === 'message') {
                    callback(mockProof);
                }
                return mockWorker;
            });
            const result = await zkProofService.generateProof(mockInput);
            expect(result).toBe(mockProof.proof);
            expect(mockWorker.postMessage).toHaveBeenCalledWith({
                type: 'generate',
                input: mockInput,
                circuitPath: expect.stringContaining('SessionDataCircuit.wasm')
            });
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('PROOF_GENERATED', 'LOW', expect.objectContaining({
                sessionId: mockInput.sessionId
            }));
        });
        it('should handle worker errors', async () => {
            const error = new Error('Worker error');
            mockWorker.once.mockImplementation((event: string, callback: (data: any) => void) => {
                if (event === 'error') {
                    callback(error);
                }
                return mockWorker;
            });
            await expect(zkProofService.generateProof(mockInput)).rejects.toThrow(error);
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('PROOF_GENERATION_ERROR', 'HIGH', expect.objectContaining({
                error: error.message
            }));
        });
        it('should validate input parameters', async () => {
            const invalidInput = {
                ...mockInput,
                startTimestamp: mockInput.endTimestamp + 1000 // Invalid: start after end
            };
            await expect(zkProofService.generateProof(invalidInput)).rejects.toThrow('Start timestamp must be before end timestamp');
        });
    });
    describe('verifyProof', () => {
        const mockProof = { a: 1, b: 2 };
        const mockPublicSignals = ['1', '2'];
        beforeEach(async () => {
            await zkProofService.initialize();
        });
        it('should verify proof successfully', async () => {
            (snarkjs.groth16.verify as jest.Mock).mockResolvedValue(true);
            const result = await zkProofService.verifyProof(mockProof, mockPublicSignals);
            expect(result).toEqual({ isValid: true });
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('PROOF_VERIFIED', 'LOW', expect.objectContaining({ isValid: true }));
        });
        it('should handle verification errors', async () => {
            const error = new Error('Verification failed');
            (snarkjs.groth16.verify as jest.Mock).mockRejectedValue(error);
            const result = await zkProofService.verifyProof(mockProof, mockPublicSignals);
            expect(result).toEqual({
                isValid: false,
                error: error.message
            });
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('PROOF_VERIFICATION_ERROR', 'HIGH', expect.objectContaining({
                error: error.message
            }));
        });
    });
    describe('cleanup', () => {
        beforeEach(async () => {
            await zkProofService.initialize();
        });
        it('should terminate workers', async () => {
            await zkProofService.cleanup();
            expect(mockWorker.terminate).toHaveBeenCalledTimes(4);
            expect(mockSecurityAuditService.recordAlert).not.toHaveBeenCalled();
        });
        it('should handle cleanup errors', async () => {
            const error = new Error('Cleanup failed');
            mockWorker.terminate.mockRejectedValue(error);
            await expect(zkProofService.cleanup()).rejects.toThrow(error);
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('ZK_SERVICE_CLEANUP_ERROR', 'HIGH', expect.objectContaining({
                error: error.message
            }));
        });
    });
});
