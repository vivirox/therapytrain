import { test, expect } from '@playwright/test';
import { getWebSocketUtils } from './utils/websocket';
import { createTestUser, createTestThread, cleanupTestData } from '../db/utils';
import { encryptMessageForRecipient, decryptMessageContent } from '@/lib/encryption/message-encryption';

test.describe('Chat Messaging', () => {
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

  test('should establish WebSocket connection', async ({ page }) => {
    // Login as testUser1
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser1.email);
    await page.fill('input[type="password"]', testUser1.password);
    await page.click('button[type="submit"]');

    // Navigate to chat thread
    await page.goto(`/chat/${testThread.id}`);

    // Create WebSocket connection
    const ws = await wsUtils.createConnection(
      `ws://localhost:3000/api/chat?userId=${testUser1.id}&threadId=${testThread.id}`,
      testUser1.id
    );

    // Verify connection is established
    expect(wsUtils.isConnected(testUser1.id)).toBe(true);

    // Verify connection event is received
    const connectEvent = await wsUtils.waitForMessage(testUser1.id, 'connected');
    expect(connectEvent.payload.clientId).toBeDefined();
  });

  test('should send and receive encrypted messages', async ({ page }) => {
    // Login and connect both users
    const ws1 = await wsUtils.createConnection(
      `ws://localhost:3000/api/chat?userId=${testUser1.id}&threadId=${testThread.id}`,
      testUser1.id
    );
    const ws2 = await wsUtils.createConnection(
      `ws://localhost:3000/api/chat?userId=${testUser2.id}&threadId=${testThread.id}`,
      testUser2.id
    );

    // Send message from user1 to user2
    const messageContent = 'Hello, this is an encrypted message!';
    const encryptedMessage = await encryptMessageForRecipient(
      messageContent,
      testUser1.id,
      testUser2.id
    );

    await wsUtils.sendMessage(testUser1.id, 'message', {
      content: encryptedMessage.encryptedContent,
      iv: encryptedMessage.iv,
      senderPublicKey: encryptedMessage.senderPublicKey,
    });

    // Verify message delivery
    const receivedMessage = await wsUtils.waitForMessage(testUser2.id, 'message');
    const decryptedContent = await decryptMessageContent(
      receivedMessage.payload.content,
      receivedMessage.payload.iv,
      testUser2.id,
      receivedMessage.payload.senderPublicKey
    );

    expect(decryptedContent).toBe(messageContent);
  });

  test('should handle message delivery confirmation', async ({ page }) => {
    // Connect user1
    const ws1 = await wsUtils.createConnection(
      `ws://localhost:3000/api/chat?userId=${testUser1.id}&threadId=${testThread.id}`,
      testUser1.id
    );

    // Send message
    await wsUtils.sendMessage(testUser1.id, 'message', {
      content: 'Test message',
      threadId: testThread.id,
    });

    // Verify delivery confirmation
    const confirmation = await wsUtils.waitForMessage(testUser1.id, 'message_delivered');
    expect(confirmation.payload.status).toBe('delivered');
    expect(confirmation.payload.messageId).toBeDefined();
  });

  test('should handle message ordering', async ({ page }) => {
    // Connect user1
    const ws1 = await wsUtils.createConnection(
      `ws://localhost:3000/api/chat?userId=${testUser1.id}&threadId=${testThread.id}`,
      testUser1.id
    );

    // Send multiple messages quickly
    const messages = ['First', 'Second', 'Third'];
    for (const content of messages) {
      await wsUtils.sendMessage(testUser1.id, 'message', {
        content,
        threadId: testThread.id,
      });
    }

    // Verify messages are received in order
    const receivedMessages = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = await wsUtils.waitForMessage(testUser1.id, 'message');
      receivedMessages.push(msg.payload.content);
    }

    expect(receivedMessages).toEqual(messages);
  });

  test('should handle connection drops and reconnection', async ({ page }) => {
    // Connect with auto-reconnect enabled
    const ws = await wsUtils.createConnection(
      `ws://localhost:3000/api/chat?userId=${testUser1.id}&threadId=${testThread.id}`,
      testUser1.id,
      { autoReconnect: true, maxRetries: 3 }
    );

    // Simulate connection drop
    await wsUtils.simulateConnectionDrop(testUser1.id);

    // Wait for reconnection
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify reconnected
    expect(wsUtils.isConnected(testUser1.id)).toBe(true);

    // Verify can still send/receive messages
    await wsUtils.sendMessage(testUser1.id, 'message', {
      content: 'Message after reconnection',
      threadId: testThread.id,
    });

    const confirmation = await wsUtils.waitForMessage(testUser1.id, 'message_delivered');
    expect(confirmation.payload.status).toBe('delivered');
  });

  test('should handle rate limiting', async ({ page }) => {
    // Connect user1
    const ws1 = await wsUtils.createConnection(
      `ws://localhost:3000/api/chat?userId=${testUser1.id}&threadId=${testThread.id}`,
      testUser1.id
    );

    // Send messages rapidly
    const attempts = 10;
    for (let i = 0; i < attempts; i++) {
      await wsUtils.sendMessage(testUser1.id, 'message', {
        content: `Rapid message ${i}`,
        threadId: testThread.id,
      });
    }

    // Verify rate limit error is received
    const error = await wsUtils.waitForMessage(testUser1.id, 'error');
    expect(error.payload.code).toBe('rate_limit_exceeded');
  });

  test('should handle message encryption errors', async ({ page }) => {
    // Connect both users
    const ws1 = await wsUtils.createConnection(
      `ws://localhost:3000/api/chat?userId=${testUser1.id}&threadId=${testThread.id}`,
      testUser1.id
    );
    const ws2 = await wsUtils.createConnection(
      `ws://localhost:3000/api/chat?userId=${testUser2.id}&threadId=${testThread.id}`,
      testUser2.id
    );

    // Send message with invalid encryption
    await wsUtils.sendMessage(testUser1.id, 'message', {
      content: 'Invalid encrypted content',
      iv: 'invalid-iv',
      senderPublicKey: 'invalid-key',
    });

    // Verify error is received
    const error = await wsUtils.waitForMessage(testUser2.id, 'error');
    expect(error.payload.code).toBe('decryption_failed');
  });
}); 