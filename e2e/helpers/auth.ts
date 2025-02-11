import { type Page } from '@playwright/test';
import { resetTestDatabase, createResetToken, clearFailedLoginAttempts } from './db';

export interface LoginCredentials {
  email: string;
  password: string;
}

export const defaultUser: LoginCredentials = {
  email: 'test@example.com',
  password: 'TestP@ssword123',
};

export async function login(page: Page, credentials: LoginCredentials = defaultUser) {
  await page.goto('/auth/login');
  await page.fill('[placeholder="Email"]', credentials.email);
  await page.fill('[placeholder="Password"]', credentials.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

export async function logout(page: Page) {
  await page.goto('/settings');
  await page.click('button:has-text("Logout")');
  await page.waitForURL('/auth/login');
}

export async function createTestUser(page: Page, credentials: LoginCredentials = defaultUser) {
  await page.goto('/auth/register');
  await page.fill('[placeholder="Email"]', credentials.email);
  await page.fill('[placeholder="Password"]', credentials.password);
  await page.fill('[placeholder="Confirm Password"]', credentials.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

export async function resetDatabase() {
  await resetTestDatabase();
}

export async function generateValidResetToken(email: string): Promise<string> {
  return createResetToken(email);
}

export async function clearLoginAttempts(email: string) {
  await clearFailedLoginAttempts(email);
}

export async function setupTestUser(page: Page, credentials: LoginCredentials = defaultUser) {
  await resetDatabase();
  await createTestUser(page, credentials);
  await logout(page);
}

// Additional helper functions for edge cases
export async function attemptLoginWithIncorrectPassword(page: Page, email: string) {
  await page.goto('/auth/login');
  await page.fill('[placeholder="Email"]', email);
  await page.fill('[placeholder="Password"]', 'wrongpassword');
  await page.click('button[type="submit"]');
}

export async function checkPasswordStrength(page: Page, password: string): Promise<string> {
  await page.fill('[placeholder="New Password"]', password);
  
  const strengthIndicators = {
    '.bg-red-500': 'weak',
    '.bg-orange-500, .bg-yellow-500': 'medium',
    '.bg-green-500': 'strong'
  };

  for (const [selector, strength] of Object.entries(strengthIndicators)) {
    if (await page.locator(selector).isVisible()) {
      return strength;
    }
  }
  
  return 'unknown';
}

export async function waitForToast(page: Page, text: string) {
  await page.waitForSelector(`.toast:has-text("${text}")`, { timeout: 5000 });
}

export async function fillPasswordForm(page: Page, {
  currentPassword,
  newPassword,
  confirmPassword = newPassword
}: {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}) {
  await page.fill('[placeholder="Current Password"]', currentPassword);
  await page.fill('[placeholder="New Password"]', newPassword);
  await page.fill('[placeholder="Confirm New Password"]', confirmPassword);
} 