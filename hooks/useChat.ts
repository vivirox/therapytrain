import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ZKChatMessage } from '@/lib/zk/types';
import { editMessage as editMessageUtil } from '@/lib/zk/message-edits';
import { getSession } from '@/lib/zk/session';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UseChatResult {
  messages: ZKChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string, threadId?: string, parentMessageId?: string) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
}

export function useChat(recipientId: string, threadId?: string): UseChatResult {
  const [messages, setMessages] = useState<ZKChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams({
        recipientId,
        ...(threadId && { threadId }),
      });

      const response = await fetch(`/api/chat?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      const data = await response.json();
      setMessages(data.messages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setIsLoading(false);
    }
  }, [recipientId, threadId]);

  const sendMessage = async (content: string, threadId?: string, parentMessageId?: string) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages,
            {
              content,
              role: 'user',
            },
          ],
          recipientId,
          threadId,
          parentMessageId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(Boolean);

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(5);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                setMessages((prev) => [
                  ...prev,
                  {
                    ...parsed,
                    status: 'sent',
                    thread_id: threadId,
                    parent_message_id: parentMessageId,
                  },
                ]);
              } catch (e) {
                console.error('Failed to parse message chunk:', e);
              }
            }
          }
        }
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
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

      await editMessageUtil(messageId, newContent, userSession);

      // Update message in local state
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                decryptedContent: newContent,
                is_edited: true,
                last_edited_at: new Date().toISOString(),
              }
            : msg
        )
      );

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to edit message');
      throw err; // Re-throw to handle in the UI
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: threadId
            ? `thread_id=eq.${threadId}`
            : `recipientId=eq.${recipientId}`,
        },
        (payload) => {
          const newMessage = payload.new as ZKChatMessage;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    // Subscribe to message edits
    const editChannel = supabase
      .channel('message-edits')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_edits',
        },
        async () => {
          // Refetch messages to get the latest content
          await fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(editChannel);
    };
  }, [recipientId, threadId, fetchMessages]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    editMessage,
  };
} 