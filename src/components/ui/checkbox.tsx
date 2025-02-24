import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from '@/lib/utils';
import { useAccessibility } from '@/contexts/accessibility-context';
import { useFocusable } from '@/contexts/keyboard-navigation';

export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
    error?: string;
    description?: string;
    label?: string;
    'aria-describedby'?: string;
    'aria-errormessage'?: string;
}

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ 
  className, 
  error, 
  description,
  label,
  id,
  'aria-describedby': ariaDescribedby,
  'aria-errormessage': ariaErrorMessage,
  onCheckedChange,
  ...props 
}, ref) => {
  const { announce } = useAccessibility();
  const checkboxRef = useFocusable(0, 'checkbox');
  
  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof CheckboxPrimitive.Root> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (checkboxRef) checkboxRef.current = node;
    },
    [ref, checkboxRef]
  );

  // Announce state changes to screen readers
  const handleCheckedChange = (checked: boolean | 'indeterminate') => {
    const state = checked === 'indeterminate' ? 'indeterminate' : checked ? 'checked' : 'unchecked';
    announce(`${label ? label + ' ' : ''}checkbox ${state}`, 'polite');
    onCheckedChange?.(checked);
  };

  // Announce errors to screen readers
  React.useEffect(() => {
    if (error) {
      announce(`Error: ${error}`, 'assertive');
    }
  }, [error, announce]);

  const descriptionId = description ? `${id}-description` : ariaDescribedby;
  const errorId = error ? `${id}-error` : ariaErrorMessage;

  return (
    <div className="relative flex items-start">
      <div className="flex items-center">
        <CheckboxPrimitive.Root
          ref={combinedRef}
          id={id}
          className={cn(
            "peer h-4 w-4 shrink-0 rounded-sm border border-input ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
            "focus-visible-ring",
            error && "border-destructive focus-visible:ring-destructive",
            "high-contrast-text",
            "reduced-motion-safe",
            className
          )}
          onCheckedChange={handleCheckedChange}
          aria-invalid={!!error}
          aria-describedby={cn(descriptionId, errorId)}
          {...props}
        >
          <CheckboxPrimitive.Indicator 
            className={cn(
              "flex items-center justify-center text-current",
              "high-contrast-icon",
              "reduced-motion"
            )}
          >
            <Check className="h-4 w-4" />
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
        {label && (
          <label
            htmlFor={id}
            className={cn(
              "ml-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              error && "text-destructive",
              "high-contrast-text"
            )}
          >
            {label}
          </label>
        )}
      </div>
      {description && (
        <div
          id={descriptionId}
          className={cn(
            "mt-1 text-sm text-muted-foreground",
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
  );
});
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
