import * as React from 'react'
import { cn } from '../../lib/utils'
import { FocusRing } from './focus-ring'

interface FormFocusRingProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  error?: boolean
  disabled?: boolean
}

export const FormFocusRing = React.forwardRef<HTMLDivElement, FormFocusRingProps>(
  ({ children, error, disabled, className }, ref) => {
    return (
      <FocusRing
        ref={ref}
        variant="default"
        className={cn(
          'w-full',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        {children}
      </FocusRing>
    )
  }
)

FormFocusRing.displayName = 'FormFocusRing' 