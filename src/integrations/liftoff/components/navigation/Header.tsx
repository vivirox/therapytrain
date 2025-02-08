import { HeaderProps } from '../../types/navigation';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export const Header = ({
  title,
  description,
  actions,
  className,
}: HeaderProps) => {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 pb-4 pt-6 md:flex-row md:items-center md:justify-between',
        className
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1.5"
      >
        {title && (
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        )}
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </motion.div>
      {actions && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-4"
        >
          {actions}
        </motion.div>
      )}
    </div>
  );
};

export default Header;
