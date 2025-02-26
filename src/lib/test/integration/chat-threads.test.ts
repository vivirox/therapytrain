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
import { cacheThread, getCachedThread, invalidateThread } from '@/lib/edge/chat-cache';

describe('Chat Thread Integration Tests', () => {
  let testUser1: any;
  let testUser2: any;
  let supabase: any;

  // Setup test environment
  beforeAll(async () => {
    // Create test users
    testUser1 = await createTestUser();
    testUser2 = await createTestUser();
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

  describe('Thread Creation', () => {
    test('should create a new thread with metadata', async () => {
      await withTransaction(async () => {
        const metadata = {
          title: 'Test Thread',
          type: 'direct',
          participants: [testUser1.id, testUser2.id],
        };

        const { data: thread, error } = await supabase
          .from(TABLES.THREADS)
          .insert({
            created_by: testUser1.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata,
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(thread).toBeDefined();
        expect(thread.created_by).toBe(testUser1.id);
        expect(thread.metadata).toEqual(metadata);

        // Verify data integrity
        const exists = await verifyDataIntegrity(TABLES.THREADS, thread.id);
        expect(exists).toBe(true);
      });
    });

    test('should create thread with initial message', async () => {
      await withTransaction(async () => {
        const thread = await createTestThread(testUser1.id, 'Initial message');

        // Verify thread exists
        const threadExists = await verifyDataIntegrity(TABLES.THREADS, thread.id);
        expect(threadExists).toBe(true);

        // Verify initial message exists
        const { data: messages, error } = await supabase
          .from(TABLES.MESSAGES)
          .select('*')
          .eq('thread_id', thread.id);

        expect(error).toBeNull();
        expect(messages).toHaveLength(1);
        expect(messages[0].content).toBe('Initial message');
      });
    });

    test('should fail with invalid user ID', async () => {
      await withTransaction(async () => {
        const { error } = await supabase
          .from(TABLES.THREADS)
          .insert({
            created_by: 'invalid-user-id',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: {},
          });

        expect(error).toBeDefined();
        expect(error.code).toBe('23503'); // Foreign key violation
      });
    });
  });

  describe('Thread Retrieval', () => {
    test('should retrieve threads for a user', async () => {
      await withTransaction(async () => {
        // Create multiple threads
        const thread1 = await createTestThread(testUser1.id, 'Thread 1');
        const thread2 = await createTestThread(testUser1.id, 'Thread 2');
        const thread3 = await createTestThread(testUser2.id, 'Thread 3'); // Different user

        // Retrieve threads for user1
        const { data: threads, error } = await supabase
          .from(TABLES.THREADS)
          .select('*')
          .eq('created_by', testUser1.id)
          .order('created_at', { ascending: true });

        expect(error).toBeNull();
        expect(threads).toHaveLength(2);
        expect(threads[0].id).toBe(thread1.id);
        expect(threads[1].id).toBe(thread2.id);
      });
    });

    test('should retrieve thread with messages', async () => {
      await withTransaction(async () => {
        // Create thread with multiple messages
        const thread = await createTestThread(testUser1.id);
        await createTestMessage(thread.id, testUser1.id, 'Message 1');
        await createTestMessage(thread.id, testUser2.id, 'Message 2');

        // Retrieve thread with messages
        const { data: threadData, error } = await supabase
          .from(TABLES.THREADS)
          .select(`
            *,
            messages:messages(*)
          `)
          .eq('id', thread.id)
          .single();

        expect(error).toBeNull();
        expect(threadData).toBeDefined();
        expect(threadData.messages).toHaveLength(2);
        expect(threadData.messages[0].content).toBe('Message 1');
        expect(threadData.messages[1].content).toBe('Message 2');
      });
    });

    test('should handle thread caching', async () => {
      await withTransaction(async () => {
        // Create thread with messages
        const thread = await createTestThread(testUser1.id);
        const message1 = await createTestMessage(thread.id, testUser1.id, 'Message 1');
        const message2 = await createTestMessage(thread.id, testUser2.id, 'Message 2');

        // Cache thread
        await cacheThread(thread.id, [message1, message2]);

        // Verify thread is in cache
        const cachedThread = await getCachedThread(thread.id);
        expect(cachedThread).toBeDefined();
        expect(cachedThread?.messages).toHaveLength(2);
      });
    });
  });

  describe('Thread Updates', () => {
    test('should update thread metadata', async () => {
      await withTransaction(async () => {
        // Create thread
        const thread = await createTestThread(testUser1.id);

        // Update metadata
        const newMetadata = {
          title: 'Updated Thread',
          type: 'group',
          participants: [testUser1.id, testUser2.id],
        };

        const { data: updatedThread, error } = await supabase
          .from(TABLES.THREADS)
          .update({
            metadata: newMetadata,
            updated_at: new Date().toISOString(),
          })
          .eq('id', thread.id)
          .select()
          .single();

        expect(error).toBeNull();
        expect(updatedThread).toBeDefined();
        expect(updatedThread.metadata).toEqual(newMetadata);

        // Verify cache is invalidated
        await invalidateThread(thread.id);
        const cachedThread = await getCachedThread(thread.id);
        expect(cachedThread).toBeNull();
      });
    });

    test('should update last activity timestamp', async () => {
      await withTransaction(async () => {
        // Create thread
        const thread = await createTestThread(testUser1.id);
        const initialTimestamp = thread.updated_at;

        // Wait briefly to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 100));

        // Add new message to update activity
        await createTestMessage(thread.id, testUser2.id, 'New message');

        // Update thread timestamp
        const { data: updatedThread, error } = await supabase
          .from(TABLES.THREADS)
          .update({
            updated_at: new Date().toISOString(),
          })
          .eq('id', thread.id)
          .select()
          .single();

        expect(error).toBeNull();
        expect(updatedThread).toBeDefined();
        expect(new Date(updatedThread.updated_at).getTime())
          .toBeGreaterThan(new Date(initialTimestamp).getTime());
      });
    });
  });

  describe('Thread Deletion', () => {
    test('should delete thread and all messages', async () => {
      await withTransaction(async () => {
        // Create thread with messages
        const thread = await createTestThread(testUser1.id);
        const message1 = await createTestMessage(thread.id, testUser1.id, 'Message 1');
        const message2 = await createTestMessage(thread.id, testUser2.id, 'Message 2');

        // Delete thread
        const { error } = await supabase
          .from(TABLES.THREADS)
          .delete()
          .eq('id', thread.id);

        expect(error).toBeNull();

        // Verify thread is deleted
        const threadExists = await verifyDataIntegrity(TABLES.THREADS, thread.id);
        expect(threadExists).toBe(false);

        // Verify messages are deleted
        const message1Exists = await verifyDataIntegrity(TABLES.MESSAGES, message1.id);
        const message2Exists = await verifyDataIntegrity(TABLES.MESSAGES, message2.id);
        expect(message1Exists).toBe(false);
        expect(message2Exists).toBe(false);

        // Verify cache is invalidated
        const cachedThread = await getCachedThread(thread.id);
        expect(cachedThread).toBeNull();
      });
    });

    test('should handle bulk thread deletion', async () => {
      await withTransaction(async () => {
        // Create multiple threads
        const threads = await Promise.all([
          createTestThread(testUser1.id, 'Thread 1'),
          createTestThread(testUser1.id, 'Thread 2'),
          createTestThread(testUser1.id, 'Thread 3'),
        ]);

        // Add messages to each thread
        for (const thread of threads) {
          await createTestMessage(thread.id, testUser1.id, 'Message in ' + thread.id);
        }

        // Delete all threads
        const { error } = await supabase
          .from(TABLES.THREADS)
          .delete()
          .eq('created_by', testUser1.id);

        expect(error).toBeNull();

        // Verify all threads are deleted
        for (const thread of threads) {
          const exists = await verifyDataIntegrity(TABLES.THREADS, thread.id);
          expect(exists).toBe(false);

          // Verify cache is invalidated
          const cachedThread = await getCachedThread(thread.id);
          expect(cachedThread).toBeNull();
        }

        // Verify no messages remain
        const { data: remainingMessages, error: messagesError } = await supabase
          .from(TABLES.MESSAGES)
          .select('*')
          .in('thread_id', threads.map(t => t.id));

        expect(messagesError).toBeNull();
        expect(remainingMessages).toHaveLength(0);
      });
    });
  });
}); 