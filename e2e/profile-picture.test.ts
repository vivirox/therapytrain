import { test, expect } from '@playwright/test';
import path from 'path';
import { setupAuthState } from './helpers/auth';
import { TEST_CONFIG } from './test-config';

test.describe('Profile Picture Management', () => {
  test.beforeAll(async ({ browser }) => {
    // Set up authentication state
    const page = await browser.newPage();
    await setupAuthState(page, TEST_CONFIG.paths.authState);
    await page.close();
  });

  test.use({ storageState: TEST_CONFIG.paths.authState });

  test.beforeEach(async ({ page }) => {
    await page.goto('/profile');
  });

  test('should upload profile picture successfully', async ({ page }) => {
    // Setup test image
    const imagePath = path.join(TEST_CONFIG.paths.fixtures, 'test-profile-picture.jpg');
    
    // Get the file input
    const fileInput = page.locator('input[type="file"]');
    
    // Upload file
    await fileInput.setInputFiles(imagePath);
    
    // Check upload progress appears
    await expect(page.locator('[role="progressbar"]')).toBeVisible();
    
    // Wait for upload to complete
    await expect(page.locator('[role="img"]')).toBeVisible();
    
    // Verify success state
    await expect(page.locator('text="Failed to upload"')).not.toBeVisible();
  });

  test('should show error for invalid file type', async ({ page }) => {
    // Setup invalid file
    const invalidPath = path.join(TEST_CONFIG.paths.fixtures, 'invalid.txt');
    
    // Get the file input
    const fileInput = page.locator('input[type="file"]');
    
    // Upload invalid file
    await fileInput.setInputFiles(invalidPath);
    
    // Verify error message
    await expect(page.locator('text="Please upload an image file"')).toBeVisible();
  });

  test('should show error for large files', async ({ page }) => {
    // Setup large file
    const largePath = path.join(TEST_CONFIG.paths.fixtures, 'large-image.jpg');
    
    // Get the file input
    const fileInput = page.locator('input[type="file"]');
    
    // Upload large file
    await fileInput.setInputFiles(largePath);
    
    // Verify error message
    await expect(page.locator('text="Image size should be less than 5MB"')).toBeVisible();
  });

  test('should delete profile picture', async ({ page }) => {
    // First upload a picture
    const imagePath = path.join(TEST_CONFIG.paths.fixtures, 'test-profile-picture.jpg');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(imagePath);
    await expect(page.locator('[role="img"]')).toBeVisible();
    
    // Click delete button
    await page.click('text="Remove Picture"');
    
    // Verify picture is removed
    await expect(page.locator('[role="img"] >> text="P"')).toBeVisible(); // Fallback initial
  });

  test('should handle drag and drop', async ({ page }) => {
    // Setup drag event data
    const dataTransfer = {
      files: [
        new File(['test image content'], 'test.jpg', { type: 'image/jpeg' })
      ]
    };

    // Trigger drag events
    await page.dispatchEvent('[data-testid="dropzone"]', 'dragenter', { dataTransfer });
    
    // Verify drag active state
    await expect(page.locator('text="Drop the image here"')).toBeVisible();
    
    // TODO: Complete drag and drop test once implemented in Playwright
  });
}); 