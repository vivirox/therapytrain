import { VerificationKeyService } from '../VerificationKeyService';
import { SecurityAuditService } from '../SecurityAuditService';
import { RateLimiterService } from '../RateLimiterService';
import fs from 'fs';
import path from 'path';

jest.mock('fs');
jest.mock('child_process');

describe('VerificationKeyService', () => {
    let verificationKeyService: VerificationKeyService;
    let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
    let mockRateLimiterService: jest.Mocked<RateLimiterService>;
    const mockRequesterId = 'test-requester';

    beforeEach(() => {
        mockSecurityAuditService = {
            recordAlert: jest.fn().mockResolvedValue(undefined)
        } as any;

        mockRateLimiterService = {
            checkRateLimit: jest.fn().mockResolvedValue(undefined)
        } as any;

        verificationKeyService = new VerificationKeyService(
            mockSecurityAuditService,
            mockRateLimiterService
        );

        // Mock filesystem operations
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
            key: 'test-key-content',
            version: 'v1',
            validFrom: Date.now(),
            validUntil: null,
            signature: 'test-signature'
        }));
    });

    describe('getCurrentKey', () => {
        it('should return the current verification key', async () => {
            const key = await verificationKeyService.getCurrentKey(mockRequesterId);
            
            expect(key).toBeDefined();
            expect(key.version).toBeDefined();
            expect(mockRateLimiterService.checkRateLimit).toHaveBeenCalledWith(
                mockRequesterId,
                'KEY_FETCH'
            );
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'KEY_FETCH',
                'LOW',
                expect.any(Object)
            );
        });

        it('should handle rate limit errors', async () => {
            mockRateLimiterService.checkRateLimit.mockRejectedValueOnce(
                new Error('Rate limit exceeded')
            );

            await expect(
                verificationKeyService.getCurrentKey(mockRequesterId)
            ).rejects.toThrow('Rate limit exceeded');

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'KEY_FETCH_ERROR',
                'HIGH',
                expect.any(Object)
            );
        });
    });

    describe('rotateKey', () => {
        it('should rotate keys successfully', async () => {
            await verificationKeyService.rotateKey();

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'KEY_ROTATION',
                'MEDIUM',
                expect.any(Object)
            );
        });

        it('should handle rotation errors', async () => {
            const error = new Error('Rotation failed');
            require('child_process').exec.mockImplementationOnce(
                (cmd: string, opts: any, callback: Function) => {
                    callback(error);
                }
            );

            await expect(verificationKeyService.rotateKey()).rejects.toThrow(error);

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'KEY_ROTATION_ERROR',
                'HIGH',
                expect.any(Object)
            );
        });
    });

    describe('revokeKey', () => {
        it('should revoke a key successfully', async () => {
            await verificationKeyService.revokeKey('v1', 'Security concern');

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'KEY_REVOCATION',
                'HIGH',
                expect.any(Object)
            );
        });

        it('should handle revocation errors', async () => {
            (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

            await expect(
                verificationKeyService.revokeKey('invalid-version', 'Test reason')
            ).rejects.toThrow();

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'KEY_REVOCATION_ERROR',
                'HIGH',
                expect.any(Object)
            );
        });
    });
});
