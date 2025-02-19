import { test, expect } from '@playwright/test';
import { createTestUser, createTestThread, cleanupTestData } from '../db/utils';
import { getWebSocketUtils } from './utils/websocket';
import { ChatService } from '@/services/chat';
import { supabase } from '@/lib/supabaseclient';

test.describe('Real-time Messaging', () => {
  const wsUtils = getWebSocketUtils();
  const chatService = new ChatService();
  let testUser1: any;
  let testUser2: any;
  let testThread: any;

  test.beforeAll(async () => {
    // Create test users and thread
    testUser1 = await createTestUser();
    testUser2 = await createTestUser();
    testThread = await createTestThread(testUser1.id);

    // Add testUser2 to thread
    await supabase
      .from('thread_participants')
      .insert({
        thread_id: testThread.id,
        user_id: testUser2.id,
        role: 'participant',
      });
  });

  test.afterAll(async () => {
    await cleanupTestData();
    await wsUtils.closeAllConnections();
  });

  test.beforeEach(async () => {
    await wsUtils.closeAllConnections();
  });

  test('websocket connection lifecycle', async ({ page }) => {
    // Step 1: Initial connection
    await test.step('initial connection', async () => {
      await page.goto(`/chat/${testThread.id}`);
      const ws = await wsUtils.createConnection(
        `ws://localhost:3000/api/chat?userId=${testUser1.id}&threadId=${testThread.id}`,
        testUser1.id
      );

      // Verify connection established
      const connectEvent = await wsUtils.waitForMessage(testUser1.id, 'connected');
      expect(connectEvent.clientId).toBeDefined();
      expect(wsUtils.isConnected(testUser1.id)).toBe(true);
    });

    // Step 2: Connection drop handling
    await test.step('connection drop handling', async () => {
      // Simulate connection drop
      await wsUtils.simulateConnectionDrop(testUser1.id);
      expect(wsUtils.isConnected(testUser1.id)).toBe(false);

      // Verify reconnection UI
      await expect(page.locator('.connection-status'))
        .toContainText('Reconnecting');
    });

    // Step 3: Automatic reconnection
    await test.step('automatic reconnection', async () => {
      // Wait for reconnection
      await new Promise(resolve => setTimeout(resolve, 2000));
      expect(wsUtils.isConnected(testUser1.id)).toBe(true);

      // Verify reconnection UI
      await expect(page.locator('.connection-status'))
        .toContainText('Connected');
    });

    // Step 4: Manual disconnection
    await test.step('manual disconnection', async () => {
      await page.click('button:has-text("Disconnect")');
      expect(wsUtils.isConnected(testUser1.id)).toBe(false);

      // Verify disconnection UI
      await expect(page.locator('.connection-status'))
        .toContainText('Disconnected');
    });
  });

  test('real-time message delivery', async ({ page }) => {
    // Step 1: Message sending and delivery
    await test.step('message delivery', async () => {
      // Connect both users
      const ws1 = await wsUtils.createConnection(
        `ws://localhost:3000/api/chat?userId=${testUser1.id}&threadId=${testThread.id}`,
        testUser1.id
      );
      const ws2 = await wsUtils.createConnection(
        `ws://localhost:3000/api/chat?userId=${testUser2.id}&threadId=${testThread.id}`,
        testUser2.id
      );

      // Send message from user1
      const messageContent = 'Test message with timestamp: ' + Date.now();
      await wsUtils.sendMessage(testUser1.id, 'message', {
        content: messageContent,
        threadId: testThread.id,
      });

      // Verify delivery to user2
      const deliveryEvent = await wsUtils.waitForMessage(testUser2.id, 'message');
      expect(deliveryEvent.payload.content).toBe(messageContent);

      // Verify delivery confirmation to user1
      const confirmationEvent = await wsUtils.waitForMessage(testUser1.id, 'message_delivered');
      expect(confirmationEvent.payload.status).toBe('delivered');
    });

    // Step 2: Message ordering
    await test.step('message ordering', async () => {
      // Send multiple messages quickly
      const messages = Array.from({ length: 5 }, (_, i) => `Message ${i + 1}`);
      
      for (const content of messages) {
        await wsUtils.sendMessage(testUser1.id, 'message', {
          content,
          threadId: testThread.id,
        });
      }

      // Verify messages received in order
      const receivedMessages = [];
      for (let i = 0; i < messages.length; i++) {
        const event = await wsUtils.waitForMessage(testUser2.id, 'message');
        receivedMessages.push(event.payload.content);
      }

      expect(receivedMessages).toEqual(messages);
    });

    // Step 3: Message persistence
    await test.step('message persistence', async () => {
      // Disconnect and reconnect user2
      await wsUtils.closeConnection(testUser2.id);
      const ws2 = await wsUtils.createConnection(
        `ws://localhost:3000/api/chat?userId=${testUser2.id}&threadId=${testThread.id}`,
        testUser2.id
      );

      // Verify message history loaded
      const history = await chatService.getMessageHistory(testUser2.id, testThread.id);
      expect(history.length).toBeGreaterThan(0);
      expect(history[history.length - 1].content).toBe('Message 5');
    });
  });

  test('typing indicators', async ({ page }) => {
    // Step 1: Typing indicator broadcast
    await test.step('typing broadcast', async () => {
      // Connect both users
      const ws1 = await wsUtils.createConnection(
        `ws://localhost:3000/api/chat?userId=${testUser1.id}&threadId=${testThread.id}`,
        testUser1.id
      );
      const ws2 = await wsUtils.createConnection(
        `ws://localhost:3000/api/chat?userId=${testUser2.id}&threadId=${testThread.id}`,
        testUser2.id
      );

      // Start typing
      await wsUtils.sendMessage(testUser1.id, 'typing_start', {
        threadId: testThread.id,
      });

      // Verify typing indicator received by user2
      const typingEvent = await wsUtils.waitForMessage(testUser2.id, 'typing_update');
      expect(typingEvent.payload.userId).toBe(testUser1.id);
      expect(typingEvent.payload.isTyping).toBe(true);
    });

    // Step 2: Typing timeout
    await test.step('typing timeout', async () => {
      // Wait for typing timeout
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify typing stopped event received
      const stoppedEvent = await wsUtils.waitForMessage(testUser2.id, 'typing_update');
      expect(stoppedEvent.payload.userId).toBe(testUser1.id);
      expect(stoppedEvent.payload.isTyping).toBe(false);
    });

    // Step 3: Multiple users typing
    await test.step('multiple users typing', async () => {
      // Both users start typing
      await wsUtils.sendMessage(testUser1.id, 'typing_start', {
        threadId: testThread.id,
      });
      await wsUtils.sendMessage(testUser2.id, 'typing_start', {
        threadId: testThread.id,
      });

      // Verify both typing indicators
      await expect(page.locator(`[data-user-id="${testUser1.id}"] .typing-indicator`))
        .toBeVisible();
      await expect(page.locator(`[data-user-id="${testUser2.id}"] .typing-indicator`))
        .toBeVisible();
    });
  });

  test('offline handling', async ({ page }) => {
    // Step 1: Message queueing
    await test.step('message queueing', async () => {
      // Connect user1 with offline support
      const ws1 = await wsUtils.createConnection(
        `ws://localhost:3000/api/chat?userId=${testUser1.id}&threadId=${testThread.id}`,
        testUser1.id,
        { autoReconnect: true }
      );

      // Simulate offline state
      await wsUtils.simulateConnectionDrop(testUser1.id);
      await page.setOffline(true);

      // Queue messages while offline
      const offlineMessages = [
        'Offline message 1',
        'Offline message 2',
        'Offline message 3',
      ];

      for (const content of offlineMessages) {
        await page.fill('textarea[name="message"]', content);
        await page.click('button[type="submit"]');

        // Verify message queued UI
        await expect(page.locator('.message-status'))
          .toContainText('Queued');
      }

      // Restore online state
      await page.setOffline(false);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify messages sent after reconnection
      for (const content of offlineMessages) {
        const deliveryEvent = await wsUtils.waitForMessage(testUser1.id, 'message_delivered');
        expect(deliveryEvent.payload.content).toBe(content);
        expect(deliveryEvent.payload.status).toBe('delivered');
      }
    });

    // Step 2: Offline indicator
    await test.step('offline indicator', async () => {
      // Connect user2
      const ws2 = await wsUtils.createConnection(
        `ws://localhost:3000/api/chat?userId=${testUser2.id}&threadId=${testThread.id}`,
        testUser2.id
      );

      // Simulate user1 going offline
      await wsUtils.simulateConnectionDrop(testUser1.id);

      // Verify offline status shown to user2
      await expect(page.locator(`[data-user-id="${testUser1.id}"] .status-indicator`))
        .toHaveClass(/offline/);
    });

    // Step 3: Offline message handling
    await test.step('offline message handling', async () => {
      // Send message to offline user
      await wsUtils.sendMessage(testUser2.id, 'message', {
        content: 'Message to offline user',
        threadId: testThread.id,
      });

      // Bring user1 back online
      await wsUtils.createConnection(
        `ws://localhost:3000/api/chat?userId=${testUser1.id}&threadId=${testThread.id}`,
        testUser1.id
      );

      // Verify missed message received
      const missedEvent = await wsUtils.waitForMessage(testUser1.id, 'message');
      expect(missedEvent.payload.content).toBe('Message to offline user');
    });

    // Step 4: Reconnection state recovery
    await test.step('state recovery', async () => {
      // Verify presence state recovered
      await expect(page.locator(`[data-user-id="${testUser1.id}"] .status-indicator`))
        .toHaveClass(/online/);

      // Verify typing state cleared
      await expect(page.locator(`[data-user-id="${testUser1.id}"] .typing-indicator`))
        .not.toBeVisible();

      // Verify message history preserved
      const history = await chatService.getMessageHistory(testUser1.id, testThread.id);
      expect(history.length).toBeGreaterThan(0);
    });
  });
}); 