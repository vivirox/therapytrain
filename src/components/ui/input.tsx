import * as React from "react"
import { cn } from '@/lib/utils'
import { useAccessibility } from '@/contexts/accessibility-context'
import { useFocusable } from '@/contexts/keyboard-navigation'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
    className?: string;
    error?: string;
    description?: string;
    'aria-describedby'?: string;
    'aria-errormessage'?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type, 
    error,
    description,
    id,
    'aria-describedby': ariaDescribedby,
    'aria-errormessage': ariaErrorMessage,
    ...props 
  }, ref) => {
    const { announce } = useAccessibility();
    const inputRef = useFocusable(0, 'input');
    
    // Combine refs
    const combinedRef = React.useCallback(
      (node: HTMLInputElement | null) => {
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
        if (inputRef) inputRef.current = node;
      },
      [ref, inputRef]
    );

    // Announce errors to screen readers
    React.useEffect(() => {
      if (error) {
        announce(`Error: ${error}`, 'assertive');
      }
    }, [error, announce]);

    const descriptionId = description ? `${id}-description` : ariaDescribedby;
    const errorId = error ? `${id}-error` : ariaErrorMessage;

    return (
      <div className="relative">
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
            "focus-visible-ring",
            error && "border-destructive focus-visible:ring-destructive",
            "high-contrast-text",
            "reduced-motion-safe",
            className
          )}
          ref={combinedRef}
          aria-invalid={!!error}
          aria-describedby={cn(descriptionId, errorId)}
          {...props}
        />
        {description && (
          <div
            id={descriptionId}
            className={cn(
              "mt-2 text-sm text-muted-foreground",
              "high-contrast-text"
            )}
          >
            {description}
          </div>
        )}
        {error && (
          <div
            id={errorId}
            className={cn(
              "mt-2 text-sm text-destructive",
              "high-contrast-text"
            )}
            role="alert"
          >
            {error}
          </div>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
