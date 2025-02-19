import React, { useCallback, useEffect, useState } from 'react';
import { useSupabase } from '../../../hooks/useSupabase';
import { useRedis } from '../../../hooks/useRedis';
import { useToast } from '../../../hooks/useToast';
import { ThreadManagementService } from '../../../services/chat/ThreadManagementService';
import { ThreadWithMetadata, ThreadStatus } from '../../../types/thread';
import { Button } from '../../ui/Button';
import { Spinner } from '../../ui/Spinner';
import { Alert } from '../../ui/Alert';
import { formatDistanceToNow } from 'date-fns';

interface ThreadListProps {
  selectedThreadId?: string;
  onThreadSelect: (threadId: string) => void;
  onCreateThread?: () => void;
  className?: string;
}

export const ThreadList: React.FC<ThreadListProps> = ({
  selectedThreadId,
  onThreadSelect,
  onCreateThread,
  className
}) => {
  const [threads, setThreads] = useState<ThreadWithMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ThreadStatus[]>(['active', 'pinned']);
  const { supabase } = useSupabase();
  const { redis } = useRedis();
  const toast = useToast();
  const threadService = ThreadManagementService.getInstance(supabase, redis);

  const loadThreads = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const loadedThreads = await threadService.getThreads({
        status: statusFilter
      });
      setThreads(loadedThreads);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load threads');
      setError(error.message);
      toast.showToast({
        title: 'Error',
        description: error.message,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, threadService, toast]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Subscribe to thread changes
  useEffect(() => {
    const channel = supabase
      .channel('thread_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'thread_metadata'
      }, () => {
        loadThreads();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [supabase, loadThreads]);

  const handleArchiveThread = async (threadId: string) => {
    try {
      await threadService.archiveThread(threadId);
      toast.showToast({
        title: 'Thread Archived',
        description: 'The thread has been archived successfully.',
        type: 'success'
      });
      loadThreads();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to archive thread');
      toast.showToast({
        title: 'Error',
        description: error.message,
        type: 'error'
      });
    }
  };

  const handlePinThread = async (threadId: string) => {
    try {
      await threadService.pinThread(threadId);
      toast.showToast({
        title: 'Thread Pinned',
        description: 'The thread has been pinned successfully.',
        type: 'success'
      });
      loadThreads();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to pin thread');
      toast.showToast({
        title: 'Error',
        description: error.message,
        type: 'error'
      });
    }
  };

  const handleUpdateThreadState = async (threadId: string, data: {
    is_muted?: boolean;
    is_favorite?: boolean;
  }) => {
    try {
      await threadService.updateThreadState(threadId, data);
      toast.showToast({
        title: 'Thread Updated',
        description: 'Thread settings have been updated successfully.',
        type: 'success'
      });
      loadThreads();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update thread');
      toast.showToast({
        title: 'Error',
        description: error.message,
        type: 'error'
      });
    }
  };

  const sortThreads = (threadsToSort: ThreadWithMetadata[]): ThreadWithMetadata[] => {
    return [...threadsToSort].sort((a, b) => {
      // Sort by status (pinned first)
      if (a.metadata.status === 'pinned' && b.metadata.status !== 'pinned') return -1;
      if (b.metadata.status === 'pinned' && a.metadata.status !== 'pinned') return 1;

      // Then by unread count
      if (a.unread_count !== b.unread_count) {
        return b.unread_count - a.unread_count;
      }

      // Then by last activity
      return new Date(b.metadata.last_activity_at).getTime() -
             new Date(a.metadata.last_activity_at).getTime();
    });
  };

  if (error) {
    return (
      <Alert variant="error" className="m-4">
        {error}
        <Button
          variant="secondary"
          size="sm"
          onClick={loadThreads}
          className="mt-2"
        >
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Threads</h2>
          {onCreateThread && (
            <Button
              variant="primary"
              size="sm"
              onClick={onCreateThread}
            >
              New Thread
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={statusFilter.includes('active') ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setStatusFilter(prev => 
              prev.includes('active')
                ? prev.filter(s => s !== 'active')
                : [...prev, 'active']
            )}
          >
            Active
          </Button>
          <Button
            variant={statusFilter.includes('pinned') ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setStatusFilter(prev =>
              prev.includes('pinned')
                ? prev.filter(s => s !== 'pinned')
                : [...prev, 'pinned']
            )}
          >
            Pinned
          </Button>
          <Button
            variant={statusFilter.includes('archived') ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setStatusFilter(prev =>
              prev.includes('archived')
                ? prev.filter(s => s !== 'archived')
                : [...prev, 'archived']
            )}
          >
            Archived
          </Button>
        </div>
      </div>

      {/* Thread List */}
      <div className="overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Spinner size="lg" />
          </div>
        ) : threads.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No threads found
          </div>
        ) : (
          <div className="divide-y">
            {sortThreads(threads).map(thread => (
              <button
                key={thread.id}
                onClick={() => onThreadSelect(thread.id)}
                className={`
                  w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800
                  transition-colors duration-200
                  ${thread.id === selectedThreadId ? 'bg-primary/10' : ''}
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <div className="flex items-center space-x-2">
                      {thread.metadata.status === 'pinned' && (
                        <span className="text-primary">📌</span>
                      )}
                      <h3 className="font-medium truncate">
                        {thread.metadata.title || 'Untitled Thread'}
                      </h3>
                    </div>

                    {/* Last Message */}
                    {thread.last_message && (
                      <p className="mt-1 text-sm text-gray-500 truncate">
                        {thread.last_message.content}
                      </p>
                    )}

                    {/* Metadata */}
                    <div className="mt-1 flex items-center text-xs text-gray-400 space-x-2">
                      <span>
                        {formatDistanceToNow(
                          new Date(thread.metadata.last_activity_at),
                          { addSuffix: true }
                        )}
                      </span>
                      {thread.unread_count > 0 && (
                        <span className="px-2 py-0.5 bg-primary text-white rounded-full">
                          {thread.unread_count}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateThreadState(thread.id, {
                          is_muted: !thread.state?.is_muted
                        });
                      }}
                      className="p-1"
                    >
                      {thread.state?.is_muted ? '🔕' : '🔔'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateThreadState(thread.id, {
                          is_favorite: !thread.state?.is_favorite
                        });
                      }}
                      className="p-1"
                    >
                      {thread.state?.is_favorite ? '⭐' : '☆'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (thread.metadata.status === 'pinned') {
                          handleUpdateThread(thread.id, { status: 'active' });
                        } else {
                          handlePinThread(thread.id);
                        }
                      }}
                      className="p-1"
                    >
                      {thread.metadata.status === 'pinned' ? '📌' : '📍'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchiveThread(thread.id);
                      }}
                      className="p-1"
                    >
                      🗑️
                    </Button>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 