import { createClient } from '@supabase/supabase-js';
import { Database } from '../database.types';
import { encrypt } from './crypto';
import { getOrCreateSharedKey } from './session';
import { ZKSession } from './types';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface Thread {
  id: string;
  title: string | null;
  participantCount: number;
  messageCount: number;
  lastMessageAt: Date;
  isUnread: boolean;
}

export interface ThreadParticipant {
  userId: string;
  joinedAt: Date;
  lastReadAt: Date;
  isMuted: boolean;
}

export async function createThread(
  creatorId: string,
  participantIds: string[],
  title?: string
): Promise<string> {
  const { data: thread, error: threadError } = await supabase
    .from('threads')
    .insert({
      creator_id: creatorId,
      title,
      participant_count: participantIds.length + 1,
    })
    .select()
    .single();

  if (threadError || !thread) {
    throw new Error('Failed to create thread: ' + threadError?.message);
  }

  // Add participants
  const participants = participantIds.map((userId) => ({
    thread_id: thread.id,
    user_id: userId,
  }));

  // Add creator as participant
  participants.push({
    thread_id: thread.id,
    user_id: creatorId,
  });

  const { error: participantError } = await supabase
    .from('thread_participants')
    .insert(participants);

  if (participantError) {
    throw new Error('Failed to add participants: ' + participantError.message);
  }

  return thread.id;
}

export async function getThread(threadId: string): Promise<Thread> {
  const { data: thread, error: threadError } = await supabase
    .from('threads')
    .select('*, thread_participants!inner(*)')
    .eq('id', threadId)
    .single();

  if (threadError || !thread) {
    throw new Error('Failed to get thread: ' + threadError?.message);
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const participant = thread.thread_participants.find(
    (p) => p.user_id === session.user.id
  );

  return {
    id: thread.id,
    title: thread.title,
    participantCount: thread.participant_count,
    messageCount: thread.message_count,
    lastMessageAt: new Date(thread.last_message_at),
    isUnread: participant
      ? new Date(thread.last_message_at) > new Date(participant.last_read_at)
      : false,
  };
}

export async function getThreadParticipants(threadId: string): Promise<ThreadParticipant[]> {
  const { data: participants, error } = await supabase
    .from('thread_participants')
    .select('*')
    .eq('thread_id', threadId);

  if (error) {
    throw new Error('Failed to get thread participants: ' + error.message);
  }

  return participants.map((p) => ({
    userId: p.user_id,
    joinedAt: new Date(p.joined_at),
    lastReadAt: new Date(p.last_read_at),
    isMuted: p.is_muted,
  }));
}

export async function updateThreadSummary(
  threadId: string,
  summary: string,
  session: ZKSession
): Promise<void> {
  // Get all participants' public keys
  const { data: participants } = await supabase
    .from('thread_participants')
    .select('user_id')
    .eq('thread_id', threadId);

  if (!participants) {
    throw new Error('Failed to get thread participants');
  }

  // For each participant, encrypt the summary with their shared key
  await Promise.all(
    participants.map(async (participant) => {
      const { data: recipientData } = await supabase
        .from('user_keys')
        .select('public_key')
        .eq('user_id', participant.user_id)
        .single();

      if (!recipientData) {
        throw new Error('Failed to get recipient public key');
      }

      const sharedKey = await getOrCreateSharedKey(
        session,
        participant.user_id,
        recipientData.public_key
      );

      const encryptedSummary = await encrypt(summary, sharedKey);

      await supabase.from('thread_summaries').upsert({
        thread_id: threadId,
        user_id: participant.user_id,
        encrypted_summary: encryptedSummary.content,
        iv: encryptedSummary.iv,
      });
    })
  );
}

export async function markThreadAsRead(threadId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const { error } = await supabase
    .from('thread_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('thread_id', threadId)
    .eq('user_id', session.user.id);

  if (error) {
    throw new Error('Failed to mark thread as read: ' + error.message);
  }
}

export async function muteThread(threadId: string, muted: boolean): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const { error } = await supabase
    .from('thread_participants')
    .update({ is_muted: muted })
    .eq('thread_id', threadId)
    .eq('user_id', session.user.id);

  if (error) {
    throw new Error('Failed to update thread mute status: ' + error.message);
  }
}

export async function subscribeToThread(
  threadId: string,
  callback: (thread: Thread) => void
): Promise<() => void> {
  const channel = supabase
    .channel(`thread-${threadId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'threads',
        filter: `id=eq.${threadId}`,
      },
      async (payload) => {
        if (payload.new) {
          const thread = await getThread(threadId);
          callback(thread);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
} 