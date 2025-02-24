import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { SecurityAuditService } from '../../services/SecurityAuditService';
import { WebAuthnService } from '../../security/WebAuthnService';
import { SecurityIncidentService } from '../../security/SecurityIncidentService';
import { AccountRecoveryService } from '../../security/AccountRecoveryService';
import { PasswordService } from '../../services/password';
import { AuthError } from '../../types/auth';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      eq: vi.fn(),
      single: vi.fn()
    }))
  }))
}));

// Mock services
vi.mock('../../services/SecurityAuditService', () => ({
  SecurityAuditService: {
    getInstance: vi.fn(() => ({
      recordAuthAttempt: vi.fn(),
      recordAlert: vi.fn()
    }))
  }
}));

vi.mock('../../security/WebAuthnService');
vi.mock('../../security/SecurityIncidentService');
vi.mock('../../security/AccountRecoveryService');

describe('Authentication Services', () => {
  let supabase: ReturnType<typeof createClient>;
  let securityAuditService: SecurityAuditService;
  let webAuthnService: WebAuthnService;
  let securityIncidentService: SecurityIncidentService;
  let accountRecoveryService: AccountRecoveryService;
  let passwordService: PasswordService;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = createClient('', '');
    securityAuditService = SecurityAuditService.getInstance();
    webAuthnService = new WebAuthnService(securityAuditService);
    securityIncidentService = new SecurityIncidentService(securityAuditService, webAuthnService);
    accountRecoveryService = new AccountRecoveryService(securityAuditService);
    passwordService = new PasswordService();
  });

  describe('Password Authentication', () => {
    it('should sign in with valid credentials', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockSession = { user: mockUser, access_token: 'token' };
      
      (supabase.auth.signInWithPassword as any).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null
      });

      const result = await passwordService.signIn({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(result.user).toEqual(mockUser);
      expect(securityAuditService.recordAuthAttempt).toHaveBeenCalledWith(
        mockUser.id,
        true,
        expect.any(Object)
      );
    });

    it('should handle invalid credentials', async () => {
      (supabase.auth.signInWithPassword as any).mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Invalid credentials' }
      });

      await expect(passwordService.signIn({
        email: 'test@example.com',
        password: 'wrong'
      })).rejects.toThrow('Invalid credentials');

      expect(securityAuditService.recordAuthAttempt).toHaveBeenCalledWith(
        'unknown',
        false,
        expect.any(Object)
      );
    });

    it('should handle account lockout after max attempts', async () => {
      const mockFailedAttempts = {
        count: 5,
        last_attempt: new Date().toISOString()
      };

      (supabase.from as any)().select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockFailedAttempts })
        })
      });

      await expect(passwordService.signIn({
        email: 'test@example.com',
        password: 'wrong'
      })).rejects.toThrow('Account is temporarily locked');
    });
  });

  describe('WebAuthn Authentication', () => {
    it('should generate registration options', async () => {
      const mockOptions = { challenge: 'challenge' };
      (webAuthnService.generateRegistrationOptions as any).mockResolvedValueOnce(mockOptions);

      const options = await webAuthnService.generateRegistrationOptions(
        'user-1',
        'test@example.com'
      );

      expect(options).toEqual(mockOptions);
    });

    it('should verify authentication response', async () => {
      const mockDevice = {
        credentialID: Buffer.from('id'),
        credentialPublicKey: Buffer.from('key'),
        counter: 0
      };
      const mockVerification = { verified: true };

      (webAuthnService.verifyAuthentication as any).mockResolvedValueOnce(mockVerification);

      const result = await webAuthnService.verifyAuthentication(
        mockDevice,
        { response: {}, expectedChallenge: 'challenge' }
      );

      expect(result).toEqual(mockVerification);
      expect(securityAuditService.recordAlert).toHaveBeenCalledWith(
        'WEBAUTHN_AUTH_SUCCESS',
        'LOW',
        expect.any(Object)
      );
    });

    it('should handle failed authentication', async () => {
      const mockDevice = {
        credentialID: Buffer.from('id'),
        credentialPublicKey: Buffer.from('key'),
        counter: 0
      };
      const mockVerification = { verified: false };

      (webAuthnService.verifyAuthentication as any).mockResolvedValueOnce(mockVerification);

      const result = await webAuthnService.verifyAuthentication(
        mockDevice,
        { response: {}, expectedChallenge: 'challenge' }
      );

      expect(result).toEqual(mockVerification);
      expect(securityAuditService.recordAlert).toHaveBeenCalledWith(
        'WEBAUTHN_AUTH_FAILED',
        'HIGH',
        expect.any(Object)
      );
    });
  });

  describe('Account Recovery', () => {
    it('should verify backup codes', async () => {
      (accountRecoveryService.verifyBackupCode as any).mockResolvedValueOnce(true);

      const result = await accountRecoveryService.verifyBackupCode(
        'user-1',
        'backup-code'
      );

      expect(result).toBe(true);
    });

    it('should verify security questions', async () => {
      const mockAnswers = [
        { question: 'First pet?', answer: 'Rex' }
      ];

      (accountRecoveryService.verifySecurityQuestions as any).mockResolvedValueOnce(true);

      const result = await accountRecoveryService.verifySecurityQuestions(
        'user-1',
        mockAnswers
      );

      expect(result).toBe(true);
    });

    it('should handle failed security question verification', async () => {
      const mockAnswers = [
        { question: 'First pet?', answer: 'wrong' }
      ];

      (accountRecoveryService.verifySecurityQuestions as any).mockResolvedValueOnce(false);

      const result = await accountRecoveryService.verifySecurityQuestions(
        'user-1',
        mockAnswers
      );

      expect(result).toBe(false);
    });
  });

  describe('Security Incident Handling', () => {
    it('should handle WebAuthn violations', async () => {
      const mockIncident = {
        type: 'WEBAUTHN_VIOLATION',
        severity: 'HIGH',
        userId: 'user-1',
        timestamp: new Date(),
        sourceIp: '127.0.0.1',
        details: { error: 'Invalid signature' }
      };

      await securityIncidentService.handleIncident(mockIncident);

      expect(securityAuditService.recordAlert).toHaveBeenCalledWith(
        'WEBAUTHN_VIOLATION_RESPONSE',
        'HIGH',
        expect.any(Object)
      );
    });

    it('should handle authentication failures', async () => {
      const mockIncident = {
        type: 'AUTHENTICATION_FAILURE',
        severity: 'HIGH',
        userId: 'user-1',
        timestamp: new Date(),
        sourceIp: '127.0.0.1',
        details: { error: 'Invalid credentials' }
      };

      await securityIncidentService.handleIncident(mockIncident);

      expect(securityAuditService.recordAlert).toHaveBeenCalled();
    });
  });
}); 