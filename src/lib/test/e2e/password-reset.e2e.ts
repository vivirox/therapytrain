import { describe, expect, it } from 'vitest';
import type { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer';
import { createTestUser, deleteTestUser } from './utils/user';
import { EmailTestUtils } from './utils/email';

describe('Password Reset Flow', () => {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test User'
  };

  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    await createTestUser(testUser);
  });

  afterAll(async () => {
    await deleteTestUser(testUser.email);
    await browser.close();
  });

  it('should successfully reset password', async () => {
    // Navigate to forgot password page
    await page.goto('http://localhost:3000/auth/forgot-password');
    
    // Submit forgot password form
    await page.type('[data-testid="email-input"]', testUser.email);
    await page.click('[data-testid="submit-button"]');
    
    // Verify success message
    const successMessage = await page.waitForSelector('[data-testid="success-message"]');
    if (!successMessage) {
      throw new Error('Success message not found');
    }
    const messageText = await successMessage.evaluate(el => el.textContent);
    expect(messageText).toContain('reset link');

    // Get reset token from email
    const emailUtils = await EmailTestUtils.getInstance();
    const resetEmail = await emailUtils.waitForEmail({
      to: testUser.email,
      subject: /password reset/i
    });

    if (!resetEmail || !resetEmail.html) {
      throw new Error('Reset email not received or missing HTML content');
    }

    // Extract reset token from email
    const resetLinkMatch = resetEmail.html.match(/href="([^"]*)/);
    if (!resetLinkMatch || !resetLinkMatch[1]) {
      throw new Error('Reset link not found in email');
    }

    const resetLink = resetLinkMatch[1];
    const resetToken = resetLink.split('token=')[1];
    
    if (!resetToken) {
      throw new Error('Reset token not found in reset link');
    }

    // Navigate to reset password page
    await page.goto(`http://localhost:3000/auth/reset-password?token=${resetToken}`);
    
    // Submit new password
    const newPassword = 'NewTestPassword123!';
    await page.type('[data-testid="password-input"]', newPassword);
    await page.type('[data-testid="confirm-password-input"]', newPassword);
    await page.click('[data-testid="submit-button"]');

    // Verify success message
    const resetSuccessMessage = await page.waitForSelector('[data-testid="success-message"]');
    if (!resetSuccessMessage) {
      throw new Error('Reset success message not found');
    }
    const resetMessageText = await resetSuccessMessage.evaluate(el => el.textContent);
    expect(resetMessageText).toContain('successfully reset');

    // Verify can login with new password
    await page.goto('http://localhost:3000/auth/login');
    await page.type('[data-testid="email-input"]', testUser.email);
    await page.type('[data-testid="password-input"]', newPassword);
    await page.click('[data-testid="submit-button"]');

    // Verify successful login
    const userMenu = await page.waitForSelector('[data-testid="user-menu"]');
    expect(userMenu).toBeTruthy();
  });

  it('should show error for invalid reset token', async () => {
    await page.goto('http://localhost:3000/auth/reset-password?token=invalid-token');
    
    // Submit new password
    const newPassword = 'NewTestPassword123!';
    await page.type('[data-testid="password-input"]', newPassword);
    await page.type('[data-testid="confirm-password-input"]', newPassword);
    await page.click('[data-testid="submit-button"]');

    // Verify error message
    const errorMessage = await page.waitForSelector('[data-testid="error-message"]');
    if (!errorMessage) {
      throw new Error('Error message not found');
    }
    const errorText = await errorMessage.evaluate(el => el.textContent);
    expect(errorText).toContain('invalid or expired');
  });

  it('should show error for expired reset token', async () => {
    // Generate an expired token (implementation depends on your token generation logic)
    const expiredToken = 'expired-token'; // You'll need to implement this based on your token system
    
    await page.goto(`http://localhost:3000/auth/reset-password?token=${expiredToken}`);
    
    // Submit new password
    const newPassword = 'NewTestPassword123!';
    await page.type('[data-testid="password-input"]', newPassword);
    await page.type('[data-testid="confirm-password-input"]', newPassword);
    await page.click('[data-testid="submit-button"]');

    // Verify error message
    const errorMessage = await page.waitForSelector('[data-testid="error-message"]');
    if (!errorMessage) {
      throw new Error('Error message not found');
    }
    const errorText = await errorMessage.evaluate(el => el.textContent);
    expect(errorText).toContain('invalid or expired');
  });

  it('should validate password requirements', async () => {
    await page.goto('http://localhost:3000/auth/forgot-password');
    await page.type('[data-testid="email-input"]', testUser.email);
    await page.click('[data-testid="submit-button"]');

    const emailUtils = await EmailTestUtils.getInstance();
    const resetEmail = await emailUtils.waitForEmail({
      to: testUser.email,
      subject: /password reset/i
    });

    if (!resetEmail || !resetEmail.html) {
      throw new Error('Reset email not received or missing HTML content');
    }

    const resetLinkMatch = resetEmail.html.match(/href="([^"]*)/);
    if (!resetLinkMatch || !resetLinkMatch[1]) {
      throw new Error('Reset link not found in email');
    }

    const resetToken = resetLinkMatch[1].split('token=')[1];
    if (!resetToken) {
      throw new Error('Reset token not found in reset link');
    }

    await page.goto(`http://localhost:3000/auth/reset-password?token=${resetToken}`);

    // Test too short password
    await page.type('[data-testid="password-input"]', 'short');
    await page.type('[data-testid="confirm-password-input"]', 'short');
    await page.click('[data-testid="submit-button"]');
    const shortError = await page.waitForSelector('[data-testid="password-error"]');
    if (!shortError) {
      throw new Error('Short password error message not found');
    }
    const shortErrorText = await shortError.evaluate(el => el.textContent);
    expect(shortErrorText).toContain('at least 8 characters');

    // Test password without number
    await page.type('[data-testid="password-input"]', 'NoNumberHere!');
    await page.type('[data-testid="confirm-password-input"]', 'NoNumberHere!');
    await page.click('[data-testid="submit-button"]');
    const numberError = await page.waitForSelector('[data-testid="password-error"]');
    if (!numberError) {
      throw new Error('Number requirement error message not found');
    }
    const numberErrorText = await numberError.evaluate(el => el.textContent);
    expect(numberErrorText).toContain('number');

    // Test password without special character
    await page.type('[data-testid="password-input"]', 'NoSpecial123');
    await page.type('[data-testid="confirm-password-input"]', 'NoSpecial123');
    await page.click('[data-testid="submit-button"]');
    const specialError = await page.waitForSelector('[data-testid="password-error"]');
    if (!specialError) {
      throw new Error('Special character error message not found');
    }
    const specialErrorText = await specialError.evaluate(el => el.textContent);
    expect(specialErrorText).toContain('special character');

    // Test mismatched passwords
    await page.type('[data-testid="password-input"]', 'ValidPass123!');
    await page.type('[data-testid="confirm-password-input"]', 'DifferentPass123!');
    await page.click('[data-testid="submit-button"]');
    const mismatchError = await page.waitForSelector('[data-testid="confirm-password-error"]');
    if (!mismatchError) {
      throw new Error('Password mismatch error message not found');
    }
    const mismatchErrorText = await mismatchError.evaluate(el => el.textContent);
    expect(mismatchErrorText).toContain('match');
  });
}); 