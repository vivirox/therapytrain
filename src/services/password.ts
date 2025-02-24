import { supabase } from '@/lib/supabaseClient';
import { AuthError } from '@/types/auth';
import { generateToken, hashToken, verifyToken } from '@/utils/token';
import { sendEmail } from '@/utils/email';
import { createHash, randomBytes } from 'crypto';
import { promisify } from 'util';

const randomBytesAsync = promisify(randomBytes);

interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  hashedToken: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

interface PasswordPolicy {
  minLength: number;
  requireNumbers: boolean;
  requireSymbols: boolean;
  requireUppercase: boolean;
  requireLowercase: boolean;
  maxAttempts: number;
  lockoutDuration: number;
  historySize: number;
}

const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  requireNumbers: true,
  requireSymbols: true,
  requireUppercase: true,
  requireLowercase: true,
  maxAttempts: 5,
  lockoutDuration: 30 * 60 * 1000, // 30 minutes
  historySize: 5, // Remember last 5 passwords
};

export class PasswordService {
  private policy: PasswordPolicy;

  constructor(policy: Partial<PasswordPolicy> = {}) {
    this.policy = { ...DEFAULT_PASSWORD_POLICY, ...policy };
  }

  /**
   * Validate password against policy
   */
  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check length
    if (password.length < this.policy.minLength) {
      errors.push(`Password must be at least ${this.policy.minLength} characters long`);
    }

    // Check for numbers
    if (this.policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Check for symbols (expanded pattern)
    if (this.policy.requireSymbols && !/[!@#$%^&*(),.?":{}|<>\-_=+[\]\\;'`~]/.test(password)) {
      errors.push('Password must contain at least one symbol');
    }

    // Check for uppercase
    if (this.policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Check for lowercase
    if (this.policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if password was used before
   */
  private async checkPasswordHistory(userId: string, newPassword: string): Promise<boolean> {
    const { data: history } = await supabase
      .from('password_history')
      .select('hash')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(this.policy.historySize);

    if (!history) return false;

    const newHash = await this.hashPassword(newPassword);
    return history.some(entry => entry.hash === newHash);
  }

  /**
   * Hash password for storage
   */
  private async hashPassword(password: string): Promise<string> {
    const salt = await randomBytesAsync(16);
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
        if (err) reject(err);
        resolve(salt.toString('hex') + ':' + derivedKey.toString('hex'));
      });
    });
  }

