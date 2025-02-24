import { createClient } from '@supabase/supabase-js';
import { Database } from '../database.types';
import { encrypt } from './crypto';
import { getOrCreateSharedKey } from './session';
import { ZKSession } from './types';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface MessageEdit {
  messageId: string;
  previousContent: string;
  newContent: string;
  editedAt: Date;
}

export async function editMessage(
  messageId: string,
  newContent: string,
  session: ZKSession
): Promise<void> {
  // Get the original message
  const { data: message, error: messageError } = await supabase
    .from('messages')
    .select('*')
    .eq('id', messageId)
    .single();

  if (messageError || !message) {
    throw new Error('Failed to get message: ' + messageError?.message);
  }

  // Verify user owns the message
  if (message.sender_id !== session.id) {
    throw new Error('Cannot edit message: not the sender');
  }

  // Get recipient's public key
  const { data: recipientData } = await supabase
    .from('user_keys')
    .select('public_key')
    .eq('user_id', message.recipient_id)
    .single();

  if (!recipientData) {
    throw new Error('Failed to get recipient public key');
  }

  // Get shared key
  const sharedKey = await getOrCreateSharedKey(
    session,
    message.recipient_id,
    recipientData.public_key
  );

  // Encrypt new content
  const encryptedNewContent = await encrypt(newContent, sharedKey);

  // Create edit record
  const { error: editError } = await supabase.from('message_edits').insert({
    message_id: messageId,
    editor_id: session.id,
    previous_content: message.encrypted_content,
    previous_iv: message.iv,
    new_content: encryptedNewContent.content,
    new_iv: encryptedNewContent.iv,
  });

  if (editError) {
    throw new Error('Failed to create edit record: ' + editError.message);
  }

  // Update message content
  const { error: updateError } = await supabase
    .from('messages')
    .update({
      encrypted_content: encryptedNewContent.content,
      iv: encryptedNewContent.iv,
    })
    .eq('id', messageId);

  if (updateError) {
    throw new Error('Failed to update message: ' + updateError.message);
  }
}

export async function getMessageEdits(messageId: string): Promise<MessageEdit[]> {
  const { data: edits, error } = await supabase
    .from('message_edits')
    .select('*')
    .eq('message_id', messageId)
    .order('edited_at', { ascending: true });

  if (error) {
    throw new Error('Failed to get message edits: ' + error.message);
  }

  return edits.map((edit) => ({
    messageId: edit.message_id,
    previousContent: edit.previous_content,
    newContent: edit.new_content,
    editedAt: new Date(edit.edited_at),
  }));
}

export async function subscribeToMessageEdits(
  messageId: string,
  callback: (edit: MessageEdit) => void
): Promise<() => void> {
  const channel = supabase
    .channel(`message-edits-${messageId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'message_edits',
        filter: `message_id=eq.${messageId}`,
      },
      (payload) => {
        if (payload.new) {
          const edit = payload.new as Database['public']['Tables']['message_edits']['Row'];
          callback({
            messageId: edit.message_id,
            previousContent: edit.previous_content,
            newContent: edit.new_content,
            editedAt: new Date(edit.edited_at),
          });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
} 