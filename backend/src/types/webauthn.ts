import type {
  GenerateRegistrationOptionsOpts,
  VerifyRegistrationResponseOpts,
  GenerateAuthenticationOptionsOpts,
  VerifyAuthenticationResponseOpts,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse
} from '@simplewebauthn/server';

export interface WebAuthnCredential {
  id: string;
  userId: string;
  credentialId: Uint8Array;
  publicKey: Uint8Array;
  counter: number;
  transports?: AuthenticatorTransport[];
  createdAt: Date;
  lastUsed?: Date;
}

export interface WebAuthnUser {
  id: string;
  name: string;
  displayName: string;
  credentials: WebAuthnCredential[];
}

export interface WebAuthnConfig {
  rpName: string;
  rpID: string;
  origin: string;
  timeout: number;
  challengeSize: number;
  attestationType: AttestationConveyancePreference;
  authenticatorAttachment?: AuthenticatorAttachment;
  userVerification: UserVerificationRequirement;
  debug?: boolean;
}

export interface WebAuthnRegistrationOptions extends GenerateRegistrationOptionsOpts {
  userId: string;
  userName: string;
  userDisplayName: string;
  attestationType?: AttestationConveyancePreference;
  authenticatorAttachment?: AuthenticatorAttachment;
  requireResidentKey?: boolean;
  userVerification?: UserVerificationRequirement;
}

export interface WebAuthnAuthenticationOptions extends GenerateAuthenticationOptionsOpts {
  userVerification?: UserVerificationRequirement;
  timeout?: number;
}

export interface WebAuthnRegistrationResult extends VerifiedRegistrationResponse {
  credentialId: string;
  userId: string;
}

export interface WebAuthnAuthenticationResult extends VerifiedAuthenticationResponse {
  credentialId: string;
  userId: string;
  counter: number;
}

export interface WebAuthnService {
  generateRegistrationOptions(opts: WebAuthnRegistrationOptions): Promise<PublicKeyCredentialCreationOptionsJSON>;
  verifyRegistrationResponse(body: RegistrationResponseJSON, opts: VerifyRegistrationResponseOpts): Promise<WebAuthnRegistrationResult>;
  generateAuthenticationOptions(opts: WebAuthnAuthenticationOptions): Promise<PublicKeyCredentialRequestOptionsJSON>;
  verifyAuthenticationResponse(body: AuthenticationResponseJSON, opts: VerifyAuthenticationResponseOpts): Promise<WebAuthnAuthenticationResult>;
}

export type AuthenticatorTransport = 'usb' | 'nfc' | 'ble' | 'internal';
export type AttestationConveyancePreference = 'none' | 'indirect' | 'direct' | 'enterprise';
export type AuthenticatorAttachment = 'platform' | 'cross-platform';
export type UserVerificationRequirement = 'required' | 'preferred' | 'discouraged'; 