import { useEffect, useRef, useState } from 'react';
import { useChat } from '@/hooks/useChat';
import { useThread } from '@/hooks/useThread';
import { ZKChatMessage } from '@/lib/zk/types';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Thread } from '@/lib/zk/thread-management';

interface ChatContainerProps {
  recipientId: string;
  threadId?: string;
  className?: string;
  onThreadCreate?: (thread: Thread) => void;
}

export function ChatContainer({
  recipientId,
  threadId,
  className = '',
  onThreadCreate,
}: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [replyToMessage, setReplyToMessage] = useState<ZKChatMessage | null>(null);
  const { messages, isLoading, error, sendMessage, editMessage } = useChat(recipientId);
  const {
    thread,
    participants,
    isLoading: threadLoading,
    error: threadError,
    createNewThread,
    markAsRead,
  } = useThread(threadId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (thread?.isUnread) {
      markAsRead();
    }
  }, [thread, markAsRead]);

  const handleEdit = async (messageId: string, newContent: string) => {
    try {
      await editMessage(messageId, newContent);
    } catch (err) {
      console.error('Failed to edit message:', err);
      // You might want to show a toast or error message here
    }
  };

  const handleSend = async (content: string) => {
    try {
      if (replyToMessage && !threadId) {
        // Create a new thread for the reply
        const newThreadId = await createNewThread([recipientId], replyToMessage.decryptedContent);
        if (onThreadCreate && thread) {
          onThreadCreate(thread);
        }
        await sendMessage(content, newThreadId, replyToMessage.id);
      } else {
        await sendMessage(content, threadId, replyToMessage?.id);
      }
      setReplyToMessage(null);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleReply = (message: ZKChatMessage) => {
    setReplyToMessage(message);
  };

  const handleCancelReply = () => {
    setReplyToMessage(null);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {thread && (
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">{thread.title || 'Thread'}</h2>
          <div className="text-sm text-gray-500">
            {participants.length} participants • {thread.messageCount} messages
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {(error || threadError) && (
          <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
            Error: {error || threadError}
          </div>
        )}
        
        {messages.map((message: ZKChatMessage) => (
          <ChatMessage
            key={message.id}
            message={message}
            isOutgoing={message.senderId === recipientId}
            onEdit={message.senderId === recipientId ? handleEdit : undefined}
            onReply={handleReply}
            showThread={!threadId}
          />
        ))}

        {(isLoading || threadLoading) && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-pulse flex space-x-4">
              <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
              <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
              <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        {replyToMessage && (
          <div className="mb-2 p-2 bg-gray-50 rounded-lg flex items-start">
            <div className="flex-1">
              <div className="text-sm text-gray-500">Replying to:</div>
              <div className="text-sm truncate">{replyToMessage.decryptedContent}</div>
            </div>
            <button
              onClick={handleCancelReply}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        )}
        <ChatInput onSend={handleSend} />
      </div>
    </div>
  );
} 