import { BreadcrumbProps } from '../../types/navigation';
import { cn } from '@/lib/utils';
import { ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export const Breadcrumb = ({ items, className }: BreadcrumbProps) => {
  return (
    <nav 
      className={cn("flex items-center space-x-1 text-sm", className)}
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => (
        <motion.div
          key={item.title}
          className="flex items-center"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          {index > 0 && (
            <ChevronRightIcon 
              className="mx-1 h-4 w-4 text-muted-foreground"
              data-testid="breadcrumb-separator"
              aria-hidden="true"
            />
          )}
          {index === items.length - 1 ? (
            <span className="font-medium text-foreground" aria-current="page">
              {item.title}
            </span>
          ) : (
            <Link
              href={item.href}
              className="hover:text-foreground text-muted-foreground transition-colors"
            >
              {item.title}
            </Link>
          )}
        </motion.div>
      ))}
    </nav>
  );
};

export default Breadcrumb;
