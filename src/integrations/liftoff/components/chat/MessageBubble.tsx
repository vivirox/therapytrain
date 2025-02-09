import { MessageBubbleProps } from '../../types/chat';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CheckIcon, CheckCheckIcon } from 'lucide-react';
import { TypingIndicator } from './TypingIndicator';

export const MessageBubble = ({ message, isLast, className }: MessageBubbleProps) => {
  const isUser = message.role === 'user';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start',
        className
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {message.isTyping ? (
          <TypingIndicator />
        ) : (
          <>
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
            {isUser && message.status && (
              <div className="mt-1 flex justify-end space-x-1">
                {message.status === 'sent' && (
                  <CheckIcon className="h-3 w-3 text-muted" />
                )}
                {message.status === 'delivered' && (
                  <CheckCheckIcon className="h-3 w-3 text-muted" />
                )}
                {message.status === 'read' && (
                  <CheckCheckIcon className="h-3 w-3 text-blue-500" />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default MessageBubble;
