import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { PasswordService } from '../password';
import { supabase } from '@/lib/supabaseClient';
import { AuthError } from '@/types/auth';
import { UserRepository } from '@/repositories/UserRepository';
import { RedisService } from '../RedisService';
import { EmailService } from '../EmailService';

// Mock dependencies
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  }
}));

vi.mock('@/utils/token', () => ({
  generateToken: vi.fn(() => 'test-token'),
  hashToken: vi.fn(() => 'hashed-token'),
  verifyToken: vi.fn(() => true)
}));

vi.mock('@/utils/email', () => ({
  sendEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendPasswordUpdatedEmail: vi.fn(),
  sendPasswordResetSuccessEmail: vi.fn()
}));

vi.mock('@/repositories/UserRepository');
vi.mock('../RedisService');
vi.mock('../EmailService');

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'mock-url';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-key';
});

describe('PasswordService', () => {
  let service: PasswordService;
  let userRepo: jest.Mocked<UserRepository>;
  let redisService: jest.Mocked<RedisService>;
  let emailService: jest.Mocked<EmailService>;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Setup mocks
    userRepo = {
      findByEmail: vi.fn(),
      updatePassword: vi.fn(),
      // ... other methods
    } as any;
    
    redisService = {
      set: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    } as any;
    
    emailService = {
      sendPasswordReset: vi.fn(),
    } as any;

    service = new PasswordService(userRepo, redisService, emailService);
  });

  describe('validatePassword', () => {
    it('should validate a strong password', () => {
      const result = service.validatePassword('StrongP@ssw0rd');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject a weak password', () => {
      const result = service.validatePassword('weak');
      expect(result.errors).toHaveLength(4);
      expect(result.errors).toContain('Password must be at least 8 characters long');
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
      expect(result.errors).toContain('Password must contain at least one number');
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should validate each requirement independently', () => {
      // Test each requirement independently
      const testCases = [
        {
          password: 'shortpw1!A',  // fails length only
          expectedError: 'Password must be at least 12 characters long'
        },
        {
          password: 'LongPassword!@#',  // fails numbers only
          expectedError: 'Password must contain at least one number'
        },
        {
          password: 'LongPassword123',  // fails symbols only
          expectedError: 'Password must contain at least one symbol'
        },
        {
          password: 'longpassword1!',  // fails uppercase only
          expectedError: 'Password must contain at least one uppercase letter'
        },
        {
          password: 'LONGPASSWORD1!',  // fails lowercase only
          expectedError: 'Password must contain at least one lowercase letter'
        }
      ];

      testCases.forEach(({ password, expectedError }) => {
        const result = service.validatePassword(password);
        console.log(`Testing password "${password}":`, {
          valid: result.valid,
          errors: result.errors
        });
        expect(result.errors).toContain(expectedError);
      });
    });

    it('should check for minimum length', () => {
      const result = service.validatePassword('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters long');
    });

    it('should check for numbers', () => {
      const result = service.validatePassword('StrongPassword!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should check for symbols', () => {
      const result = service.validatePassword('StrongPassword1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one symbol');
    });

    it('should check for uppercase letters', () => {
      const result = service.validatePassword('strongp@ssw0rd');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should check for lowercase letters', () => {
      const result = service.validatePassword('STRONGP@SSW0RD');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });
  });

  describe('initiateReset', () => {
    it('should initiate password reset for existing user', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockUser })
        })
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        insert: vi.fn().mockResolvedValue({}),
      } as any);

      await service.initiateReset('test@example.com');

      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(mockSelect).toHaveBeenCalled();
    });

    it('should handle non-existent user silently', async () => {
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null })
          }))
        }))
      }));

      await service.initiateReset('nonexistent@example.com');

      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(supabase.from).not.toHaveBeenCalledWith('password_reset_tokens');
    });

    it('should handle database errors', async () => {
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockRejectedValue(new Error('Database error'))
          }))
        }))
      }));

      await expect(service.initiateReset('test@example.com')).rejects.toThrow(AuthError);
    });
  });

  describe('completeReset', () => {
    const mockToken = {
      id: 'token-123',
      user_id: 'user-123',
      token: 'hashed-token',
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      used_at: null
    };

    beforeEach(() => {
      vi.spyOn(service as any, 'hashPassword').mockImplementation(() => Promise.resolve('new-hashed-password'));
      vi.spyOn(service as any, 'checkPasswordHistory').mockImplementation(() => Promise.resolve(false));
    });

    it('should complete password reset with valid token', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockToken })
              })
            })
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({})
          })
        }),
        insert: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({})
        })
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);
      vi.mocked(supabase.transaction).mockImplementation(async (callback) => await callback({ from: mockFrom }));

      await service.completeReset('valid-token', 'NewStrongP@ssw0rd');
      expect(supabase.from).toHaveBeenCalledWith('password_reset_tokens');
      expect(supabase.from).toHaveBeenCalledWith('users');
    });

    it('should reject invalid token', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              gt: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null })
              }))
            }))
          }))
        }))
      }));

      await expect(service.completeReset('invalid-token', 'NewStrongP@ssw0rd'))
        .rejects.toThrow(AuthError);
    });

    it('should reject weak password', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              gt: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockToken })
              }))
            }))
          }))
        }))
      }));

      await expect(service.completeReset('valid-token', 'weak'))
        .rejects.toThrow(AuthError);
    });
  });

  describe('updatePassword', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      password_hash: 'hashed-password'
    };

    beforeEach(() => {
      vi.spyOn(service as any, 'verifyPassword').mockImplementation(() => Promise.resolve(true));
      vi.spyOn(service as any, 'hashPassword').mockImplementation(() => Promise.resolve('new-hashed-password'));
      vi.spyOn(service as any, 'checkPasswordHistory').mockImplementation(() => Promise.resolve(false));
    });

    it('should update password for valid credentials', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockUser })
          })
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({})
        }),
        insert: vi.fn().mockResolvedValue({})
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);
      vi.mocked(supabase.transaction).mockImplementation(async (callback) => await callback({ from: mockFrom }));

      await service.updatePassword('user-123', 'CurrentP@ssw0rd', 'NewStrongP@ssw0rd');
      expect(supabase.from).toHaveBeenCalledWith('users');
    });

    it('should reject incorrect current password', async () => {
      vi.spyOn(service as any, 'verifyPassword').mockImplementation(() => Promise.resolve(false));
      
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockUser })
          })
        })
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      await expect(service.updatePassword('user-123', 'WrongP@ssw0rd', 'NewStrongP@ssw0rd'))
        .rejects.toThrow(AuthError);
    });

    it('should reject weak new password', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockUser })
          })
        })
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      await expect(service.updatePassword('user-123', 'CurrentP@ssw0rd', 'weak'))
        .rejects.toThrow(AuthError);
    });

    it('should handle non-existent user', async () => {
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null })
          }))
        }))
      }));

      await expect(service.updatePassword('nonexistent', 'CurrentP@ssw0rd', 'NewStrongP@ssw0rd'))
        .rejects.toThrow(AuthError);
    });
  });
}); 