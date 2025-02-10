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
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(5);
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
    it('should complete password reset with valid token', async () => {
      const mockToken = {
        id: 'token-123',
        user_id: 'user-123',
        token: 'hashed-token',
        expires_at: new Date(Date.now() + 3600000).toISOString()
      };

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'password_reset_tokens') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(() => ({
                  gt: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({ data: mockToken })
                  }))
                }))
              }))
            }))
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { email: 'test@example.com' } })
            }))
          }))
        };
      });

      await service.completeReset('valid-token', 'NewStrongP@ssw0rd');

      expect(supabase.from).toHaveBeenCalledWith('password_reset_tokens');
      expect(supabase.from).toHaveBeenCalledWith('users');
    });

    it('should reject invalid token', async () => {
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
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
      const mockToken = {
        id: 'token-123',
        user_id: 'user-123',
        token: 'hashed-token',
        expires_at: new Date(Date.now() + 3600000).toISOString()
      };

      vi.mocked(supabase.from).mockImplementationOnce(() => ({
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

    it('should update password for valid credentials', async () => {
      vi.mocked(service['verifyPassword']).mockResolvedValueOnce(true);
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockUser })
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({})
        })),
        insert: vi.fn().mockResolvedValue({}),
        transaction: vi.fn(async (callback) => await callback({ from: vi.fn() }))
      }));

      await service.updatePassword('user-123', 'CurrentP@ssw0rd', 'NewStrongP@ssw0rd');

      expect(supabase.from).toHaveBeenCalledWith('users');
    });

    it('should reject incorrect current password', async () => {
      vi.mocked(service['verifyPassword']).mockResolvedValueOnce(false);
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockUser })
          }))
        }))
      }));

      await expect(service.updatePassword('user-123', 'WrongP@ssw0rd', 'NewStrongP@ssw0rd'))
        .rejects.toThrow(AuthError);
    });

    it('should reject weak new password', async () => {
      vi.mocked(service['verifyPassword']).mockResolvedValueOnce(true);
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockUser })
          }))
        }))
      }));

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