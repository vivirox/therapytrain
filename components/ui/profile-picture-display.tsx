'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ProfilePictureDisplayProps {
  src?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onError?: () => void;
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

export function ProfilePictureDisplay({
  src,
  alt,
  size = 'md',
  className,
  onError,
}: ProfilePictureDisplayProps) {
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setError(true);
    setIsLoading(false);
    onError?.();
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800',
        sizeMap[size],
        className
      )}
      role="img"
      aria-label={alt}
    >
      {!error && src ? (
        <>
          <Image
            src={src}
            alt={alt}
            fill
            className={cn(
              'object-cover transition-opacity duration-300',
              isLoading ? 'opacity-0' : 'opacity-100'
            )}
            onError={handleError}
            onLoad={handleLoad}
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-primary/10 text-primary/50">
          {alt.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
} 