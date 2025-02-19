import { Redis } from '@upstash/redis';
import { logger } from '../../lib/logger';

export class DistributedLockService {
  private static instance: DistributedLockService;
  private redis: Redis;
  private lockTTL = 30000; // 30 seconds default TTL
  private retryDelay = 100; // 100ms between retries
  private maxRetries = 50; // Maximum 5 seconds of retrying

  private constructor(redis: Redis) {
    this.redis = redis;
  }

  public static getInstance(redis: Redis): DistributedLockService {
    if (!DistributedLockService.instance) {
      DistributedLockService.instance = new DistributedLockService(redis);
    }
    return DistributedLockService.instance;
  }

  /**
   * Acquire a distributed lock
   * @param lockKey The key to lock on
   * @param holderId Unique identifier for the holder (e.g., server ID + process ID)
   * @param ttl Optional TTL in milliseconds
   * @returns true if lock was acquired, false otherwise
   */
  public async acquireLock(
    lockKey: string,
    holderId: string,
    ttl: number = this.lockTTL
  ): Promise<boolean> {
    try {
      let retries = 0;
      while (retries < this.maxRetries) {
        // Try to set the lock with NX (only if it doesn't exist)
        const result = await this.redis.set(
          `lock:${lockKey}`,
          holderId,
          { nx: true, px: ttl }
        );

        if (result === 'OK') {
          await logger.info('Lock acquired', {
            lockKey,
            holderId,
            ttl
          });
          return true;
        }

        // If we couldn't acquire the lock, check if it's expired
        const currentHolder = await this.redis.get(`lock:${lockKey}`);
        if (!currentHolder) {
          // Lock exists but expired, try to acquire in next iteration
          retries++;
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          continue;
        }

        // Lock is held by someone else
        await logger.info('Lock acquisition failed - already held', {
          lockKey,
          holderId,
          currentHolder
        });
        return false;
      }

      await logger.warn('Lock acquisition failed - max retries reached', {
        lockKey,
        holderId,
        maxRetries: this.maxRetries
      });
      return false;
    } catch (error) {
      await logger.error('Error acquiring lock', {
        lockKey,
        holderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Release a distributed lock
   * @param lockKey The key to release
   * @param holderId Unique identifier for the holder
   * @returns true if lock was released, false if it wasn't held by the specified holder
   */
  public async releaseLock(lockKey: string, holderId: string): Promise<boolean> {
    try {
      // Use Lua script to ensure atomic check-and-delete
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.redis.eval(
        script,
        [`lock:${lockKey}`],
        [holderId]
      );

      const released = result === 1;
      
      if (released) {
        await logger.info('Lock released', {
          lockKey,
          holderId
        });
      } else {
        await logger.warn('Lock release failed - not held by specified holder', {
          lockKey,
          holderId
        });
      }

      return released;
    } catch (error) {
      await logger.error('Error releasing lock', {
        lockKey,
        holderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Extend the TTL of a held lock
   * @param lockKey The key to extend
   * @param holderId Unique identifier for the holder
   * @param ttl New TTL in milliseconds
   * @returns true if lock was extended, false if it wasn't held by the specified holder
   */
  public async extendLock(
    lockKey: string,
    holderId: string,
    ttl: number = this.lockTTL
  ): Promise<boolean> {
    try {
      // Use Lua script to ensure atomic check-and-extend
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("pexpire", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;

      const result = await this.redis.eval(
        script,
        [`lock:${lockKey}`],
        [holderId, ttl.toString()]
      );

      const extended = result === 1;

      if (extended) {
        await logger.info('Lock extended', {
          lockKey,
          holderId,
          ttl
        });
      } else {
        await logger.warn('Lock extension failed - not held by specified holder', {
          lockKey,
          holderId
        });
      }

      return extended;
    } catch (error) {
      await logger.error('Error extending lock', {
        lockKey,
        holderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Check if a lock is currently held
   * @param lockKey The key to check
   * @returns The holder ID if the lock is held, null otherwise
   */
  public async getLockHolder(lockKey: string): Promise<string | null> {
    try {
      return await this.redis.get(`lock:${lockKey}`);
    } catch (error) {
      await logger.error('Error checking lock holder', {
        lockKey,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }
} 