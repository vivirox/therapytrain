import { webAuthnConfig } from "../config/security.config";
import { SecurityAuditService } from "../services/SecurityAuditService";
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { GenerateRegistrationOptionsOpts, VerifyRegistrationResponseOpts, GenerateAuthenticationOptionsOpts, VerifyAuthenticationResponseOpts, VerifiedRegistrationResponse, VerifiedAuthenticationResponse } from '@simplewebauthn/server';
interface UserDevice {
    credentialID: Buffer;
    credentialPublicKey: Buffer;
    counter: number;
    transports?: AuthenticatorTransport[];
}
export class WebAuthnService {
    constructor(private readonly securityAuditService: SecurityAuditService) { }
    async generateRegistrationOptions(userId: string, username: string, existingDevices: UserDevice[] = []): Promise<GenerateRegistrationOptionsOpts> {
        try {
            const options = await generateRegistrationOptions({
                rpName: webAuthnConfig.rpName,
                rpID: webAuthnConfig.rpID,
                userID: userId,
                userName: username,
                timeout: webAuthnConfig.challengeTimeout,
                attestationType: webAuthnConfig.attestation,
                authenticatorSelection: {
                    authenticatorAttachment: webAuthnConfig.authenticatorAttachment,
                    requireResidentKey: false,
                    userVerification: 'preferred'
                },
                supportedAlgorithmIDs: webAuthnConfig.cryptoParams,
                excludeCredentials: existingDevices.map(device => ({
                    id: device.credentialID,
                    type: 'public-key',
                    transports: device.transports || []
                }))
            });
            await this.securityAuditService.recordAlert('WEBAUTHN_REGISTRATION_STARTED', 'LOW', { userId, username });
            return options;
        }
        catch (error) {
            await this.securityAuditService.recordAlert('WEBAUTHN_REGISTRATION_ERROR', 'HIGH', {
                userId,
                username,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async verifyRegistration(userId: string, username: string, options: VerifyRegistrationResponseOpts): Promise<VerifiedRegistrationResponse> {
        try {
            const verification = await verifyRegistrationResponse({
                response: options.response,
                expectedChallenge: options.expectedChallenge,
                expectedOrigin: webAuthnConfig.origin,
                expectedRPID: webAuthnConfig.rpID,
                requireUserVerification: true
            });
            if (verification.verified) {
                await this.securityAuditService.recordAlert('WEBAUTHN_REGISTRATION_SUCCESS', 'LOW', {
                    userId,
                    username,
                    credentialId: verification.registrationInfo?.credentialID.toString('base64')
                });
            }
            else {
                await this.securityAuditService.recordAlert('WEBAUTHN_REGISTRATION_FAILED', 'HIGH', { userId, username });
            }
            return verification;
        }
        catch (error) {
            await this.securityAuditService.recordAlert('WEBAUTHN_REGISTRATION_ERROR', 'HIGH', {
                userId,
                username,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async generateAuthenticationOptions(existingDevices: UserDevice[] = []): Promise<GenerateAuthenticationOptionsOpts> {
        try {
            const options = await generateAuthenticationOptions({
                timeout: webAuthnConfig.challengeTimeout,
                allowCredentials: existingDevices.map(device => ({
                    id: device.credentialID,
                    type: 'public-key',
                    transports: device.transports || []
                })),
                userVerification: 'preferred',
                rpID: webAuthnConfig.rpID
            });
            await this.securityAuditService.recordAlert('WEBAUTHN_AUTH_STARTED', 'LOW', { deviceCount: existingDevices.length });
            return options;
        }
        catch (error) {
            await this.securityAuditService.recordAlert('WEBAUTHN_AUTH_ERROR', 'HIGH', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async verifyAuthentication(device: UserDevice, options: VerifyAuthenticationResponseOpts): Promise<VerifiedAuthenticationResponse> {
        try {
            const verification = await verifyAuthenticationResponse({
                response: options.response,
                expectedChallenge: options.expectedChallenge,
                expectedOrigin: webAuthnConfig.origin,
                expectedRPID: webAuthnConfig.rpID,
                authenticator: {
                    credentialID: device.credentialID,
                    credentialPublicKey: device.credentialPublicKey,
                    counter: device.counter
                },
                requireUserVerification: true
            });
            if (verification.verified) {
                await this.securityAuditService.recordAlert('WEBAUTHN_AUTH_SUCCESS', 'LOW', {
                    credentialId: device.credentialID.toString('base64'),
                    newCounter: verification.authenticationInfo.newCounter
                });
            }
            else {
                await this.securityAuditService.recordAlert('WEBAUTHN_AUTH_FAILED', 'HIGH', {
                    credentialId: device.credentialID.toString('base64')
                });
            }
            return verification;
        }
        catch (error) {
            await this.securityAuditService.recordAlert('WEBAUTHN_AUTH_ERROR', 'HIGH', {
                credentialId: device.credentialID.toString('base64'),
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
}
