import * as React from 'react'
import { cn } from '../../lib/utils'
import { FocusRing } from './focus-ring'

interface NavFocusRingProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  active?: boolean
}

export const NavFocusRing = React.forwardRef<HTMLDivElement, NavFocusRingProps>(
  ({ children, active, className, color, ...props }, ref) => {
    return (
      <FocusRing
        ref={ref}
        variant="subtle"
        thickness="thin"
        className={cn(
          'transition-colors',
          active && 'bg-accent/10',
          className
        )}
        {...props}
      >
        {children}
      </FocusRing>
    )
  }
)

NavFocusRing.displayName = 'NavFocusRing' 