import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'page' | 'card' | 'spinner';
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const variantClassMap = {
  default: 'flex items-center justify-center',
  page: 'min-h-screen flex items-center justify-center',
  card: 'min-h-[200px] flex items-center justify-center',
  spinner: 'inline-flex',
};

const sizeClassMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export const Loading: React.FC<LoadingProps> = ({
  variant = 'default',
  size = 'md',
  text = 'Loading...',
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'text-muted-foreground',
        variantClassMap[variant],
        className
      )}
      {...props}
    >
      <div className="flex flex-col items-center gap-2">
        <Loader2
          className={cn(
            'animate-spin',
            sizeClassMap[size]
          )}
        />
        {variant !== 'spinner' && (
          <span className="text-sm font-medium">{text}</span>
        )}
      </div>
    </div>
  );
};

export const LoadingComponent: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 dark:border-gray-50"></div>
  </div>
)
