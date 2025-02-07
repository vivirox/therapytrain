import { WebAuthnService } from "../WebAuthnService";
import { SecurityAuditService } from "../../services/SecurityAuditService";
import { webAuthnConfig } from "../../config/security.config";
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
jest.mock('@simplewebauthn/server');
jest.mock('../../services/SecurityAuditService');
describe('WebAuthnService', () => {
    let webAuthnService: WebAuthnService;
    let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
    const mockUserId = 'test-user-id';
    const mockUsername = 'test-user';
    const mockDevice = {
        credentialID: Buffer.from('test-credential-id'),
        credentialPublicKey: Buffer.from('test-public-key'),
        counter: 0,
        transports: ['usb', 'nfc'] as AuthenticatorTransport[]
    };
    beforeEach(() => {
        mockSecurityAuditService = {
            recordAlert: jest.fn()
        } as any;
        webAuthnService = new WebAuthnService(mockSecurityAuditService);
        // Reset all mocks
        jest.clearAllMocks();
    });
    describe('Registration', () => {
        beforeEach(() => {
            (generateRegistrationOptions as jest.Mock).mockResolvedValue({
                challenge: 'test-challenge',
                rp: {
                    name: webAuthnConfig.rpName,
                    id: webAuthnConfig.rpID
                }
            });
        });
        it('should generate registration options successfully', async () => {
            const options = await webAuthnService.generateRegistrationOptions(mockUserId, mockUsername, [mockDevice]);
            expect(generateRegistrationOptions).toHaveBeenCalledWith(expect.objectContaining({
                rpName: webAuthnConfig.rpName,
                rpID: webAuthnConfig.rpID,
                userID: mockUserId,
                userName: mockUsername
            }));
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('WEBAUTHN_REGISTRATION_STARTED', 'LOW', expect.objectContaining({
                userId: mockUserId,
                username: mockUsername
            }));
            expect(options).toBeDefined();
        });
        it('should handle registration option generation errors', async () => {
            const error = new Error('Registration failed');
            (generateRegistrationOptions as jest.Mock).mockRejectedValue(error);
            await expect(webAuthnService.generateRegistrationOptions(mockUserId, mockUsername)).rejects.toThrow(error);
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('WEBAUTHN_REGISTRATION_ERROR', 'HIGH', expect.objectContaining({
                userId: mockUserId,
                username: mockUsername,
                error: error.message
            }));
        });
    });
    describe('Authentication', () => {
        beforeEach(() => {
            (generateAuthenticationOptions as jest.Mock).mockResolvedValue({
                challenge: 'test-challenge',
                timeout: webAuthnConfig.challengeTimeout,
                rpID: webAuthnConfig.rpID
            });
            (verifyAuthenticationResponse as jest.Mock).mockResolvedValue({
                verified: true,
                authenticationInfo: {
                    newCounter: 1
                }
            });
        });
        it('should generate authentication options successfully', async () => {
            const options = await webAuthnService.generateAuthenticationOptions([mockDevice]);
            expect(generateAuthenticationOptions).toHaveBeenCalledWith(expect.objectContaining({
                timeout: webAuthnConfig.challengeTimeout,
                rpID: webAuthnConfig.rpID
            }));
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('WEBAUTHN_AUTH_STARTED', 'LOW', expect.objectContaining({
                deviceCount: 1
            }));
            expect(options).toBeDefined();
        });
        it('should verify authentication successfully', async () => {
            const mockOptions = {
                response: {},
                expectedChallenge: 'test-challenge'
            };
            const result = await webAuthnService.verifyAuthentication(mockDevice, mockOptions);
            expect(verifyAuthenticationResponse).toHaveBeenCalledWith(expect.objectContaining({
                response: mockOptions.response,
                expectedChallenge: mockOptions.expectedChallenge,
                expectedOrigin: webAuthnConfig.origin,
                expectedRPID: webAuthnConfig.rpID
            }));
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('WEBAUTHN_AUTH_SUCCESS', 'LOW', expect.objectContaining({
                credentialId: mockDevice.credentialID.toString('base64'),
                newCounter: 1
            }));
            expect(result.verified).toBe(true);
        });
        it('should handle authentication verification failure', async () => {
            (verifyAuthenticationResponse as jest.Mock).mockResolvedValue({
                verified: false
            });
            const mockOptions = {
                response: {},
                expectedChallenge: 'test-challenge'
            };
            const result = await webAuthnService.verifyAuthentication(mockDevice, mockOptions);
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('WEBAUTHN_AUTH_FAILED', 'HIGH', expect.objectContaining({
                credentialId: mockDevice.credentialID.toString('base64')
            }));
            expect(result.verified).toBe(false);
        });
        it('should handle authentication errors', async () => {
            const error = new Error('Authentication failed');
            (verifyAuthenticationResponse as jest.Mock).mockRejectedValue(error);
            const mockOptions = {
                response: {},
                expectedChallenge: 'test-challenge'
            };
            await expect(webAuthnService.verifyAuthentication(mockDevice, mockOptions)).rejects.toThrow(error);
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith('WEBAUTHN_AUTH_ERROR', 'HIGH', expect.objectContaining({
                credentialId: mockDevice.credentialID.toString('base64'),
                error: error.message
            }));
        });
    });
});
