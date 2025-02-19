import { test, expect } from '@playwright/test';
import { getWebSocketUtils } from './utils/websocket';
import { createTestUser, createTestThread, cleanupTestData } from '../db/utils';

test.describe('User Presence', () => {
  const wsUtils = getWebSocketUtils();
  let testUser1: any;
  let testUser2: any;
  let testThread: any;

  test.beforeAll(async () => {
    // Create test users and thread
    testUser1 = await createTestUser();
    testUser2 = await createTestUser();
    testThread = await createTestThread(testUser1.id);
  });

  test.afterAll(async () => {
    await cleanupTestData();
    await wsUtils.closeAllConnections();
  });

  test.beforeEach(async () => {
    await wsUtils.closeAllConnections();
  });

  test('should track online status', async ({ page }) => {
    // Login as testUser1
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser1.email);
    await page.fill('input[type="password"]', testUser1.password);
    await page.click('button[type="submit"]');

    // Navigate to chat thread
    await page.goto(`/chat/${testThread.id}`);

    // Connect to WebSocket
    const ws1 = await wsUtils.createConnection(
      `ws://localhost:3000/api/chat?userId=${testUser1.id}&threadId=${testThread.id}`,
      testUser1.id
    );

    // Verify user1 shows as online
    await expect(page.locator(`[data-user-id="${testUser1.id}"] .status-indicator`))
      .toHaveClass(/online/);

    // Connect testUser2
    const ws2 = await wsUtils.createConnection(
      `ws://localhost:3000/api/chat?userId=${testUser2.id}&threadId=${testThread.id}`,
      testUser2.id
    );

    // Verify presence event received for user2
    const presenceEvent = await wsUtils.waitForMessage(testUser1.id, 'presence_update');
    expect(presenceEvent.payload.userId).toBe(testUser2.id);
    expect(presenceEvent.payload.status).toBe('online');

    // Disconnect user2
    await wsUtils.closeConnection(testUser2.id);

    // Verify offline status event received
    const offlineEvent = await wsUtils.waitForMessage(testUser1.id, 'presence_update');
    expect(offlineEvent.payload.userId).toBe(testUser2.id);
    expect(offlineEvent.payload.status).toBe('offline');
  });

  test('should handle typing indicators', async ({ page }) => {
    // Login and connect both users
    const ws1 = await wsUtils.createConnection(
      `ws://localhost:3000/api/chat?userId=${testUser1.id}&threadId=${testThread.id}`,
      testUser1.id
    );
    const ws2 = await wsUtils.createConnection(
      `ws://localhost:3000/api/chat?userId=${testUser2.id}&threadId=${testThread.id}`,
      testUser2.id
    );

    // Simulate user1 typing
    await wsUtils.sendMessage(testUser1.id, 'typing_start', {
      threadId: testThread.id
    });

    // Verify typing indicator shown for user2
    const typingEvent = await wsUtils.waitForMessage(testUser2.id, 'typing_update');
    expect(typingEvent.payload.userId).toBe(testUser1.id);
    expect(typingEvent.payload.isTyping).toBe(true);

    // Simulate user1 stopped typing
    await wsUtils.sendMessage(testUser1.id, 'typing_stop', {
      threadId: testThread.id
    });

    // Verify typing stopped event
    const stoppedEvent = await wsUtils.waitForMessage(testUser2.id, 'typing_update');
    expect(stoppedEvent.payload.userId).toBe(testUser1.id);
    expect(stoppedEvent.payload.isTyping).toBe(false);
  });

  test('should handle multiple typing users', async ({ page }) => {
    // Connect three users
    const ws1 = await wsUtils.createConnection(
      `ws://localhost:3000/api/chat?userId=${testUser1.id}&threadId=${testThread.id}`,
      testUser1.id
    );
    const ws2 = await wsUtils.createConnection(
      `ws://localhost:3000/api/chat?userId=${testUser2.id}&threadId=${testThread.id}`,
      testUser2.id
    );

    // Start both users typing
    await wsUtils.sendMessage(testUser1.id, 'typing_start', {
      threadId: testThread.id
    });
    await wsUtils.sendMessage(testUser2.id, 'typing_start', {
      threadId: testThread.id
    });

    // Verify typing indicator shows multiple users
    await expect(page.locator('.typing-indicator'))
      .toHaveText(/2 people are typing/);

    // Stop one user typing
    await wsUtils.sendMessage(testUser1.id, 'typing_stop', {
      threadId: testThread.id
    });

    // Verify indicator updates
    await expect(page.locator('.typing-indicator'))
      .toHaveText(/1 person is typing/);
  });

  test('should handle connection state changes', async ({ page }) => {
    // Login and connect
    const ws = await wsUtils.createConnection(
      `ws://localhost:3000/api/chat?userId=${testUser1.id}&threadId=${testThread.id}`,
      testUser1.id,
      { autoReconnect: true }
    );

    // Verify initial connected state
    await expect(page.locator('.connection-status'))
      .toHaveText('Connected');

    // Simulate connection drop
    await wsUtils.simulateConnectionDrop(testUser1.id);

    // Verify connecting state
    await expect(page.locator('.connection-status'))
      .toHaveText('Connecting...');

    // Wait for reconnection
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify reconnected
    await expect(page.locator('.connection-status'))
      .toHaveText('Connected');
  });

  test('should sync presence after reconnection', async ({ page }) => {
    // Connect both users
    const ws1 = await wsUtils.createConnection(
      `ws://localhost:3000/api/chat?userId=${testUser1.id}&threadId=${testThread.id}`,
      testUser1.id,
      { autoReconnect: true }
    );
    const ws2 = await wsUtils.createConnection(
      `ws://localhost:3000/api/chat?userId=${testUser2.id}&threadId=${testThread.id}`,
      testUser2.id
    );

    // Simulate connection drop for user1
    await wsUtils.simulateConnectionDrop(testUser1.id);

    // Verify user1 shows as offline to user2
    const offlineEvent = await wsUtils.waitForMessage(testUser2.id, 'presence_update');
    expect(offlineEvent.payload.userId).toBe(testUser1.id);
    expect(offlineEvent.payload.status).toBe('offline');

    // Wait for reconnection
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify user1 shows as online again
    const onlineEvent = await wsUtils.waitForMessage(testUser2.id, 'presence_update');
    expect(onlineEvent.payload.userId).toBe(testUser1.id);
    expect(onlineEvent.payload.status).toBe('online');
  });

  test('should handle offline message queueing', async ({ page }) => {
    // Connect user1 with offline support
    const ws1 = await wsUtils.createConnection(
      `ws://localhost:3000/api/chat?userId=${testUser1.id}&threadId=${testThread.id}`,
      testUser1.id,
      { autoReconnect: true }
    );

    // Simulate offline state
    await wsUtils.simulateConnectionDrop(testUser1.id);

    // Try to send messages while offline
    const offlineMessages = [
      'Message 1 while offline',
      'Message 2 while offline',
      'Message 3 while offline'
    ];

    for (const content of offlineMessages) {
      await wsUtils.sendMessage(testUser1.id, 'message', {
        content,
        threadId: testThread.id
      });
    }

    // Wait for reconnection
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify messages are sent after reconnection
    for (const content of offlineMessages) {
      const deliveryConfirmation = await wsUtils.waitForMessage(testUser1.id, 'message_delivered');
      expect(deliveryConfirmation.payload.content).toBe(content);
    }
  });
}); 