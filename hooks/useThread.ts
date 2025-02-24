import { useState, useEffect, useCallback } from 'react';
import {
  Thread,
  ThreadParticipant,
  createThread,
  getThread,
  getThreadParticipants,
  markThreadAsRead,
  muteThread,
  subscribeToThread,
  updateThreadSummary,
} from '@/lib/zk/thread-management';
import { getSession } from '@/lib/zk/session';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UseThreadResult {
  thread: Thread | null;
  participants: ThreadParticipant[];
  isLoading: boolean;
  error: string | null;
  createNewThread: (participantIds: string[], title?: string) => Promise<string>;
  markAsRead: () => Promise<void>;
  setMuted: (muted: boolean) => Promise<void>;
  updateSummary: (summary: string) => Promise<void>;
}

export function useThread(threadId?: string): UseThreadResult {
  const [thread, setThread] = useState<Thread | null>(null);
  const [participants, setParticipants] = useState<ThreadParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThread = useCallback(async () => {
    if (!threadId) return;

    try {
      const threadData = await getThread(threadId);
      setThread(threadData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch thread');
    }
  }, [threadId]);

  const fetchParticipants = useCallback(async () => {
    if (!threadId) return;

    try {
      const participantData = await getThreadParticipants(threadId);
      setParticipants(participantData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch participants');
    }
  }, [threadId]);

  const createNewThread = async (participantIds: string[], title?: string): Promise<string> => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const newThreadId = await createThread(session.user.id, participantIds, title);
      setError(null);
      return newThreadId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create thread');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async () => {
    if (!threadId) return;

    try {
      setIsLoading(true);
      await markThreadAsRead(threadId);
      await fetchThread();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark thread as read');
    } finally {
      setIsLoading(false);
    }
  };

  const setMuted = async (muted: boolean) => {
    if (!threadId) return;

    try {
      setIsLoading(true);
      await muteThread(threadId, muted);
      await fetchParticipants();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update mute status');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSummary = async (summary: string) => {
    if (!threadId) return;

    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const userSession = await getSession(session.user.id);
      if (!userSession) {
        throw new Error('No user session found');
      }

      await updateThreadSummary(threadId, summary, userSession);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update thread summary');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (threadId) {
      setIsLoading(true);
      Promise.all([fetchThread(), fetchParticipants()]).finally(() => {
        setIsLoading(false);
      });
    }
  }, [threadId, fetchThread, fetchParticipants]);

  useEffect(() => {
    if (!threadId) return;

    const unsubscribe = subscribeToThread(threadId, (updatedThread) => {
      setThread(updatedThread);
    });

    return () => {
      unsubscribe();
    };
  }, [threadId]);

  return {
    thread,
    participants,
    isLoading,
    error,
    createNewThread,
    markAsRead,
    setMuted,
    updateSummary,
  };
} 