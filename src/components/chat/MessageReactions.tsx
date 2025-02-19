import React, { useCallback, useState } from 'react';
import { MessageReactionCount } from '../../types/chat';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import { EmojiPicker } from './EmojiPicker';

interface MessageReactionsProps {
  reactions: MessageReactionCount[];
  onReact: (emoji: string) => void;
  onRemoveReaction: (emoji: string) => void;
  className?: string;
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  onReact,
  onRemoveReaction,
  className
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const { user } = useAuth();

  const handleReact = useCallback((emoji: string) => {
    onReact(emoji);
    setShowPicker(false);
  }, [onReact]);

  const handleToggleReaction = useCallback((emoji: string, userIds: string[]) => {
    if (user && userIds.includes(user.id)) {
      onRemoveReaction(emoji);
    } else {
      onReact(emoji);
    }
  }, [user, onReact, onRemoveReaction]);

  const formatUserList = (userIds: string[]): string => {
    if (!userIds.length) return '';
    if (userIds.length === 1) return 'One person reacted';
    return `${userIds.length} people reacted`;
  };

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {/* Existing Reactions */}
      {reactions.map(({ emoji, count, user_ids }) => (
        <Tooltip
          key={emoji}
          content={formatUserList(user_ids)}
          className="z-50"
        >
          <Button
            variant={user && user_ids.includes(user.id) ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => handleToggleReaction(emoji, user_ids)}
            className="px-2 py-1 text-sm rounded-full hover:scale-110 transition-transform"
          >
            <span className="mr-1">{emoji}</span>
            <span className="text-xs">{count}</span>
          </Button>
        </Tooltip>
      ))}

      {/* Add Reaction Button */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPicker(!showPicker)}
          className="p-1 rounded-full hover:bg-gray-100"
        >
          <svg
            className="w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </Button>

        {showPicker && (
          <div className="absolute bottom-full right-0 mb-2">
            <EmojiPicker
              onSelect={handleReact}
              recentEmojis={reactions.slice(0, 8).map(r => r.emoji)}
            />
          </div>
        )}
      </div>
    </div>
  );
}; 