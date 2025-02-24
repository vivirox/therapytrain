import { test, expect } from '@playwright/test';
import { createTestUser, createTestThread, cleanupTestData } from '../db/utils';
import { getWebSocketUtils } from './utils/websocket';
import { ChatService } from '@/services/chat';
import { supabase } from '@/lib/supabaseClient';
import path from 'path';

test.describe('Chat System Core', () => {
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

  test('complete chat flow', async ({ page }) => {
    // Step 1: Login and navigate to chat
    await test.step('login and navigate', async () => {
      await page.goto('/login');
      await page.fill('input[type="email"]', testUser1.email);
      await page.fill('input[type="password"]', testUser1.password);
      await page.click('button[type="submit"]');
      await page.goto(`/chat/${testThread.id}`);
    });

    // Step 2: Connect to WebSocket
    const ws1 = await test.step('connect to websocket', async () => {
      const ws = await wsUtils.createConnection(
        `ws://localhost:3000/api/chat?userId=${testUser1.id}&threadId=${testThread.id}`,
        testUser1.id
      );
      
      const connectEvent = await wsUtils.waitForMessage(testUser1.id, 'connected');
      expect(connectEvent.clientId).toBeDefined();
      
      return ws;
    });

    // Step 3: Send and receive messages
    await test.step('send and receive messages', async () => {
      // Connect second user
      const ws2 = await wsUtils.createConnection(
        `ws://localhost:3000/api/chat?userId=${testUser2.id}&threadId=${testThread.id}`,
        testUser2.id
      );

      // Send message from user1
      await page.fill('textarea[name="message"]', 'Hello from user1!');
      await page.click('button[type="submit"]');

      // Verify message appears in the chat
      await expect(page.locator('.message-content')).toContainText('Hello from user1!');

      // Verify user2 receives the message
      const messageEvent = await wsUtils.waitForMessage(testUser2.id, 'message');
      expect(messageEvent.message.content).toBe('Hello from user1!');

      // Send message from user2
      await chatService.sendMessage({
        session_id: testThread.id,
        content: 'Hello from user2!',
        sender_id: testUser2.id,
      });

      // Verify user1 receives the message
      const response = await wsUtils.waitForMessage(testUser1.id, 'message');
      expect(response.message.content).toBe('Hello from user2!');
      await expect(page.locator('.message-content')).toContainText('Hello from user2!');
    });

    // Step 4: Test typing indicators
    await test.step('typing indicators', async () => {
      // Start typing
      await page.focus('textarea[name="message"]');
      await page.type('textarea[name="message"]', 'User1 is typing...', { delay: 100 });

      // Verify typing indicator for user2
      const typingEvent = await wsUtils.waitForMessage(testUser2.id, 'typing_started');
      expect(typingEvent.userId).toBe(testUser1.id);

      // Stop typing
      await page.waitForTimeout(1000);

      // Verify typing stopped for user2
      const stoppedEvent = await wsUtils.waitForMessage(testUser2.id, 'typing_stopped');
      expect(stoppedEvent.userId).toBe(testUser1.id);
    });

    // Step 5: Test file attachments
    await test.step('file attachments', async () => {
      // Upload file
      const filePath = path.join(__dirname, '../fixtures/test-image.jpg');
      await page.setInputFiles('input[type="file"]', filePath);

      // Wait for upload to complete
      await expect(page.locator('.upload-progress')).toBeVisible();
      await expect(page.locator('.upload-progress')).not.toBeVisible();

      // Verify file message
      const fileEvent = await wsUtils.waitForMessage(testUser2.id, 'message');
      expect(fileEvent.message.type).toBe('file');
      expect(fileEvent.message.metadata.filename).toBe('test-image.jpg');

      // Verify file preview
      await expect(page.locator('.file-preview')).toBeVisible();
      await expect(page.locator('.file-preview img')).toHaveAttribute('src', /test-image/);
    });
  });

  test('room management', async ({ page }) => {
    // Step 1: Create new room
    const newRoom = await test.step('create room', async () => {
      await page.goto('/chat');
      await page.click('button:has-text("New Chat")');
      await page.fill('input[name="roomName"]', 'Test Room');
      await page.click('button:has-text("Create")');

      const { data: room } = await supabase
        .from('chat_rooms')
        .select()
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      expect(room).toBeDefined();
      expect(room.name).toBe('Test Room');
      return room;
    });

    // Step 2: Add participant
    await test.step('add participant', async () => {
      await page.click('button:has-text("Add Participant")');
      await page.fill('input[name="email"]', testUser2.email);
      await page.click('button:has-text("Add")');

      // Verify participant added
      const { data: participant } = await supabase
        .from('room_participants')
        .select()
        .eq('room_id', newRoom.id)
        .eq('user_id', testUser2.id)
        .single();

      expect(participant).toBeDefined();
    });

    // Step 3: Update room settings
    await test.step('update settings', async () => {
      await page.click('button:has-text("Settings")');
      await page.fill('input[name="roomName"]', 'Updated Room Name');
      await page.click('button:has-text("Save")');

      // Verify update
      const { data: room } = await supabase
        .from('chat_rooms')
        .select()
        .eq('id', newRoom.id)
        .single();

      expect(room.name).toBe('Updated Room Name');
    });

    // Step 4: Leave room
    await test.step('leave room', async () => {
      await page.click('button:has-text("Leave Room")');
      await page.click('button:has-text("Confirm")');

      // Verify participant removed
      const { data: participant } = await supabase
        .from('room_participants')
        .select()
        .eq('room_id', newRoom.id)
        .eq('user_id', testUser1.id)
        .maybeSingle();

      expect(participant).toBeNull();
    });
  });

  test('user presence', async ({ page }) => {
    // Step 1: Initial presence
    await test.step('initial presence', async () => {
      await page.goto(`/chat/${testThread.id}`);
      const ws1 = await wsUtils.createConnection(
        `ws://localhost:3000/api/chat?userId=${testUser1.id}&threadId=${testThread.id}`,
        testUser1.id
      );

      // Verify user shows as online
      await expect(page.locator(`[data-user-id="${testUser1.id}"] .status-indicator`))
        .toHaveClass(/online/);
    });

    // Step 2: Multiple users presence
    await test.step('multiple users presence', async () => {
      const ws2 = await wsUtils.createConnection(
        `ws://localhost:3000/api/chat?userId=${testUser2.id}&threadId=${testThread.id}`,
        testUser2.id
      );

      // Verify both users show as online
      await expect(page.locator(`[data-user-id="${testUser1.id}"] .status-indicator`))
        .toHaveClass(/online/);
      await expect(page.locator(`[data-user-id="${testUser2.id}"] .status-indicator`))
        .toHaveClass(/online/);
    });

    // Step 3: Offline detection
    await test.step('offline detection', async () => {
      await wsUtils.closeConnection(testUser2.id);

      // Verify user2 shows as offline
      await expect(page.locator(`[data-user-id="${testUser2.id}"] .status-indicator`))
        .toHaveClass(/offline/);
    });

    // Step 4: Reconnection
    await test.step('reconnection', async () => {
      const ws2 = await wsUtils.createConnection(
        `ws://localhost:3000/api/chat?userId=${testUser2.id}&threadId=${testThread.id}`,
        testUser2.id
      );

      // Verify user2 shows as online again
      await expect(page.locator(`[data-user-id="${testUser2.id}"] .status-indicator`))
        .toHaveClass(/online/);
    });
  });

  test('error handling', async ({ page }) => {
    // Step 1: Network errors
    await test.step('network errors', async () => {
      await page.goto(`/chat/${testThread.id}`);
      
      // Simulate offline
      await page.setOffline(true);

      // Try to send message
      await page.fill('textarea[name="message"]', 'Test message');
      await page.click('button[type="submit"]');

      // Verify error message
      await expect(page.locator('.error-message'))
        .toContainText('Unable to send message');

      // Restore online
      await page.setOffline(false);
    });

    // Step 2: Rate limiting
    await test.step('rate limiting', async () => {
      // Send multiple messages quickly
      for (let i = 0; i < 10; i++) {
        await page.fill('textarea[name="message"]', `Message ${i}`);
        await page.click('button[type="submit"]');
      }

      // Verify rate limit message
      await expect(page.locator('.error-message'))
        .toContainText('rate limit');
    });

    // Step 3: Invalid file uploads
    await test.step('invalid file uploads', async () => {
      // Try to upload invalid file
      const filePath = path.join(__dirname, '../fixtures/invalid.exe');
      await page.setInputFiles('input[type="file"]', filePath);

      // Verify error message
      await expect(page.locator('.error-message'))
        .toContainText('File type not supported');
    });

    // Step 4: Permission errors
    await test.step('permission errors', async () => {
      // Create private room
      const { data: privateRoom } = await supabase
        .from('chat_rooms')
        .insert({
          name: 'Private Room',
          created_by: testUser2.id,
          is_private: true,
        })
        .select()
        .single();

      // Try to access private room
      await page.goto(`/chat/${privateRoom.id}`);

      // Verify access denied
      await expect(page.locator('.error-message'))
        .toContainText('access denied');
    });
  });
}); 