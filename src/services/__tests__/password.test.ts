import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PasswordService } from '../password';
import { supabase } from '@/lib/supabaseclient';
import { AuthError } from '@/types/auth';

// Mock dependencies
vi.mock('@/lib/supabaseclient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              data: []
            }))
          })),
        })),
        is: vi.fn(() => ({
          gt: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      })),
      insert: vi.fn(),
      update: vi.fn(() => ({
        eq: vi.fn()
      })),
      transaction: vi.fn(async (callback) => await callback({ from: vi.fn() }))
    }))
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

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
    vi.clearAllMocks();
  });

  describe('validatePassword', () => {
    it('should validate a strong password', () => {
      const result = service.validatePassword('StrongP@ssw0rd');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject a weak password', () => {
      const result = service.validatePassword('weak');
      console.log('Password validation results:', {
        valid: result.valid,
        errorCount: result.errors.length,
        errors: result.errors.map(e => e.trim()),
        requirements: {
          length: result.errors.some(e => e.includes('length')),
          numbers: result.errors.some(e => e.includes('number')),
          symbols: result.errors.some(e => e.includes('symbol')),
          uppercase: result.errors.some(e => e.includes('uppercase')),
          lowercase: result.errors.some(e => e.includes('lowercase'))
        }
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(5);
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
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockUser })
          }))
        })),
        insert: vi.fn().mockResolvedValue({}),
      }));

      await service.initiateReset('test@example.com');

      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(supabase.from).toHaveBeenCalledWith('password_reset_tokens');
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