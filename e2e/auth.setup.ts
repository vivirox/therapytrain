import { test as setup } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { setupAuthState } from './helpers/auth';
import { TEST_CONFIG } from './test-config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

setup('authenticate', async ({ browser }) => {
  // Ensure auth directory exists
  await fs.mkdir(TEST_CONFIG.paths.auth, { recursive: true });
  
  // Create a new page
  const page = await browser.newPage();
  
  // Set up authentication state
  await setupAuthState(page, TEST_CONFIG.paths.authState);
  
  // Close the page
  await page.close();
}); 