import { test, expect, type Page } from '@playwright/test';
import {
  login,
  logout,
  setupTestUser,
  defaultUser,
  clearLoginAttempts,
  attemptLoginWithIncorrectPassword,
  checkPasswordStrength,
  waitForToast,
  fillPasswordForm,
} from './helpers/auth';

test.describe('Authentication Edge Cases', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.beforeEach(async () => {
    await setupTestUser(page);
  });

  test.afterEach(async () => {
    await clearLoginAttempts(defaultUser.email);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('Login Rate Limiting', () => {
    test('should reset failed attempts after successful login', async () => {
      await logout(page);
      
      // Make some failed attempts
      for (let i = 0; i < 3; i++) {
        await attemptLoginWithIncorrectPassword(page, defaultUser.email);
      }
      
      // Login successfully
      await login(page);
      await logout(page);
      
      // Should be able to make failed attempts again
      for (let i = 0; i < 3; i++) {
        await attemptLoginWithIncorrectPassword(page, defaultUser.email);
        await expect(page.locator('text=Invalid email or password')).toBeVisible();
      }
    });

    test('should count failed attempts across sessions', async () => {
      await logout(page);
      
      // Make failed attempts in first session
      for (let i = 0; i < 3; i++) {
        await attemptLoginWithIncorrectPassword(page, defaultUser.email);
      }
      
      // Create new session
      const newContext = await page.context().browser()?.newContext();
      const newPage = await newContext?.newPage();
      if (!newPage) throw new Error('Failed to create new page');
      
      // Make more failed attempts in new session
      for (let i = 0; i < 2; i++) {
        await attemptLoginWithIncorrectPassword(newPage, defaultUser.email);
      }
      
      // Should be locked out
      await expect(newPage.locator('text=Account temporarily locked')).toBeVisible();
      
      await newPage.close();
      await newContext.close();
    });
  });

  test.describe('Password Validation Edge Cases', () => {
    test('should handle unicode passwords correctly', async () => {
      await page.goto('/settings/password');
      
      // Try password with unicode characters
      const unicodePassword = 'StrongP@ssw🔒rd123';
      await fillPasswordForm(page, {
        currentPassword: defaultUser.password,
        newPassword: unicodePassword,
      });
      
      await page.click('button[type="submit"]');
      await waitForToast('Password updated successfully');
      
      // Verify can login with new password
      await logout(page);
      await login(page, { ...defaultUser, password: unicodePassword });
    });

    test('should handle maximum password length', async () => {
      await page.goto('/settings/password');
      
      // Try very long password
      const longPassword = 'V'.repeat(100) + 'eryLongP@ssw0rd';
      await fillPasswordForm(page, {
        currentPassword: defaultUser.password,
        newPassword: longPassword,
      });
      
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Password is too long')).toBeVisible();
    });

    test('should prevent common passwords', async () => {
      await page.goto('/settings/password');
      
      const commonPasswords = [
        'Password123!',
        'Welcome123!',
        'Admin123!',
      ];
      
      for (const password of commonPasswords) {
        await fillPasswordForm(page, {
          currentPassword: defaultUser.password,
          newPassword: password,
        });
        
        await page.click('button[type="submit"]');
        await expect(page.locator('text=This is a commonly used password')).toBeVisible();
      }
    });
  });

  test.describe('Password Reset Edge Cases', () => {
    test('should handle expired reset tokens', async () => {
      await logout(page);
      
      // Generate an expired token (implementation would depend on your token generation)
      const expiredToken = 'expired-token';
      
      await page.goto(`/auth/reset-password/complete?token=${expiredToken}`);
      await fillPasswordForm(page, {
        currentPassword: '',
        newPassword: 'NewStrongP@ssw0rd123',
      });
      
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Reset token has expired')).toBeVisible();
    });

    test('should prevent reuse of reset tokens', async () => {
      await logout(page);
      const token = await generateValidResetToken(defaultUser.email);
      
      // First reset
      await page.goto(`/auth/reset-password/complete?token=${token}`);
      await fillPasswordForm(page, {
        currentPassword: '',
        newPassword: 'NewStrongP@ssw0rd123',
      });
      await page.click('button[type="submit"]');
      await waitForToast('Password has been reset successfully');
      
      // Try to use same token again
      await page.goto(`/auth/reset-password/complete?token=${token}`);
      await fillPasswordForm(page, {
        currentPassword: '',
        newPassword: 'AnotherStrongP@ssw0rd123',
      });
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Invalid or expired reset token')).toBeVisible();
    });
  });

  test.describe('Password Strength Edge Cases', () => {
    test('should correctly evaluate password strength patterns', async () => {
      await page.goto('/settings/password');
      
      const testCases = [
        { password: 'abcdefghijklmnop', expected: 'weak' }, // Length only
        { password: 'ABCDEFGHIJKLMNOP', expected: 'weak' }, // Uppercase only
        { password: 'abcd1234EFGH', expected: 'medium' }, // Mixed case and numbers
        { password: 'abcd1234EFGH!@#$', expected: 'strong' }, // All character types
        { password: 'aaaa1111AAAA!!!!', expected: 'medium' }, // Repetitive patterns
        { password: 'Password123!', expected: 'weak' }, // Common pattern
      ];
      
      for (const { password, expected } of testCases) {
        const strength = await checkPasswordStrength(page, password);
        expect(strength).toBe(expected);
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should support keyboard navigation', async () => {
      await logout(page);
      await page.goto('/auth/login');
      
      // Navigate form with keyboard
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => document.activeElement?.getAttribute('placeholder'))).toBe('Email');
      
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => document.activeElement?.getAttribute('placeholder'))).toBe('Password');
      
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => document.activeElement?.tagName.toLowerCase())).toBe('button');
      
      // Fill form with keyboard
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.type(defaultUser.email);
      await page.keyboard.press('Tab');
      await page.keyboard.type(defaultUser.password);
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      
      await page.waitForURL('/dashboard');
    });

    test('should announce form errors to screen readers', async () => {
      await page.goto('/settings/password');
      
      // Submit empty form
      await page.click('button[type="submit"]');
      
      // Check for ARIA attributes on error messages
      await expect(page.locator('[role="alert"]')).toBeVisible();
      await expect(page.locator('[aria-invalid="true"]')).toHaveCount(3);
    });
  });
}); 