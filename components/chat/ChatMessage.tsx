import { memo, useState } from 'react';
import { ZKChatMessage } from '@/lib/zk/types';
import { formatDistanceToNow } from 'date-fns';
import {
  CheckIcon,
  CheckCheckIcon,
  AlertTriangleIcon,
  PencilIcon,
  ReplyIcon,
  MessageSquareIcon,
} from 'lucide-react';
import Link from 'next/link';

interface ChatMessageProps {
  message: ZKChatMessage;
  isOutgoing: boolean;
  onEdit?: (messageId: string, newContent: string) => Promise<void>;
  onReply?: (message: ZKChatMessage) => void;
  showThread?: boolean;
}

export const ChatMessage = memo(function ChatMessage({
  message,
  isOutgoing,
  onEdit,
  onReply,
  showThread = true,
}: ChatMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.decryptedContent || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timestamp = new Date(message.timestamp);
  const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true });
  const editedAt = message.last_edited_at ? new Date(message.last_edited_at) : null;
  const editedTimeAgo = editedAt ? formatDistanceToNow(editedAt, { addSuffix: true }) : null;

  const getStatusIcon = () => {
    if (message.error) {
      return <AlertTriangleIcon className="w-4 h-4 text-red-500" />;
    }
    switch (message.status) {
      case 'sent':
        return <CheckIcon className="w-4 h-4 text-gray-400" />;
      case 'delivered':
        return <CheckCheckIcon className="w-4 h-4 text-gray-400" />;
      case 'read':
        return <CheckCheckIcon className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const handleEdit = async () => {
    if (!onEdit || !message.id) return;
    
    try {
      setIsSubmitting(true);
      await onEdit(message.id, editContent);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to edit message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditContent(message.decryptedContent || '');
    }
  };

  const handleReply = () => {
    if (onReply) {
      onReply(message);
    }
  };

  return (
    <div
      className={`flex ${
        isOutgoing ? 'justify-end' : 'justify-start'
      } items-end space-x-2`}
    >
      <div
        className={`max-w-[70%] rounded-lg p-3 ${
          isOutgoing
            ? 'bg-blue-500 text-white rounded-br-none'
            : 'bg-gray-100 text-gray-900 rounded-bl-none'
        }`}
      >
        {message.parent_message_id && (
          <Link
            href={`/chat/${message.parent_message_id}`}
            className={`block mb-2 text-sm ${
              isOutgoing ? 'text-blue-100' : 'text-gray-500'
            } hover:underline`}
          >
            Replying to a message
          </Link>
        )}

        {message.error ? (
          <div className="text-red-500 text-sm mb-1">
            Failed to decrypt message
          </div>
        ) : isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              className="w-full min-h-[60px] p-2 rounded border bg-white text-gray-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Edit your message..."
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(message.decryptedContent || '');
                }}
                disabled={isSubmitting}
                className="px-2 py-1 text-xs rounded hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={isSubmitting || editContent.trim() === message.decryptedContent}
                className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words">
            {message.decryptedContent}
          </div>
        )}

        <div
          className={`flex items-center space-x-2 text-xs mt-1 ${
            isOutgoing ? 'text-blue-100' : 'text-gray-500'
          }`}
        >
          <span>{timeAgo}</span>
          {message.is_edited && (
            <span title={`Edited ${editedTimeAgo}`}>(edited)</span>
          )}
          {message.reply_count > 0 && showThread && (
            <Link
              href={`/chat/thread/${message.thread_id}`}
              className="flex items-center space-x-1 hover:underline"
            >
              <MessageSquareIcon className="w-3 h-3" />
              <span>{message.reply_count} replies</span>
            </Link>
          )}
          <div className="flex items-center space-x-2">
            {isOutgoing && <span>{getStatusIcon()}</span>}
            {onReply && (
              <button
                onClick={handleReply}
                className="p-1 rounded-full hover:bg-opacity-20 hover:bg-gray-600 transition-colors"
              >
                <ReplyIcon className="w-3 h-3" />
              </button>
            )}
            {onEdit && !isEditing && (
              <button
                onClick={() => {
                  setIsEditing(true);
                  setEditContent(message.decryptedContent || '');
                }}
                className="p-1 rounded-full hover:bg-opacity-20 hover:bg-gray-600 transition-colors"
              >
                <PencilIcon className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}); 