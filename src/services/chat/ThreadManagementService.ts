import { SupabaseClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../lib/logger';
import {
  ThreadManager,
  ThreadWithMetadata,
  ThreadStatus,
  ThreadState,
  ThreadGroup,
  ThreadAuditLog
} from '../../types/thread';

export class ThreadManagementService implements ThreadManager {
  private static instance: ThreadManagementService;
  private supabase: SupabaseClient;
  private redis: Redis;
  private readonly CACHE_TTL = 5 * 60; // 5 minutes

  private constructor(supabaseClient: SupabaseClient, redis: Redis) {
    this.supabase = supabaseClient;
    this.redis = redis;
  }

  public static getInstance(supabaseClient: SupabaseClient, redis: Redis): ThreadManagementService {
    if (!ThreadManagementService.instance) {
      ThreadManagementService.instance = new ThreadManagementService(supabaseClient, redis);
    }
    return ThreadManagementService.instance;
  }

  private getCacheKey(key: string): string {
    return `thread:${key}`;
  }

  private async clearThreadCache(threadId: string): Promise<void> {
    const keys = await this.redis.keys(`thread:${threadId}*`);
    if (keys.length > 0) {
      await this.redis.del(keys);
    }
  }

  public async getThread(threadId: string): Promise<ThreadWithMetadata> {
    const cacheKey = this.getCacheKey(`${threadId}:metadata`);
    
    try {
      // Check cache first
      const cached = await this.redis.get<ThreadWithMetadata>(cacheKey);
      if (cached) {
        return cached;
      }

      // Fetch thread data
      const { data: thread, error: threadError } = await this.supabase
        .from('chat_threads')
        .select(`
          *,
          metadata:thread_metadata(*),
          hierarchy:thread_hierarchy(*),
          state:thread_states(*),
          groups:thread_group_members(
            group:thread_groups(*)
          ),
          participants:chat_threads_participants(
            user:users(*)
          )
        `)
        .eq('id', threadId)
        .single();

      if (threadError) throw threadError;
      if (!thread) throw new Error('Thread not found');

      // Get unread count
      const { data: unreadCount, error: unreadError } = await this.supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('thread_id', threadId)
        .gt('created_at', thread.state?.last_read_at || '1970-01-01');

      if (unreadError) throw unreadError;

      // Get last message
      const { data: lastMessage, error: messageError } = await this.supabase
        .from('messages')
        .select('id, content, sender_id, created_at')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (messageError && messageError.code !== 'PGRST116') { // Ignore "no rows returned" error
        throw messageError;
      }

      const threadWithMetadata: ThreadWithMetadata = {
        id: thread.id,
        metadata: thread.metadata,
        hierarchy: thread.hierarchy,
        state: thread.state,
        groups: thread.groups?.map(g => g.group),
        participants: thread.participants.map(p => ({
          user: p.user,
          role: p.role
        })),
        unread_count: unreadCount?.count || 0,
        last_message: lastMessage || undefined
      };

      // Cache the result
      await this.redis.set(cacheKey, threadWithMetadata, {
        ex: this.CACHE_TTL
      });

      return threadWithMetadata;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get thread');
      await logger.error('Error getting thread', {
        error: error.message,
        threadId
      });
      throw error;
    }
  }

  public async getThreads(options?: {
    status?: ThreadStatus[];
    groupId?: string;
    parentId?: string;
    includeArchived?: boolean;
  }): Promise<ThreadWithMetadata[]> {
    try {
      let query = this.supabase
        .from('chat_threads')
        .select(`
          *,
          metadata:thread_metadata(*),
          hierarchy:thread_hierarchy(*),
          state:thread_states(*),
          groups:thread_group_members(
            group:thread_groups(*)
          ),
          participants:chat_threads_participants(
            user:users(*)
          )
        `);

      // Apply filters
      if (options?.status?.length) {
        query = query.in('metadata.status', options.status);
      } else if (!options?.includeArchived) {
        query = query.neq('metadata.status', 'archived');
      }

      if (options?.groupId) {
        query = query.eq('groups.group_id', options.groupId);
      }

      if (options?.parentId) {
        query = query.eq('hierarchy.parent_id', options.parentId);
      }

      const { data: threads, error } = await query;
      if (error) throw error;

      // Get unread counts and last messages
      const threadIds = threads.map(t => t.id);
      const { data: unreadCounts, error: unreadError } = await this.supabase
        .from('messages')
        .select('thread_id, count(*)')
        .in('thread_id', threadIds)
        .gt('created_at', threads[0]?.state?.last_read_at || '1970-01-01')
        .group('thread_id');

      if (unreadError) throw unreadError;

      const { data: lastMessages, error: messageError } = await this.supabase
        .from('messages')
        .select('id, thread_id, content, sender_id, created_at')
        .in('thread_id', threadIds)
        .order('created_at', { ascending: false })
        .limit(1);

      if (messageError) throw messageError;

      return threads.map(thread => ({
        id: thread.id,
        metadata: thread.metadata,
        hierarchy: thread.hierarchy,
        state: thread.state,
        groups: thread.groups?.map(g => g.group),
        participants: thread.participants.map(p => ({
          user: p.user,
          role: p.role
        })),
        unread_count: unreadCounts?.find(c => c.thread_id === thread.id)?.count || 0,
        last_message: lastMessages?.find(m => m.thread_id === thread.id)
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get threads');
      await logger.error('Error getting threads', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  public async createThread(data: {
    title?: string;
    description?: string;
    parentId?: string;
    participants: Array<{
      userId: string;
      role: 'therapist' | 'client';
    }>;
  }): Promise<ThreadWithMetadata> {
    const threadId = uuidv4();

    try {
      // Start transaction
      const { error: txError } = await this.supabase.rpc('begin_transaction');
      if (txError) throw txError;

      try {
        // Create thread
        const { error: threadError } = await this.supabase
          .from('chat_threads')
          .insert({ id: threadId });

        if (threadError) throw threadError;

        // Create metadata
        const { error: metadataError } = await this.supabase
          .from('thread_metadata')
          .insert({
            thread_id: threadId,
            title: data.title,
            description: data.description,
            status: 'active'
          });

        if (metadataError) throw metadataError;

        // Create hierarchy if parent exists
        if (data.parentId) {
          const { error: hierarchyError } = await this.supabase
            .from('thread_hierarchy')
            .insert({
              thread_id: threadId,
              parent_id: data.parentId,
              position: 0 // Will be updated by trigger
            });

          if (hierarchyError) throw hierarchyError;
        }

        // Add participants
        const { error: participantError } = await this.supabase
          .from('chat_threads_participants')
          .insert(
            data.participants.map(p => ({
              thread_id: threadId,
              user_id: p.userId,
              role: p.role
            }))
          );

        if (participantError) throw participantError;

        // Commit transaction
        const { error: commitError } = await this.supabase.rpc('commit_transaction');
        if (commitError) throw commitError;

        // Get the created thread
        return await this.getThread(threadId);
      } catch (err) {
        // Rollback transaction
        await this.supabase.rpc('rollback_transaction');
        throw err;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create thread');
      await logger.error('Error creating thread', {
        error: error.message,
        data
      });
      throw error;
    }
  }

  public async updateThread(threadId: string, data: {
    title?: string;
    description?: string;
    status?: ThreadStatus;
    color?: string;
    icon?: string;
    custom_properties?: Record<string, unknown>;
  }): Promise<ThreadWithMetadata> {
    try {
      const { error } = await this.supabase
        .from('thread_metadata')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('thread_id', threadId);

      if (error) throw error;

      await this.clearThreadCache(threadId);
      return await this.getThread(threadId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update thread');
      await logger.error('Error updating thread', {
        error: error.message,
        threadId,
        data
      });
      throw error;
    }
  }

  public async moveThread(threadId: string, data: {
    parentId?: string;
    position: number;
  }): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('thread_hierarchy')
        .update({
          parent_id: data.parentId,
          position: data.position,
          updated_at: new Date().toISOString()
        })
        .eq('thread_id', threadId);

      if (error) throw error;

      await this.clearThreadCache(threadId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to move thread');
      await logger.error('Error moving thread', {
        error: error.message,
        threadId,
        data
      });
      throw error;
    }
  }

  public async archiveThread(threadId: string): Promise<void> {
    await this.updateThread(threadId, { status: 'archived' });
  }

  public async pinThread(threadId: string): Promise<void> {
    await this.updateThread(threadId, { status: 'pinned' });
  }

  public async updateThreadState(threadId: string, data: {
    is_muted?: boolean;
    is_favorite?: boolean;
    custom_state?: Record<string, unknown>;
    notification_preferences?: ThreadState['notification_preferences'];
  }): Promise<ThreadState> {
    try {
      const user = await this.supabase.auth.getUser();
      if (!user.data.user) throw new Error('User not authenticated');

      const { data: state, error } = await this.supabase
        .from('thread_states')
        .upsert({
          thread_id: threadId,
          user_id: user.data.user.id,
          ...data,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      if (!state) throw new Error('Failed to update thread state');

      await this.clearThreadCache(threadId);
      return state;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update thread state');
      await logger.error('Error updating thread state', {
        error: error.message,
        threadId,
        data
      });
      throw error;
    }
  }

  public async createGroup(data: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    position: number;
  }): Promise<ThreadGroup> {
    try {
      const user = await this.supabase.auth.getUser();
      if (!user.data.user) throw new Error('User not authenticated');

      const { data: group, error } = await this.supabase
        .from('thread_groups')
        .insert({
          ...data,
          created_by: user.data.user.id
        })
        .select()
        .single();

      if (error) throw error;
      if (!group) throw new Error('Failed to create thread group');

      return group;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create thread group');
      await logger.error('Error creating thread group', {
        error: error.message,
        data
      });
      throw error;
    }
  }

  public async updateGroup(groupId: string, data: {
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
    position?: number;
  }): Promise<ThreadGroup> {
    try {
      const { data: group, error } = await this.supabase
        .from('thread_groups')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', groupId)
        .select()
        .single();

      if (error) throw error;
      if (!group) throw new Error('Failed to update thread group');

      return group;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update thread group');
      await logger.error('Error updating thread group', {
        error: error.message,
        groupId,
        data
      });
      throw error;
    }
  }

  public async addThreadToGroup(groupId: string, threadId: string, position: number): Promise<void> {
    try {
      const user = await this.supabase.auth.getUser();
      if (!user.data.user) throw new Error('User not authenticated');

      const { error } = await this.supabase
        .from('thread_group_members')
        .upsert({
          group_id: groupId,
          thread_id: threadId,
          position,
          added_by: user.data.user.id,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      await this.clearThreadCache(threadId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add thread to group');
      await logger.error('Error adding thread to group', {
        error: error.message,
        groupId,
        threadId,
        position
      });
      throw error;
    }
  }

  public async removeThreadFromGroup(groupId: string, threadId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('thread_group_members')
        .delete()
        .match({ group_id: groupId, thread_id: threadId });

      if (error) throw error;

      await this.clearThreadCache(threadId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to remove thread from group');
      await logger.error('Error removing thread from group', {
        error: error.message,
        groupId,
        threadId
      });
      throw error;
    }
  }

  public async reorderGroup(groupId: string, threadIds: string[]): Promise<void> {
    try {
      const updates = threadIds.map((threadId, index) => ({
        group_id: groupId,
        thread_id: threadId,
        position: index,
        updated_at: new Date().toISOString()
      }));

      const { error } = await this.supabase
        .from('thread_group_members')
        .upsert(updates);

      if (error) throw error;

      await Promise.all(threadIds.map(id => this.clearThreadCache(id)));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to reorder group');
      await logger.error('Error reordering group', {
        error: error.message,
        groupId,
        threadIds
      });
      throw error;
    }
  }

  public async getThreadAuditLogs(threadId: string, options?: {
    limit?: number;
    before?: string;
  }): Promise<ThreadAuditLog[]> {
    try {
      let query = this.supabase
        .from('thread_audit_logs')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false });

      if (options?.before) {
        query = query.lt('created_at', options.before);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get thread audit logs');
      await logger.error('Error getting thread audit logs', {
        error: error.message,
        threadId,
        options
      });
      throw error;
    }
  }
} 