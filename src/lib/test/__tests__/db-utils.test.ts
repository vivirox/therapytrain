import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  cleanupTestData,
  createTestUser,
  createTestThread,
  createTestMessage,
  withTransaction,
  withTransactionRetry,
  createBulkTestData,
  verifyDataIntegrity,
  verifyReferentialIntegrity,
  TABLES
} from '../db-utils';

describe('Database Utilities', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('withTransactionRetry', () => {
    it('should execute transaction successfully', async () => {
      const result = await withTransactionRetry(async () => {
        const user = await createTestUser();
        return user;
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('should retry on failure', async () => {
      const onRetry = vi.fn();
      let attempts = 0;

      try {
        await withTransactionRetry(
          async () => {
            attempts++;
            if (attempts < 2) throw new Error('Test error');
            return 'success';
          },
          { maxRetries: 3, onRetry }
        );
      } catch (error) {
        // Should not reach here
        expect(error).toBeUndefined();
      }

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(attempts).toBe(2);
    });

    it('should timeout if transaction takes too long', async () => {
      await expect(
        withTransactionRetry(
          async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return 'success';
          },
          { timeoutMs: 500 }
        )
      ).rejects.toThrow('Transaction timeout after 500ms');
    });
  });

  describe('createBulkTestData', () => {
    it('should create multiple test users', async () => {
      const users = await createBulkTestData('USERS', 5, {
        email: 'test-{index}@example.com',
      });

      expect(users).toHaveLength(5);
      expect(users[0].email).toBeDefined();
      expect(users[0].id).toBeDefined();
    });

    it('should handle batch creation', async () => {
      const users = await createBulkTestData('USERS', 15, {}, { batchSize: 5 });
      expect(users).toHaveLength(15);
    });

    it('should rollback on failure', async () => {
      try {
        await createBulkTestData('USERS', 2, {
          email: 'invalid-email', // This should cause a validation error
        });
      } catch (error) {
        expect(error).toBeDefined();
      }

      const { data } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('email', 'invalid-email');

      expect(data).toHaveLength(0);
    });
  });

  describe('verifyReferentialIntegrity', () => {
    it('should verify related records exist', async () => {
      const user = await createTestUser();
      const thread = await createTestThread(user.id);
      const message = await createTestMessage(thread.id, user.id, 'Test message');

      const integrity = await verifyReferentialIntegrity(TABLES.MESSAGES, message.id, [
        { table: TABLES.THREADS, foreignKey: 'thread_id' },
        { table: TABLES.USERS, foreignKey: 'user_id' }
      ]);

      expect(integrity).toBe(true);
    });

    it('should return false if related records are missing', async () => {
      const user = await createTestUser();
      const thread = await createTestThread(user.id);
      const message = await createTestMessage(thread.id, user.id, 'Test message');

      // Delete the thread
      await supabase
        .from(TABLES.THREADS)
        .delete()
        .eq('id', thread.id);

      const integrity = await verifyReferentialIntegrity(TABLES.MESSAGES, message.id, [
        { table: TABLES.THREADS, foreignKey: 'thread_id' }
      ]);

      expect(integrity).toBe(false);
    });
  });
}); 