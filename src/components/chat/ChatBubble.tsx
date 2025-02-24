import React from 'react';
import { Message } from '@/types/chat';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle, Clock } from 'lucide-react';
import { FilePreview } from '../Attachments/FilePreview';
import { MessageReactions } from './MessageReactions';
import { formatDate } from '../../utils/format';

interface ChatBubbleProps {
  message: Message;
  isOwn: boolean;
  onReact: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  className?: string;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isOwn,
  onReact,
  onRemoveReaction,
  className
}) => {
  const timestamp = new Date(message.created_at);
  const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true });

  return (
    <div
      className={`
        flex
        ${isOwn ? 'justify-end' : 'justify-start'}
        mb-4
        ${className}
      `}
    >
      <div
        className={`
          max-w-[70%]
          ${isOwn ? 'bg-primary text-white' : 'bg-gray-100 text-gray-900'}
          rounded-lg
          px-4
          py-2
          ${message.attachments && message.attachments.length > 0 ? 'space-y-4' : ''}
        `}
      >
        {/* Message Text */}
        {message.content && (
          <p className="break-words">{message.content}</p>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="space-y-2">
            {message.attachments.map(attachment => (
              <FilePreview
                key={attachment.id}
                attachment={attachment}
                className={`
                  !bg-transparent
                  !border-0
                  ${isOwn ? '!text-white' : '!text-gray-900'}
                `}
              />
            ))}
          </div>
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-2">
            <MessageReactions
              reactions={message.reactions}
              onReact={(emoji) => onReact(message.id, emoji)}
              onRemoveReaction={(emoji) => onRemoveReaction(message.id, emoji)}
              className={isOwn ? 'justify-end' : 'justify-start'}
            />
          </div>
        )}

        {/* Timestamp */}
        <div
          className={`
            text-xs
            mt-1
            ${isOwn ? 'text-white/80' : 'text-gray-500'}
          `}
        >
          {formatDate(message.timestamp)}
        </div>

        {/* Status Indicators */}
        {message.status && message.status !== 'sent' && (
          <div
            className={`
              text-xs
              ${isOwn ? 'text-white/80' : 'text-gray-500'}
              italic
            `}
          >
            {message.status === 'sending' && 'Sending...'}
            {message.status === 'failed' && 'Failed to send'}
            {message.status === 'queued' && 'Queued'}
          </div>
        )}
      </div>
    </div>
  );
}; 