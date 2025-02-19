import { test, expect } from '@playwright/test';
import { getEmailUtils } from './utils/email';
import { createTestUser, cleanupTestData } from '../db/utils';

test.describe('Password Reset Flow', () => {
  const emailUtils = getEmailUtils();
  let testUser: { email: string; password: string };

  test.beforeAll(async () => {
    testUser = await createTestUser();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test.beforeEach(async () => {
    await emailUtils.clearInbox();
  });

  test('should handle password reset request', async ({ page }) => {
    // Navigate to forgot password page
    await page.goto('/forgot-password');
    await expect(page).toHaveTitle(/Forgot Password/);

    // Submit email for password reset
    await page.fill('input[type="email"]', testUser.email);
    await page.click('button[type="submit"]');

    // Verify success message
    await expect(page.locator('.success-message')).toContainText('sent');
    
    // Get and verify reset email
    const email = await emailUtils.getLatestEmail();
    const token = await emailUtils.verifyResetEmail(email);
    expect(token).toBeDefined();
  });

  test('should handle invalid reset token', async ({ page }) => {
    await page.goto('/reset-password?token=invalid-token');
    
    // Verify error message
    await expect(page.locator('.error-message')).toContainText('invalid or expired');
  });

  test('should reset password with valid token', async ({ page }) => {
    // Request password reset
    await page.goto('/forgot-password');
    await page.fill('input[type="email"]', testUser.email);
    await page.click('button[type="submit"]');

    // Get reset token
    const email = await emailUtils.getLatestEmail();
    const token = await emailUtils.verifyResetEmail(email);

    // Navigate to reset page with token
    await page.goto(`/reset-password?token=${token}`);
    
    // Enter new password
    const newPassword = 'NewSecurePass123!';
    await page.fill('input[name="password"]', newPassword);
    await page.fill('input[name="confirmPassword"]', newPassword);
    await page.click('button[type="submit"]');

    // Verify success message
    await expect(page.locator('.success-message')).toContainText('successfully reset');

    // Verify can login with new password
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', newPassword);
    await page.click('button[type="submit"]');
    
    // Verify successful login
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should enforce password requirements', async ({ page }) => {
    // Request password reset
    await page.goto('/forgot-password');
    await page.fill('input[type="email"]', testUser.email);
    await page.click('button[type="submit"]');

    const email = await emailUtils.getLatestEmail();
    const token = await emailUtils.verifyResetEmail(email);
    await page.goto(`/reset-password?token=${token}`);

    // Test weak password
    await page.fill('input[name="password"]', 'weak');
    await page.fill('input[name="confirmPassword"]', 'weak');
    await page.click('button[type="submit"]');

    // Verify error message
    await expect(page.locator('.error-message')).toContainText('password requirements');
  });

  test('should handle rate limiting', async ({ page }) => {
    // Submit multiple requests quickly
    await page.goto('/forgot-password');
    
    for (let i = 0; i < 5; i++) {
      await page.fill('input[type="email"]', testUser.email);
      await page.click('button[type="submit"]');
    }

    // Verify rate limit message
    await expect(page.locator('.error-message')).toContainText('too many requests');
  });

  test('should handle used reset token', async ({ page }) => {
    // Request password reset
    await page.goto('/forgot-password');
    await page.fill('input[type="email"]', testUser.email);
    await page.click('button[type="submit"]');

    const email = await emailUtils.getLatestEmail();
    const token = await emailUtils.verifyResetEmail(email);

    // Use token first time
    await page.goto(`/reset-password?token=${token}`);
    await page.fill('input[name="password"]', 'ValidPass123!');
    await page.fill('input[name="confirmPassword"]', 'ValidPass123!');
    await page.click('button[type="submit"]');

    // Try to use same token again
    await page.goto(`/reset-password?token=${token}`);
    
    // Verify error message
    await expect(page.locator('.error-message')).toContainText('already been used');
  });
}); 