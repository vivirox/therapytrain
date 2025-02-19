import { TypingIndicatorProps } from '../../types/chat';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const TypingIndicator = ({ className }: TypingIndicatorProps) => {
  return (
    <div 
      className={cn("flex items-center space-x-2 p-2", className)}
      role="status"
      aria-label="Assistant is typing"
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-2 w-2 rounded-full bg-gray-400"
          data-testid="typing-dot"
          aria-hidden="true"
        />
      ))}
    </div>
  );
};

export default TypingIndicator;
