import React from 'react';
import { cn } from '@/lib/utils';

export interface SkipLinkProps {
  links: Array<{
    label: string;
    target: string;
  }>;
  className?: string;
}

export function SkipLinks({ links, className }: SkipLinkProps) {
  return (
    <nav
      aria-label="Skip navigation"
      className={cn(
        'fixed top-0 left-0 z-50 w-full transform -translate-y-full transition-transform',
        'focus-within:translate-y-0',
        className
      )}
    >
      {links.map(({ label, target }) => (
        <a
          key={target}
          href={`#${target}`}
          className={cn(
            'sr-only focus:not-sr-only',
            'block w-full bg-background px-4 py-3',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            'text-foreground font-medium'
          )}
          onClick={(e) => {
            e.preventDefault();
            const element = document.getElementById(target);
            if (element) {
              element.focus();
              element.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        >
          {label}
        </a>
      ))}
    </nav>
  );
} 