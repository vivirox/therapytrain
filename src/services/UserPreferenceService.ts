import { Redis } from '@upstash/redis';
import { SupabaseClient } from '@supabase/supabase-js';
import { cacheConfig } from '../config/cache.config';

export interface UserPreferences {
  language: string;
  theme?: 'light' | 'dark' | 'system';
  notifications?: boolean;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
}

interface CacheOperation {
  type: 'get' | 'set' | 'invalidate';
  success: boolean;
  latency: number;
}

export class UserPreferenceService {
  private static instance: UserPreferenceService;
  private redis: Redis;
  private supabase: SupabaseClient;
  private readonly PREFERENCE_KEY_PREFIX = cacheConfig.redis.patterns.userPreferences;

  private constructor(supabaseClient: SupabaseClient, redis: Redis) {
    this.supabase = supabaseClient;
    this.redis = redis;
  }

  public static getInstance(supabaseClient: SupabaseClient, redis: Redis): UserPreferenceService {
    if (!UserPreferenceService.instance) {
      UserPreferenceService.instance = new UserPreferenceService(supabaseClient, redis);
    }
    return UserPreferenceService.instance;
  }

  private logCacheOperation(operation: CacheOperation): void {
    console.debug('Cache operation:', {
      type: operation.type,
      success: operation.success,
      latency: `${operation.latency.toFixed(2)}ms`
    });
  }

  /**
   * Get user preferences from cache or database
   */
  public async getPreferences(userId: string): Promise<UserPreferences> {
    const startTime = performance.now();
    const cacheKey = `${this.PREFERENCE_KEY_PREFIX}:${userId}`;

    try {
      // Try to get from cache first
      const cached = await this.redis.get<UserPreferences>(cacheKey);
      if (cached) {
        this.logCacheOperation({
          type: 'get',
          success: true,
          latency: performance.now() - startTime
        });
        return cached;
      }

      // If not in cache, get from database
      const { data, error } = await this.supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      // Store in cache with TTL
      await this.redis.set(cacheKey, data, {
        ex: cacheConfig.redis.ttl.preferences
      });

      this.logCacheOperation({
        type: 'get',
        success: true,
        latency: performance.now() - startTime
      });
      return data as UserPreferences;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      this.logCacheOperation({
        type: 'get',
        success: false,
        latency: performance.now() - startTime
      });
      
      // Return default preferences on error
      return {
        language: 'en',
        theme: 'system',
        notifications: true,
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h'
      };
    }
  }

  /**
   * Update user preferences and sync across devices
   */
  public async updatePreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    const startTime = performance.now();
    const cacheKey = `${this.PREFERENCE_KEY_PREFIX}:${userId}`;

    try {
      // Update in database first
      const { data, error } = await this.supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Update in cache
      await this.redis.set(cacheKey, data, {
        ex: cacheConfig.redis.ttl.preferences
      });

      this.logCacheOperation({
        type: 'set',
        success: true,
        latency: performance.now() - startTime
      });
      return data as UserPreferences;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      this.logCacheOperation({
        type: 'set',
        success: false,
        latency: performance.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Invalidate user preferences cache
   */
  public async invalidatePreferences(userId: string): Promise<void> {
    const startTime = performance.now();
    const cacheKey = `${this.PREFERENCE_KEY_PREFIX}:${userId}`;

    try {
      await this.redis.del(cacheKey);
      this.logCacheOperation({
        type: 'invalidate',
        success: true,
        latency: performance.now() - startTime
      });
    } catch (error) {
      console.error('Error invalidating user preferences:', error);
      this.logCacheOperation({
        type: 'invalidate',
        success: false,
        latency: performance.now() - startTime
      });
    }
  }

  /**
   * Subscribe to preference changes
   */
  public subscribeToPreferenceChanges(
    userId: string,
    callback: (preferences: UserPreferences) => void
  ): () => void {
    const channel = `preference_changes:${userId}`;
    
    const subscription = this.supabase
      .channel(channel)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_preferences',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          // Invalidate cache
          await this.invalidatePreferences(userId);
          
          // Get fresh preferences
          const preferences = await this.getPreferences(userId);
          
          // Call callback with new preferences
          callback(preferences);
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      subscription.unsubscribe();
    };
  }
}