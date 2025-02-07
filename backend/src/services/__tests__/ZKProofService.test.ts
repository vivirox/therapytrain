import { ZKProofService } from "../ZKProofService";
import { SecurityAuditService } from "../SecurityAuditService";
import * as snarkjs from 'snarkjs';
import * as circomlibjs from 'circomlibjs';
import path from 'path';
jest.mock('snarkjs');
jest.mock('circomlibjs');
describe('ZKProofService', () => {
    let zkProofService: ZKProofService;
    let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
    beforeEach(() => {
        mockSecurityAuditService = {
            recordAlert: jest.fn().mockResolvedValue(undefined)
        } as any;
        zkProofService = new ZKProofService(mockSecurityAuditService);
    });
    describe('generateProof', () => {
        it('should generate a valid proof', async () => {
            const mockProof = { pi_a: [], pi_b: [], pi_c: [] };
            const mockPublicSignals = ['1', '2', '3'];
            (snarkjs.groth16.fullProve as jest.Mock).mockResolvedValue({
                proof: mockProof,
                publicSignals: mockPublicSignals
            });
            const result = await zkProofService.generateProof('session123', Date.now(), new Uint8Array(32), [new Uint8Array(32)], { R8: new Uint8Array(32), S: new Uint8Array(32) });
            expect(result).toEqual({
                proof: mockProof,
                publicSignals: mockPublicSignals
            });
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('ZK_PROOF_GENERATED', 'LOW', expect.any(Object));
        });
        it('should handle errors during proof generation', async () => {
            const error = new Error('Proof generation failed');
            (snarkjs.groth16.fullProve as jest.Mock).mockRejectedValue(error);
            await expect(zkProofService.generateProof('session123', Date.now(), new Uint8Array(32), [new Uint8Array(32)], { R8: new Uint8Array(32), S: new Uint8Array(32) })).rejects.toThrow(error);
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('ZK_PROOF_ERROR', 'HIGH', expect.any(Object));
        });
    });
    describe('verifyProof', () => {
        it('should verify a valid proof', async () => {
            (snarkjs.groth16.verify as jest.Mock).mockResolvedValue(true);
            const result = await zkProofService.verifyProof({ pi_a: [], pi_b: [], pi_c: [] }, ['1', '2', '3']);
            expect(result).toBe(true);
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('ZK_PROOF_VERIFIED', 'LOW', expect.any(Object));
        });
        it('should handle verification errors', async () => {
            const error = new Error('Verification failed');
            (snarkjs.groth16.verify as jest.Mock).mockRejectedValue(error);
            await expect(zkProofService.verifyProof({ pi_a: [], pi_b: [], pi_c: [] }, ['1', '2', '3'])).rejects.toThrow(error);
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('ZK_PROOF_VERIFICATION_ERROR', 'HIGH', expect.any(Object));
        });
    });
});
