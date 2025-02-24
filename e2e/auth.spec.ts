import { test, expect, type Page } from '@playwright/test';
import {
  login,
  logout,
  setupTestUser,
  defaultUser,
  clearLoginAttempts,
  generateValidResetToken,
} from './helpers/auth';

test.describe('Authentication Flow', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.beforeEach(async () => {
    await setupTestUser(page);
    await login(page);
  });

  test.afterEach(async () => {
    await clearLoginAttempts(defaultUser.email);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('Password Change', () => {
    test('should show validation errors for weak passwords', async () => {
      await page.goto('/settings/password');
      
      // Fill in current password
      await page.fill('[placeholder="Current Password"]', defaultUser.password);
      
      // Try weak password
      await page.fill('[placeholder="New Password"]', 'weak');
      await page.fill('[placeholder="Confirm New Password"]', 'weak');
      
      await page.click('button[type="submit"]');
      
      // Check for validation errors
      await expect(page.locator('text=Password must be at least 12 characters')).toBeVisible();
      await expect(page.locator('text=Password must contain at least one uppercase letter')).toBeVisible();
      await expect(page.locator('text=Password must contain at least one number')).toBeVisible();
      await expect(page.locator('text=Password must contain at least one symbol')).toBeVisible();
    });

    test('should show error when passwords do not match', async () => {
      await page.goto('/settings/password');
      
      await page.fill('[placeholder="Current Password"]', defaultUser.password);
      await page.fill('[placeholder="New Password"]', 'StrongP@ssword123');
      await page.fill('[placeholder="Confirm New Password"]', 'DifferentP@ssword123');
      
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Passwords don\'t match')).toBeVisible();
    });

    test('should update password successfully', async () => {
      await page.goto('/settings/password');
      
      const newPassword = 'NewStrongP@ssword123';
      await page.fill('[placeholder="Current Password"]', defaultUser.password);
      await page.fill('[placeholder="New Password"]', newPassword);
      await page.fill('[placeholder="Confirm New Password"]', newPassword);
      
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Password updated successfully')).toBeVisible();
      
      // Verify can login with new password
      await logout(page);
      await login(page, { ...defaultUser, password: newPassword });
    });

    test('should show password strength indicator', async () => {
      await page.goto('/settings/password');
      
      // Test weak password
      await page.fill('[placeholder="New Password"]', 'weak');
      await expect(page.locator('.bg-red-500')).toBeVisible();
      
      // Test medium password
      await page.fill('[placeholder="New Password"]', 'MediumPass123');
      await expect(page.locator('.bg-orange-500, .bg-yellow-500')).toBeVisible();
      
      // Test strong password
      await page.fill('[placeholder="New Password"]', 'VeryStrongP@ssword123!');
      await expect(page.locator('.bg-green-500')).toBeVisible();
    });
  });

  test.describe('Password Reset', () => {
    test('should initiate password reset', async () => {
      await logout(page);
      await page.goto('/auth/reset-password');
      
      await page.fill('[placeholder="Email Address"]', defaultUser.email);
      await page.click('button:has-text("Send Reset Instructions")');
      
      await expect(page.locator('text=If an account exists with this email, you will receive password reset instructions')).toBeVisible();
    });

    test('should validate reset token', async () => {
      await logout(page);
      await page.goto('/auth/reset-password/complete');
      
      await page.fill('[placeholder="Reset Token"]', 'invalid-token');
      await page.fill('[placeholder="New Password"]', 'NewStrongP@ssword123');
      await page.fill('[placeholder="Confirm New Password"]', 'NewStrongP@ssword123');
      
      await page.click('button:has-text("Reset Password")');
      
      await expect(page.locator('text=Invalid or expired token')).toBeVisible();
    });

    test('should complete password reset', async () => {
      await logout(page);
      const token = await generateValidResetToken(defaultUser.email);
      await page.goto(`/auth/reset-password/complete?token=${token}`);
      
      const newPassword = 'NewStrongP@ssword123';
      await page.fill('[placeholder="New Password"]', newPassword);
      await page.fill('[placeholder="Confirm New Password"]', newPassword);
      
      await page.click('button:has-text("Reset Password")');
      
      await expect(page.locator('text=Password has been reset successfully')).toBeVisible();
      
      // Verify can login with new password
      await login(page, { ...defaultUser, password: newPassword });
    });
  });

  test.describe('Security Features', () => {
    test('should lock account after multiple failed attempts', async () => {
      await logout(page);
      await page.goto('/auth/login');
      
      // Attempt multiple failed logins
      for (let i = 0; i < 5; i++) {
        await page.fill('[placeholder="Email"]', defaultUser.email);
        await page.fill('[placeholder="Password"]', 'wrongpassword');
        await page.click('button[type="submit"]');
        
        if (i < 4) {
          await expect(page.locator('text=Invalid email or password')).toBeVisible();
        }
      }
      
      // Check for account lockout message
      await expect(page.locator('text=Account temporarily locked')).toBeVisible();
    });

    test('should enforce password history', async () => {
      await page.goto('/settings/password');
      
      // Try to reuse an old password
      await page.fill('[placeholder="Current Password"]', defaultUser.password);
      await page.fill('[placeholder="New Password"]', defaultUser.password);
      await page.fill('[placeholder="Confirm New Password"]', defaultUser.password);
      
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Password has been used previously')).toBeVisible();
    });
  });
}); 