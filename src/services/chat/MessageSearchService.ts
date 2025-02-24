import { SupabaseClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../lib/logger';
import {
  MessageSearchResult,
  SearchOptions,
  SearchStatistics,
  SearchAuditLog
} from '../../types/chat';

export class MessageSearchService {
  private static instance: MessageSearchService;
  private supabase: SupabaseClient;
  private redis: Redis;
  private readonly CACHE_TTL = 5 * 60; // 5 minutes
  private readonly MAX_RESULTS = 100;

  private constructor(supabaseClient: SupabaseClient, redis: Redis) {
    this.supabase = supabaseClient;
    this.redis = redis;
  }

  public static getInstance(supabaseClient: SupabaseClient, redis: Redis): MessageSearchService {
    if (!MessageSearchService.instance) {
      MessageSearchService.instance = new MessageSearchService(supabaseClient, redis);
    }
    return MessageSearchService.instance;
  }

  private getCacheKey(options: SearchOptions): string {
    return `search:${JSON.stringify(options)}`;
  }

  private async logSearch(
    options: SearchOptions,
    resultCount: number,
    executionTime: number
  ): Promise<void> {
    try {
      const user = await this.supabase.auth.getUser();
      if (!user.data.user) return;

      const { error } = await this.supabase.from('search_audit_logs').insert({
        id: uuidv4(),
        user_id: user.data.user.id,
        thread_id: options.thread_id,
        query: options.query,
        result_count: resultCount,
        execution_time_ms: executionTime,
        metadata: {
          filters: {
            start_date: options.start_date,
            end_date: options.end_date,
            sender_id: options.sender_id,
            sort: options.sort
          },
          client_info: {
            browser: navigator.userAgent,
            os: navigator.platform,
            device: 'web'
          }
        }
      });

      if (error) {
        await logger.error('Failed to log search', {
          error: error.message,
          options
        });
      }
    } catch (err) {
      await logger.error('Error logging search', {
        error: err instanceof Error ? err.message : 'Unknown error',
        options
      });
    }
  }

  public async searchMessages(options: SearchOptions): Promise<MessageSearchResult[]> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(options);

    try {
      // Check cache first
      const cachedResults = await this.redis.get<MessageSearchResult[]>(cacheKey);
      if (cachedResults) {
        await logger.info('Search cache hit', { options });
        return cachedResults;
      }

      // Build the search query
      let query = this.supabase
        .from('message_search_results')
        .select('*')
        .textSearch('search_vector', options.query);

      // Apply filters
      if (options.thread_id) {
        query = query.eq('thread_id', options.thread_id);
      }
      if (options.start_date) {
        query = query.gte('created_at', options.start_date);
      }
      if (options.end_date) {
        query = query.lte('created_at', options.end_date);
      }
      if (options.sender_id) {
        query = query.eq('sender_id', options.sender_id);
      }

      // Apply sorting
      switch (options.sort) {
        case 'date_asc':
          query = query.order('created_at', { ascending: true });
          break;
        case 'date_desc':
          query = query.order('created_at', { ascending: false });
          break;
        default: // rank
          query = query.order('rank', { ascending: false });
      }

      // Apply pagination
      query = query
        .range(options.offset || 0, Math.min((options.offset || 0) + (options.limit || 20), this.MAX_RESULTS))
        .limit(options.limit || 20);

      // Execute search
      const { data: results, error } = await query;

      if (error) throw error;

      const searchResults = results as MessageSearchResult[];

      // Cache results
      await this.redis.set(cacheKey, searchResults, {
        ex: this.CACHE_TTL
      });

      // Log search
      const executionTime = Date.now() - startTime;
      await this.logSearch(options, searchResults.length, executionTime);

      await logger.info('Search completed', {
        options,
        resultCount: searchResults.length,
        executionTime
      });

      return searchResults;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Search failed');
      await logger.error('Search error', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  public async getSearchStatistics(threadId: string): Promise<SearchStatistics[]> {
    try {
      const { data, error } = await this.supabase
        .from('search_statistics')
        .select('*')
        .eq('thread_id', threadId)
        .order('time_bucket', { ascending: false })
        .limit(24); // Last 24 hours of stats

      if (error) throw error;
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get search statistics');
      await logger.error('Error fetching search statistics', {
        error: error.message,
        threadId
      });
      throw error;
    }
  }

  public async getSearchHistory(threadId: string): Promise<SearchAuditLog[]> {
    try {
      const { data, error } = await this.supabase
        .from('search_audit_logs')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get search history');
      await logger.error('Error fetching search history', {
        error: error.message,
        threadId
      });
      throw error;
    }
  }

  public async clearSearchHistory(threadId: string): Promise<void> {
    try {
      const user = await this.supabase.auth.getUser();
      if (!user.data.user) throw new Error('User not authenticated');

      const { error } = await this.supabase
        .from('search_audit_logs')
        .delete()
        .match({
          thread_id: threadId,
          user_id: user.data.user.id
        });

      if (error) throw error;

      await logger.info('Search history cleared', { threadId });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to clear search history');
      await logger.error('Error clearing search history', {
        error: error.message,
        threadId
      });
      throw error;
    }
  }
} 