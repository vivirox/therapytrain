import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  cleanupTestData,
  createTestUser,
  createTestThread,
  createTestMessage,
  withTransaction,
  verifyDataIntegrity,
  TABLES,
} from '../db-utils';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { encryptMessageForRecipient, decryptMessageContent } from '@/lib/encryption/message-encryption';
import { cacheMessage, getCachedMessage, invalidateThread } from '@/lib/edge/chat-cache';

describe('Chat Message Integration Tests', () => {
  let testUser: any;
  let testThread: any;
  let supabase: any;

  // Setup test environment
  beforeAll(async () => {
    // Create test user and thread
    testUser = await createTestUser();
    testThread = await createTestThread(testUser.id);
    supabase = createRouteHandlerClient({ cookies });
  });

  // Clean up after each test
  beforeEach(async () => {
    await cleanupTestData();
  });

  // Clean up after all tests
  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Message Creation', () => {
    test('should create a new message with encryption', async () => {
      await withTransaction(async () => {
        // Encrypt message content
        const content = 'Test message content';
        const encryptedMessage = await encryptMessageForRecipient(
          content,
          testUser.id,
          'ai'
        );

        // Create message
        const { data: message, error } = await supabase
          .from(TABLES.MESSAGES)
          .insert({
            thread_id: testThread.id,
            user_id: testUser.id,
            content: encryptedMessage.encryptedContent,
            iv: encryptedMessage.iv,
            role: 'user',
            created_at: new Date().toISOString(),
            sender_public_key: encryptedMessage.senderPublicKey
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(message).toBeDefined();
        expect(message.thread_id).toBe(testThread.id);
        expect(message.user_id).toBe(testUser.id);

        // Verify message can be decrypted
        const decryptedContent = await decryptMessageContent(
          message.content,
          message.iv,
          testUser.id,
          message.sender_public_key
        );

        expect(decryptedContent).toBe(content);

        // Verify data integrity
        const exists = await verifyDataIntegrity(TABLES.MESSAGES, message.id);
        expect(exists).toBe(true);
      });
    });

    test('should cache message after creation', async () => {
      await withTransaction(async () => {
        // Create message
        const message = await createTestMessage(
          testThread.id,
          testUser.id,
          'Test message for caching'
        );

        // Cache message
        await cacheMessage({
          ...message,
          content: 'Test message for caching', // Use decrypted content for cache
        });

        // Verify message is in cache
        const cachedMessage = await getCachedMessage(message.id);
        expect(cachedMessage).toBeDefined();
        expect(cachedMessage?.content).toBe('Test message for caching');
      });
    });

    test('should fail with invalid thread ID', async () => {
      await withTransaction(async () => {
        const { error } = await supabase
          .from(TABLES.MESSAGES)
          .insert({
            thread_id: 'invalid-thread-id',
            user_id: testUser.id,
            content: 'Test content',
            iv: 'test-iv',
            role: 'user',
            created_at: new Date().toISOString(),
            sender_public_key: 'test-key'
          });

        expect(error).toBeDefined();
        expect(error.code).toBe('23503'); // Foreign key violation
      });
    });

    test('should fail with invalid user ID', async () => {
      await withTransaction(async () => {
        const { error } = await supabase
          .from(TABLES.MESSAGES)
          .insert({
            thread_id: testThread.id,
            user_id: 'invalid-user-id',
            content: 'Test content',
            iv: 'test-iv',
            role: 'user',
            created_at: new Date().toISOString(),
            sender_public_key: 'test-key'
          });

        expect(error).toBeDefined();
        expect(error.code).toBe('23503'); // Foreign key violation
      });
    });
  });

  describe('Message Retrieval', () => {
    test('should retrieve messages for a thread', async () => {
      await withTransaction(async () => {
        // Create multiple messages
        const message1 = await createTestMessage(testThread.id, testUser.id, 'Message 1');
        const message2 = await createTestMessage(testThread.id, testUser.id, 'Message 2');
        const message3 = await createTestMessage(testThread.id, testUser.id, 'Message 3');

        // Retrieve messages
        const { data: messages, error } = await supabase
          .from(TABLES.MESSAGES)
          .select('*')
          .eq('thread_id', testThread.id)
          .order('created_at', { ascending: true });

        expect(error).toBeNull();
        expect(messages).toHaveLength(3);
        expect(messages[0].id).toBe(message1.id);
        expect(messages[1].id).toBe(message2.id);
        expect(messages[2].id).toBe(message3.id);
      });
    });

    test('should retrieve messages with pagination', async () => {
      await withTransaction(async () => {
        // Create multiple messages
        for (let i = 0; i < 5; i++) {
          await createTestMessage(testThread.id, testUser.id, `Message ${i + 1}`);
        }

        // Retrieve first page
        const { data: page1, error: error1 } = await supabase
          .from(TABLES.MESSAGES)
          .select('*')
          .eq('thread_id', testThread.id)
          .order('created_at', { ascending: true })
          .range(0, 2);

        expect(error1).toBeNull();
        expect(page1).toHaveLength(3);

        // Retrieve second page
        const { data: page2, error: error2 } = await supabase
          .from(TABLES.MESSAGES)
          .select('*')
          .eq('thread_id', testThread.id)
          .order('created_at', { ascending: true })
          .range(3, 4);

        expect(error2).toBeNull();
        expect(page2).toHaveLength(2);
      });
    });
  });

  describe('Message Updates', () => {
    test('should update message content with encryption', async () => {
      await withTransaction(async () => {
        // Create initial message
        const message = await createTestMessage(
          testThread.id,
          testUser.id,
          'Initial content'
        );

        // Encrypt new content
        const newContent = 'Updated content';
        const encryptedMessage = await encryptMessageForRecipient(
          newContent,
          testUser.id,
          'ai'
        );

        // Update message
        const { data: updatedMessage, error } = await supabase
          .from(TABLES.MESSAGES)
          .update({
            content: encryptedMessage.encryptedContent,
            iv: encryptedMessage.iv,
            sender_public_key: encryptedMessage.senderPublicKey,
            updated_at: new Date().toISOString()
          })
          .eq('id', message.id)
          .select()
          .single();

        expect(error).toBeNull();
        expect(updatedMessage).toBeDefined();

        // Verify updated content can be decrypted
        const decryptedContent = await decryptMessageContent(
          updatedMessage.content,
          updatedMessage.iv,
          testUser.id,
          updatedMessage.sender_public_key
        );

        expect(decryptedContent).toBe(newContent);

        // Verify cache is invalidated
        await invalidateThread(testThread.id);
        const cachedMessage = await getCachedMessage(message.id);
        expect(cachedMessage).toBeNull();
      });
    });
  });

  describe('Message Deletion', () => {
    test('should delete message and update cache', async () => {
      await withTransaction(async () => {
        // Create message
        const message = await createTestMessage(
          testThread.id,
          testUser.id,
          'Message to delete'
        );

        // Delete message
        const { error } = await supabase
          .from(TABLES.MESSAGES)
          .delete()
          .eq('id', message.id);

        expect(error).toBeNull();

        // Verify message is deleted
        const exists = await verifyDataIntegrity(TABLES.MESSAGES, message.id);
        expect(exists).toBe(false);

        // Verify cache is invalidated
        await invalidateThread(testThread.id);
        const cachedMessage = await getCachedMessage(message.id);
        expect(cachedMessage).toBeNull();
      });
    });

    test('should cascade delete messages when thread is deleted', async () => {
      await withTransaction(async () => {
        // Create messages
        const message1 = await createTestMessage(testThread.id, testUser.id, 'Message 1');
        const message2 = await createTestMessage(testThread.id, testUser.id, 'Message 2');

        // Delete thread
        const { error } = await supabase
          .from(TABLES.THREADS)
          .delete()
          .eq('id', testThread.id);

        expect(error).toBeNull();

        // Verify messages are deleted
        const exists1 = await verifyDataIntegrity(TABLES.MESSAGES, message1.id);
        const exists2 = await verifyDataIntegrity(TABLES.MESSAGES, message2.id);
        expect(exists1).toBe(false);
        expect(exists2).toBe(false);
      });
    });
  });
}); 