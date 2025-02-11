import { ChatContainerProps } from '../../types/chat';
import { useEffect, useRef, FC } from 'react';
import { cn } from '@/lib/utils';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';

export const ChatContainer: FC<ChatContainerProps> = ({
  messages,
  onSendMessage,
  isLoading,
  className,
  children,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className={cn('flex h-full flex-col overflow-hidden', className)}>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              isLast={index === messages.length - 1}
            />
          ))}
          {isLoading && (
            <MessageBubble
              message={{
                id: 'loading',
                role: 'assistant',
                content: '',
                timestamp: new Date(),
                isTyping: true,
              }}
            />
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {children}

      <ChatInput
        onSendMessage={onSendMessage}
        isDisabled={isLoading}
        className="border-t bg-background"
      />
    </div>
  );
};

export default ChatContainer;
