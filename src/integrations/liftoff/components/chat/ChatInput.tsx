import { ChatInputProps } from '../../types/chat';
import { useState, useRef, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { SendIcon, SmileIcon } from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';

export const ChatInput = ({
  onSendMessage,
  isDisabled,
  placeholder = 'Type a message...',
  className,
}: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSendMessage = () => {
    if (message.trim() && !isDisabled) {
      onSendMessage(message.trim());
      setMessage('');
      textareaRef.current?.focus();
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiSelect = (emoji: any) => {
    setMessage((prev) => prev + emoji.native);
    setIsEmojiPickerOpen(false);
    textareaRef.current?.focus();
  };

  return (
    <div className={cn('flex items-end space-x-2 p-4', className)}>
      <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            disabled={isDisabled}
          >
            <SmileIcon className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-full border-none p-0"
          side="top"
          align="start"
        >
          <Picker
            data={data}
            onEmojiSelect={handleEmojiSelect}
            theme="light"
            previewPosition="none"
          />
        </PopoverContent>
      </Popover>

      <Textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder={placeholder}
        disabled={isDisabled}
        className="min-h-[2.5rem] max-h-32 resize-none"
        rows={1}
      />

      <Button
        onClick={handleSendMessage}
        disabled={!message.trim() || isDisabled}
        size="icon"
        className="h-9 w-9"
      >
        <SendIcon className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default ChatInput;
