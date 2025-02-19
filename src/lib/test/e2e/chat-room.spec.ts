import { test, expect } from '@playwright/test';
import { getWebSocketUtils } from './utils/websocket';
import { createTestUser, createTestThread, cleanupTestData } from '../db/utils';

test.describe('Chat Room Management', () => {
  const wsUtils = getWebSocketUtils();
  let testUser1: any;
  let testUser2: any;
  let testUser3: any;

  test.beforeAll(async () => {
    // Create test users
    testUser1 = await createTestUser();
    testUser2 = await createTestUser();
    testUser3 = await createTestUser();
  });

  test.afterAll(async () => {
    await cleanupTestData();
    await wsUtils.closeAllConnections();
  });

  test.beforeEach(async () => {
    await wsUtils.closeAllConnections();
  });

  test('should create a new chat room', async ({ page }) => {
    // Login as testUser1
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser1.email);
    await page.fill('input[type="password"]', testUser1.password);
    await page.click('button[type="submit"]');

    // Navigate to chat page
    await page.goto('/chat');

    // Click create new chat button
    await page.click('button[aria-label="Create new chat"]');

    // Fill room details
    await page.fill('input[name="roomName"]', 'Test Chat Room');
    await page.selectOption('select[name="roomType"]', 'group');
    
    // Add participants
    await page.fill('input[name="participants"]', testUser2.email);
    await page.press('input[name="participants"]', 'Enter');
    await page.fill('input[name="participants"]', testUser3.email);
    await page.press('input[name="participants"]', 'Enter');

    // Create room
    await page.click('button[type="submit"]');

    // Verify room is created
    await expect(page.locator('.room-title')).toHaveText('Test Chat Room');
    await expect(page.locator('.participant-count')).toContainText('3');
  });

  test('should join existing chat room', async ({ page }) => {
    // Create a test thread first
    const thread = await createTestThread(testUser1.id);

    // Login as testUser2
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser2.email);
    await page.fill('input[type="password"]', testUser2.password);
    await page.click('button[type="submit"]');

    // Navigate to room invitation
    await page.goto(`/chat/join/${thread.id}`);

    // Accept invitation
    await page.click('button[aria-label="Join chat"]');

    // Verify joined successfully
    await expect(page.locator('.room-title')).toBeVisible();
    await expect(page.locator('.participant-list')).toContainText(testUser2.email);

    // Verify WebSocket connection is established
    const ws = await wsUtils.createConnection(
      `ws://localhost:3000/api/chat?userId=${testUser2.id}&threadId=${thread.id}`,
      testUser2.id
    );
    expect(wsUtils.isConnected(testUser2.id)).toBe(true);
  });

  test('should manage room participants', async ({ page }) => {
    // Create a test thread
    const thread = await createTestThread(testUser1.id);

    // Login as room owner (testUser1)
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser1.email);
    await page.fill('input[type="password"]', testUser1.password);
    await page.click('button[type="submit"]');

    // Navigate to room settings
    await page.goto(`/chat/${thread.id}/settings`);

    // Add participant
    await page.click('button[aria-label="Add participant"]');
    await page.fill('input[name="newParticipant"]', testUser2.email);
    await page.click('button[aria-label="Confirm add participant"]');

    // Verify participant added
    await expect(page.locator('.participant-list')).toContainText(testUser2.email);

    // Remove participant
    await page.click(`button[aria-label="Remove ${testUser2.email}"]`);
    await page.click('button[aria-label="Confirm remove"]');

    // Verify participant removed
    await expect(page.locator('.participant-list')).not.toContainText(testUser2.email);
  });

  test('should update room settings', async ({ page }) => {
    // Create a test thread
    const thread = await createTestThread(testUser1.id);

    // Login as room owner
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser1.email);
    await page.fill('input[type="password"]', testUser1.password);
    await page.click('button[type="submit"]');

    // Navigate to room settings
    await page.goto(`/chat/${thread.id}/settings`);

    // Update room name
    await page.fill('input[name="roomName"]', 'Updated Room Name');
    
    // Update room type
    await page.selectOption('select[name="roomType"]', 'private');
    
    // Update notification settings
    await page.click('button[aria-label="Notification settings"]');
    await page.click('input[name="notifications.mentions"]');
    
    // Save changes
    await page.click('button[type="submit"]');

    // Verify changes
    await expect(page.locator('.room-title')).toHaveText('Updated Room Name');
    await expect(page.locator('.room-type')).toContainText('Private');
    
    // Verify notification settings
    await page.click('button[aria-label="Notification settings"]');
    await expect(page.locator('input[name="notifications.mentions"]')).toBeChecked();
  });

  test('should handle room access control', async ({ page }) => {
    // Create a private test thread
    const thread = await createTestThread(testUser1.id, {
      type: 'private',
      participants: [testUser1.id]
    });

    // Login as non-participant (testUser2)
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser2.email);
    await page.fill('input[type="password"]', testUser2.password);
    await page.click('button[type="submit"]');

    // Try to access private room
    await page.goto(`/chat/${thread.id}`);

    // Verify access denied
    await expect(page.locator('.error-message')).toContainText('Access denied');

    // Try to connect via WebSocket
    try {
      await wsUtils.createConnection(
        `ws://localhost:3000/api/chat?userId=${testUser2.id}&threadId=${thread.id}`,
        testUser2.id
      );
      throw new Error('Should not be able to connect');
    } catch (error) {
      expect(error.message).toContain('Access denied');
    }
  });

  test('should handle room deletion', async ({ page }) => {
    // Create a test thread
    const thread = await createTestThread(testUser1.id);

    // Login as room owner
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser1.email);
    await page.fill('input[type="password"]', testUser1.password);
    await page.click('button[type="submit"]');

    // Navigate to room settings
    await page.goto(`/chat/${thread.id}/settings`);

    // Delete room
    await page.click('button[aria-label="Delete room"]');
    await page.click('button[aria-label="Confirm delete"]');

    // Verify redirected to chat list
    await expect(page).toHaveURL('/chat');

    // Verify room not in list
    await expect(page.locator(`[data-room-id="${thread.id}"]`)).not.toBeVisible();

    // Verify cannot connect to deleted room
    try {
      await wsUtils.createConnection(
        `ws://localhost:3000/api/chat?userId=${testUser1.id}&threadId=${thread.id}`,
        testUser1.id
      );
      throw new Error('Should not be able to connect');
    } catch (error) {
      expect(error.message).toContain('Room not found');
    }
  });

  test('should persist room state', async ({ page }) => {
    // Create a test thread with specific settings
    const thread = await createTestThread(testUser1.id, {
      name: 'Persistent Room',
      type: 'group',
      settings: {
        notifications: {
          mentions: true,
          all: false
        },
        encryption: 'enabled'
      }
    });

    // Login as owner
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser1.email);
    await page.fill('input[type="password"]', testUser1.password);
    await page.click('button[type="submit"]');

    // Navigate to room
    await page.goto(`/chat/${thread.id}`);

    // Verify settings persisted
    await expect(page.locator('.room-title')).toHaveText('Persistent Room');
    await expect(page.locator('.encryption-status')).toContainText('Encrypted');
    
    // Check notification settings
    await page.click('button[aria-label="Notification settings"]');
    await expect(page.locator('input[name="notifications.mentions"]')).toBeChecked();
    await expect(page.locator('input[name="notifications.all"]')).not.toBeChecked();

    // Reload page and verify state remains
    await page.reload();
    await expect(page.locator('.room-title')).toHaveText('Persistent Room');
    await expect(page.locator('.encryption-status')).toContainText('Encrypted');
  });
}); 