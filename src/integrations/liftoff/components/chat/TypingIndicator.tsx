import { TypingIndicatorProps } from '../../types/chat';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const TypingIndicator = ({ className }: TypingIndicatorProps) => {
  return (
    <div className={cn('flex items-center space-x-2 p-2', className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-2 w-2 rounded-full bg-gray-400"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            repeatType: 'reverse',
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
};

export default TypingIndicator;
