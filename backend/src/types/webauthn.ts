import {
    GenerateRegistrationOptionsOpts,
    VerifyRegistrationResponseOpts,
    VerifyAuthenticationResponseOpts,
    RegistrationResponseJSON,
    AuthenticationResponseJSON
} from '@simplewebauthn/server';

export type AttestationConveyancePreference = 'none' | 'direct' | 'enterprise' | 'indirect';

export interface WebAuthnRegistrationOptions extends Omit<GenerateRegistrationOptionsOpts, 'attestationType'> {
    attestationType?: AttestationConveyancePreference;
}

export interface WebAuthnRegistrationResult {
    verified: boolean;
    registrationInfo?: {
        credentialID: string;
        credentialPublicKey: string;
        counter: number;
        credentialDeviceType: string;
        credentialBackedUp: boolean;
    };
}

export interface WebAuthnAuthenticationResult {
    verified: boolean;
    authenticationInfo?: {
        credentialID: string;
        newCounter: number;
    };
}

export interface WebAuthnService {
    generateRegistrationOptions(userId: string, username: string): Promise<WebAuthnRegistrationOptions>;
    verifyRegistrationResponse(body: RegistrationResponseJSON, opts: VerifyRegistrationResponseOpts): Promise<WebAuthnRegistrationResult>;
    generateAuthenticationOptions(userId: string): Promise<any>;
    verifyAuthenticationResponse(body: AuthenticationResponseJSON, opts: VerifyAuthenticationResponseOpts): Promise<WebAuthnAuthenticationResult>;
}

export interface WebAuthnCredential {
    id: string;
    userId: string;
    credentialId: string;
    publicKey: string;
    counter: number;
    deviceType: string;
    backedUp: boolean;
    transports?: string[];
    createdAt: Date;
    lastUsed?: Date;
}

export interface WebAuthnUser {
    id: string;
    username: string;
    credentials: WebAuthnCredential[];
    registrationChallenge?: string;
    authenticationChallenge?: string;
}

export interface WebAuthnConfig {
    rpName: string;
    rpID: string;
    origin: string;
    timeout: number;
    attestation: AttestationConveyancePreference;
    authenticatorSelection: {
        authenticatorAttachment?: 'platform' | 'cross-platform';
        residentKey?: 'required' | 'preferred' | 'discouraged';
        userVerification?: 'required' | 'preferred' | 'discouraged';
    };
}

export type AuthenticatorTransport = 'usb' | 'nfc' | 'ble' | 'internal';
export type AuthenticatorAttachment = 'platform' | 'cross-platform';
export type UserVerificationRequirement = 'required' | 'preferred' | 'discouraged'; 