  /**
   * Verify password against stored hash
   */
  private async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [salt, hash] = storedHash.split(':');
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, Buffer.from(salt, 'hex'), 100000, 64, 'sha512', (err, derivedKey) => {
        if (err) reject(err);
        resolve(derivedKey.toString('hex') === hash);
      });
    });
  }

  /**
   * Check and update failed attempts
   */
  private async checkFailedAttempts(userId: string): Promise<void> {
    const { data: attempts } = await supabase
      .from('failed_attempts')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (attempts) {
      if (attempts.count >= this.policy.maxAttempts && 
          new Date(attempts.last_attempt).getTime() + this.policy.lockoutDuration > Date.now()) {
        throw new AuthError({
          code: 'account_locked',
          message: 'Account is temporarily locked. Please try again later.',
        });
      }

      if (new Date(attempts.last_attempt).getTime() + this.policy.lockoutDuration < Date.now()) {
        // Reset if lockout period has passed
        await supabase
          .from('failed_attempts')
          .update({ count: 1, last_attempt: new Date().toISOString() })
          .eq('user_id', userId);
      } else {
        // Increment attempts
        await supabase
          .from('failed_attempts')
          .update({ 
            count: attempts.count + 1,
            last_attempt: new Date().toISOString()
          })
          .eq('user_id', userId);
      }
    } else {
      // Create new record
      await supabase
        .from('failed_attempts')
        .insert({
          user_id: userId,
          count: 1,
          last_attempt: new Date().toISOString()
        });
    }
  }

  /**
   * Reset failed attempts
   */
  private async resetFailedAttempts(userId: string): Promise<void> {
    await supabase
      .from('failed_attempts')
      .update({ count: 0, last_attempt: new Date().toISOString() })
      .eq('user_id', userId);
  }

  /**
   * Initiate password reset process
   */
  async initiateReset(email: string): Promise<void> {
    try {
      // Find user
      const { data: user } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single();

      if (!user) {
        // Return success even if user not found to prevent email enumeration
        return;
      }

      // Generate reset token
      const token = await generateToken();
      const hashedToken = hashToken(token);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      // Store token
      await supabase
        .from('password_reset_tokens')
        .insert({
          user_id: user.id,
          token: hashedToken,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
        });

      // Create reset URL
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

      // Send reset email
      await sendEmail({
        to: email,
        subject: 'Password Reset Request',
        template: 'password-reset',
        context: {
          resetUrl,
          expiresIn: '30 minutes',
        },
      });
    } catch (error) {
      console.error('Password reset initiation failed:', error);
      throw new AuthError({
        code: 'password_reset_failed',
        message: 'Failed to initiate password reset',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    }
  }

  /**
   * Complete password reset
   */
  async completeReset(token: string, newPassword: string): Promise<void> {
    try {
      const hashedToken = hashToken(token);

      // Find valid token
      const { data: resetToken } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('token', hashedToken)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!resetToken) {
        throw new AuthError({
          code: 'invalid_token',
          message: 'Invalid or expired reset token',
        });
      }

      // Validate new password
      const { valid, errors } = this.validatePassword(newPassword);
      if (!valid) {
        throw new AuthError({
          code: 'invalid_password',
          message: 'Invalid password',
          details: { errors },
        });
      }

      // Check password history
      const wasUsed = await this.checkPasswordHistory(resetToken.user_id, newPassword);
      if (wasUsed) {
        throw new AuthError({
          code: 'password_reuse',
          message: 'Password was used before. Please choose a different password.',
        });
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update password and add to history
      await supabase.transaction(async (tx) => {
        // Update password
        await tx
          .from('users')
          .update({ 
            password_hash: hashedPassword,
            updated_at: new Date().toISOString()
          })
          .eq('id', resetToken.user_id);

        // Add to history
        await tx
          .from('password_history')
          .insert({
            user_id: resetToken.user_id,
            hash: hashedPassword,
            created_at: new Date().toISOString(),
          });

        // Mark token as used
        await tx
          .from('password_reset_tokens')
          .update({ used_at: new Date().toISOString() })
          .eq('id', resetToken.id);

        // Reset failed attempts
        await this.resetFailedAttempts(resetToken.user_id);
      });

      // Get user email
      const { data: user } = await supabase
        .from('users')
        .select('email')
        .eq('id', resetToken.user_id)
        .single();

      // Send confirmation email
      if (user) {
        await sendEmail({
          to: user.email,
          subject: 'Password Reset Successful',
          template: 'password-reset-success',
          context: {
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError({
        code: 'password_reset_failed',
        message: 'Failed to reset password',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    }
  }

  /**
   * Update password for authenticated user
   */
  async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Get current password hash
      const { data: user } = await supabase
        .from('users')
        .select('email, password_hash')
        .eq('id', userId)
        .single();

      if (!user) {
        throw new AuthError({
          code: 'user_not_found',
          message: 'User not found',
        });
      }

      // Verify current password
      const isValid = await this.verifyPassword(currentPassword, user.password_hash);
      if (!isValid) {
        await this.checkFailedAttempts(userId);
        throw new AuthError({
          code: 'invalid_password',
          message: 'Current password is incorrect',
        });
      }

      // Validate new password
      const { valid, errors } = this.validatePassword(newPassword);
      if (!valid) {
        throw new AuthError({
          code: 'invalid_password',
          message: 'Invalid password',
          details: { errors },
        });
      }

      // Check password history
      const wasUsed = await this.checkPasswordHistory(userId, newPassword);
      if (wasUsed) {
        throw new AuthError({
          code: 'password_reuse',
          message: 'Password was used before. Please choose a different password.',
        });
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update password and add to history
      await supabase.transaction(async (tx) => {
        // Update password
        await tx
          .from('users')
          .update({ 
            password_hash: hashedPassword,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        // Add to history
        await tx
          .from('password_history')
          .insert({
            user_id: userId,
            hash: hashedPassword,
            created_at: new Date().toISOString(),
          });

        // Reset failed attempts
        await this.resetFailedAttempts(userId);
      });

      // Send confirmation email
      await sendEmail({
        to: user.email,
        subject: 'Password Updated',
        template: 'password-updated',
        context: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError({
        code: 'password_update_failed',
        message: 'Failed to update password',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    }
  }
} 