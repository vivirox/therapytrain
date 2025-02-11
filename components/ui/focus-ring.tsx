import * as React from 'react'
import { cn } from '../../lib/utils'

export interface FocusRingProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: 'default' | 'subtle' | 'prominent'
  color?: 'primary' | 'secondary' | 'accent'
  thickness?: 'thin' | 'medium' | 'thick'
  animate?: boolean
}

export const FocusRing = React.forwardRef<HTMLDivElement, FocusRingProps>(
  ({
    children,
    variant = 'default',
    color = 'primary',
    thickness = 'medium',
    animate = true,
    className,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'group relative inline-flex',
          className
        )}
        {...props}
      >
        {children}
        <div
          className={cn(
            'absolute inset-0 rounded-[--radius] pointer-events-none opacity-0 transition-[opacity,transform]',
            'group-focus-visible:opacity-100',
            animate && 'duration-200',
            {
              // Variants
              'ring-2 ring-offset-2': variant === 'default',
              'ring-1 ring-offset-1': variant === 'subtle',
              'ring-4 ring-offset-2': variant === 'prominent',
              
              // Colors
              'ring-primary ring-offset-background': color === 'primary',
              'ring-secondary ring-offset-background': color === 'secondary',
              'ring-accent ring-offset-background': color === 'accent',
              
              // Thickness
              'ring-[1px]': thickness === 'thin',
              'ring-[2px]': thickness === 'medium',
              'ring-[3px]': thickness === 'thick',
            }
          )}
          aria-hidden="true"
        />
      </div>
    )
  }
)

FocusRing.displayName = 'FocusRing' 