import { createClient } from '@supabase/supabase-js';
import { Database } from '../database.types';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type MessageStatus = 'sent' | 'delivered' | 'read';

export async function updateMessageStatus(
  messageId: string,
  userId: string,
  status: MessageStatus
): Promise<void> {
  const { error } = await supabase.from('message_status').upsert(
    {
      message_id: messageId,
      user_id: userId,
      status,
      timestamp: new Date().toISOString(),
    },
    {
      onConflict: 'message_id,user_id',
    }
  );

  if (error) {
    throw new Error('Failed to update message status: ' + error.message);
  }
}

export async function getMessageStatus(messageId: string): Promise<MessageStatus[]> {
  const { data, error } = await supabase
    .from('message_status')
    .select('*')
    .eq('message_id', messageId)
    .order('timestamp', { ascending: true });

  if (error) {
    throw new Error('Failed to get message status: ' + error.message);
  }

  return data.map((status) => status.status);
}

export async function markMessageAsDelivered(messageId: string, userId: string): Promise<void> {
  await updateMessageStatus(messageId, userId, 'delivered');
}

export async function markMessageAsRead(messageId: string, userId: string): Promise<void> {
  await updateMessageStatus(messageId, userId, 'read');
}

export async function getUnreadMessageCount(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact' })
    .eq('recipient_id', userId)
    .not('message_status', 'eq', 'read');

  if (error) {
    throw new Error('Failed to get unread message count: ' + error.message);
  }

  return data.length;
}

export async function subscribeToMessageStatus(
  messageId: string,
  callback: (status: MessageStatus) => void
): Promise<() => void> {
  const channel = supabase
    .channel(`message-status-${messageId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'message_status',
        filter: `message_id=eq.${messageId}`,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new.status as MessageStatus);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function updateTypingStatus(
  userId: string,
  chatWithId: string,
  isTyping: boolean
): Promise<void> {
  const { error } = await supabase.rpc('update_typing_status', {
    user_id: userId,
    chat_with: chatWithId,
    is_typing: isTyping,
  });

  if (error) {
    throw new Error('Failed to update typing status: ' + error.message);
  }
}

export async function subscribeToTypingStatus(
  chatWithId: string,
  callback: (isTyping: boolean) => void
): Promise<() => void> {
  const channel = supabase
    .channel(`typing-status-${chatWithId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'typing_status',
        filter: `chat_with=eq.${chatWithId}`,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new.is_typing);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
} 