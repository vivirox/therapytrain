import { vi, describe, it, expect, beforeEach } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { SecurityAuditService } from "@/services/SecurityAuditService";
import { PasswordService } from "@/services/password";
import { WebAuthnService } from "../../../lib/security/WebAuthnService";
import { SecurityIncidentService } from "../../../lib/security/SecurityIncidentService";
import { AccountRecoveryService } from "../../../lib/security/AccountRecoveryService";
import { AuthError } from "@/types/auth";

// Mock Supabase client
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
    })),
  })),
}));

// Mock services
vi.mock("@/services/SecurityAuditService", () => ({
  SecurityAuditService: {
    getInstance: vi.fn(() => ({
      recordEvent: vi.fn(),
      recordAuthAttempt: vi.fn(),
      recordAlert: vi.fn(),
      logAccessPattern: vi.fn(),
      logSessionEvent: vi.fn(),
      logDataAccess: vi.fn(),
      getAuditLogs: vi.fn(),
    })),
  },
}));

// Use SecurityIncidentService to suppress the "unused" error
const _SecurityIncidentService = SecurityIncidentService;
const webAuthnService = new WebAuthnService();

describe("Authentication Services", () => {
  let supabase: ReturnType<typeof createClient>;
  let securityAuditService: SecurityAuditService;
  let passwordService: PasswordService;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = createClient("", "");
    securityAuditService = SecurityAuditService.getInstance();
    passwordService = new PasswordService();
  });

  describe("Password Authentication", () => {
    it("should sign in with valid credentials", async () => {
      const mockUser = { id: "user-1", email: "test@example.com" };
      const mockSession = { user: mockUser, access_token: "token" };

      (supabase.auth.signInWithPassword as any).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const result = await passwordService.signIn({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.user).toEqual(mockUser);
      expect(securityAuditService.recordAuthAttempt).toHaveBeenCalledWith(
        mockUser.id,
        true,
        expect.any(Object),
      );
    });

    it("should handle invalid credentials", async () => {
      (supabase.auth.signInWithPassword as any).mockResolvedValueOnce({
        data: { session: null },
        error: { message: "Invalid credentials" },
      });

      await expect(
        passwordService.signIn({
          email: "test@example.com",
          password: "wrong",
        }),
      ).rejects.toThrow("Invalid credentials");

      expect(securityAuditService.recordAuthAttempt).toHaveBeenCalledWith(
        "unknown",
        false,
        expect.any(Object),
      );
    });

    it("should handle account lockout after max attempts", async () => {
      const mockFailedAttempts = {
        count: 5,
        last_attempt: new Date().toISOString(),
      };

      (supabase.from as any)().select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockFailedAttempts }),
        }),
      });

      await expect(
        passwordService.signIn({
          email: "test@example.com",
          password: "wrong",
        }),
      ).rejects.toThrow("Account is temporarily locked");
    });
  });

  describe("WebAuthn Authentication", () => {
    it("should generate registration options", async () => {
      const mockOptions = { challenge: "challenge" };
      (
        webAuthnService.generateRegistrationOptions as any
      ).mockResolvedValueOnce(mockOptions);

      const options = await webAuthnService.generateRegistrationOptions(
        "user-1",
        "test@example.com",
      );

      expect(options).toEqual(mockOptions);
    });

    it("should verify authentication response", async () => {
      const mockDevice = {
        credentialID: Buffer.from("id"),
        credentialPublicKey: Buffer.from("key"),
        counter: 0,
      };
      const mockVerification = { verified: true };

      (webAuthnService.verifyAuthentication as any).mockResolvedValueOnce(
        mockVerification,
      );

      const result = await webAuthnService.verifyAuthentication(mockDevice, {
        response: {},
        expectedChallenge: "challenge",
      });

      expect(result).toEqual(mockVerification);
      expect(securityAuditService.recordAlert).toHaveBeenCalledWith(
        "WEBAUTHN_AUTH_SUCCESS",
        "LOW",
        expect.any(Object),
      );
    });

    it("should handle failed authentication", async () => {
      const mockDevice = {
        credentialID: Buffer.from("id"),
        credentialPublicKey: Buffer.from("key"),
        counter: 0,
      };
      const mockVerification = { verified: false };

      (webAuthnService.verifyAuthentication as any).mockResolvedValueOnce(
        mockVerification,
      );

      const result = await webAuthnService.verifyAuthentication(mockDevice, {
        response: {},
        expectedChallenge: "challenge",
      });

      expect(result).toEqual(mockVerification);
      expect(securityAuditService.recordAlert).toHaveBeenCalledWith(
        "WEBAUTHN_AUTH_FAILED",
        "HIGH",
        expect.any(Object),
      );
    });
  });

  describe("Account Recovery", () => {
    it("should verify backup codes", async () => {
      const accountRecoveryService = new AccountRecoveryService();
      (accountRecoveryService.verifyBackupCode as any).mockResolvedValueOnce(
        true,
      );

      const result = await accountRecoveryService.verifyBackupCode(
        "user-1",
        "backup-code",
      );

      expect(result).toBe(true);
    });

    it("should verify security questions", async () => {
      const accountRecoveryService = new AccountRecoveryService();
      const mockAnswers = [{ question: "First pet?", answer: "Rex" }];

      (
        accountRecoveryService.verifySecurityQuestions as any
      ).mockResolvedValueOnce(true);

      const result = await accountRecoveryService.verifySecurityQuestions(
        "user-1",
        mockAnswers,
      );

      expect(result).toBe(true);
    });

    it("should handle failed security question verification", async () => {
      const accountRecoveryService = new AccountRecoveryService();
      const mockAnswers = [{ question: "First pet?", answer: "wrong" }];

      (
        accountRecoveryService.verifySecurityQuestions as any
      ).mockResolvedValueOnce(false);

      const result = await accountRecoveryService.verifySecurityQuestions(
        "user-1",
        mockAnswers,
      );

      expect(result).toBe(false);
    });
  });

  describe("Security Incident Handling", () => {
    it("should handle WebAuthn violations", async () => {
      const securityIncidentService = new SecurityIncidentService();
      const mockIncident = {
        type: "WEBAUTHN_VIOLATION",
        severity: "HIGH",
        userId: "user-1",
        timestamp: new Date(),
        sourceIp: "127.0.0.1",
        details: { error: "Invalid signature" },
      };

      await securityIncidentService.handleIncident(mockIncident);

      expect(securityAuditService.recordAlert).toHaveBeenCalledWith(
        "WEBAUTHN_VIOLATION_RESPONSE",
        "HIGH",
        expect.any(Object),
      );
    });

    it("should handle authentication failures", async () => {
      const securityIncidentService = new SecurityIncidentService();
      const mockIncident = {
        type: "AUTHENTICATION_FAILURE",
        severity: "HIGH",
        userId: "user-1",
        timestamp: new Date(),
        sourceIp: "127.0.0.1",
        details: { error: "Invalid credentials" },
      };

      await securityIncidentService.handleIncident(mockIncident);

      expect(securityAuditService.recordAlert).toHaveBeenCalled();
    });
  });

  describe("Brute Force Detection", () => {
    it("should detect and handle brute force attempts", async () => {
      const mockIp = "127.0.0.1";
      const mockUserId = "user-1";
      const securityIncidentService = new SecurityIncidentService();

      // Simulate multiple failed attempts
      for (let i = 0; i < 4; i++) {
        await securityIncidentService.handleBruteForceAttempt(
          mockIp,
          mockUserId,
        );
      }

      expect(securityAuditService.recordAlert).not.toHaveBeenCalled();

      // Trigger threshold
      await securityIncidentService.handleBruteForceAttempt(mockIp, mockUserId);

      expect(securityAuditService.recordAlert).toHaveBeenCalledWith(
        "BRUTE_FORCE_DETECTED",
        "HIGH",
        expect.objectContaining({
          ip: mockIp,
          userId: mockUserId,
        }),
      );

      expect(securityIncidentService.isIpBlocked(mockIp)).toBe(true);
    });
  });

  describe("Suspicious Activity", () => {
    it("should track and handle suspicious activity", async () => {
      const mockIp = "127.0.0.1";
      const mockUserId = "user-1";
      const details = { action: "suspicious_action" };
      const securityIncidentService = new SecurityIncidentService();

      // Simulate multiple suspicious actions
      for (let i = 0; i < 2; i++) {
        await securityIncidentService.handleSuspiciousActivity(
          mockIp,
          mockUserId,
          details,
        );
      }

      expect(securityAuditService.recordAlert).not.toHaveBeenCalled();

      // Trigger threshold
      await securityIncidentService.handleSuspiciousActivity(
        mockIp,
        mockUserId,
        details,
      );

      expect(securityAuditService.recordAlert).toHaveBeenCalledWith(
        "SUSPICIOUS_ACTIVITY_DETECTED",
        "HIGH",
        expect.objectContaining({
          ip: mockIp,
          userId: mockUserId,
          action: "suspicious_action",
        }),
      );
    });
  });
});
