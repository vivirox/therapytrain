import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button, Popover } from '@/components/ui';

// Common emoji categories with frequently used emojis
const EMOJI_CATEGORIES = {
  frequent: ['👍', '❤️', '😊', '👏', '🎉', '🙌', '💯', '✨'],
  emotions: ['😀', '😂', '🥹', '😊', '🥰', '😍', '🤗', '🤔', '😅', '😭', '😤', '😴'],
  gestures: ['👍', '👎', '👌', '🤝', '👊', '✌️', '🙌', '👏', '🙏', '💪'],
  symbols: ['❤️', '💔', '💯', '✨', '🔥', '⭐', '💫', '💡', '❌', '✅'],
  objects: ['🎉', '🎊', '🎯', '🎨', '📚', '💻', '⏰', '🎵', '🎮', '🎲'],
  nature: ['🌟', '🌈', '🌺', '🌸', '🍀', '🌿', '🌱', '🌍', '☀️', '🌙']
};

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  recentEmojis?: string[];
  className?: string;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onSelect,
  recentEmojis = [],
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof EMOJI_CATEGORIES>('frequent');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  const handleSelect = useCallback((emoji: string) => {
    onSelect(emoji);
    setIsOpen(false);
  }, [onSelect]);

  return (
    <div className={className}>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 rounded-full"
      >
        <span className="text-xl">😊</span>
      </Button>

      <Popover
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="z-50"
        style={{
          position: 'absolute',
          top: `${position.top}px`,
          left: `${position.left}px`
        }}
      >
        <div className="bg-white rounded-lg shadow-lg border p-2 w-72">
          {/* Category Tabs */}
          <div className="flex space-x-1 mb-2 overflow-x-auto pb-2">
            {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedCategory(category as keyof typeof EMOJI_CATEGORIES)}
                className="whitespace-nowrap"
              >
                {emojis[0]} {category}
              </Button>
            ))}
          </div>

          {/* Recent Emojis */}
          {recentEmojis.length > 0 && (
            <div className="mb-2">
              <div className="text-xs text-gray-500 mb-1">Recently Used</div>
              <div className="grid grid-cols-8 gap-1">
                {recentEmojis.map((emoji, index) => (
                  <Button
                    key={`${emoji}-${index}`}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelect(emoji)}
                    className="p-1 hover:bg-gray-100 text-xl"
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Emoji Grid */}
          <div className="grid grid-cols-8 gap-1">
            {EMOJI_CATEGORIES[selectedCategory].map((emoji, index) => (
              <Button
                key={`${emoji}-${index}`}
                variant="ghost"
                size="sm"
                onClick={() => handleSelect(emoji)}
                className="p-1 hover:bg-gray-100 text-xl"
              >
                {emoji}
              </Button>
            ))}
          </div>
        </div>
      </Popover>
    </div>
  );
}; 