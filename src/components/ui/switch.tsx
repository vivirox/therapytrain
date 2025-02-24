import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";
import { useAccessibility } from "@/contexts/accessibility-context";
import { useFocusable } from "@/contexts/keyboard-navigation";

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
    error?: string;
    description?: string;
    label?: string;
    'aria-describedby'?: string;
    'aria-errormessage'?: string;
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
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
  const switchRef = useFocusable(0, 'switch');

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof SwitchPrimitive.Root> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (switchRef) switchRef.current = node;
    },
    [ref, switchRef]
  );

  // Announce state changes to screen readers
  const handleCheckedChange = (checked: boolean) => {
    announce(`${label ? label + ' ' : ''}switch ${checked ? 'on' : 'off'}`, 'polite');
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
    <div className="relative space-y-2">
      <div className="flex items-center space-x-2">
        <SwitchPrimitive.Root
          ref={combinedRef}
          id={id}
          className={cn(
            "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
            "focus-visible-ring",
            "high-contrast-button",
            "reduced-motion-safe",
            "data-[state=checked]:bg-primary",
            "data-[state=unchecked]:bg-input",
            error && "border-destructive",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          onCheckedChange={handleCheckedChange}
          aria-invalid={!!error}
          aria-describedby={cn(descriptionId, errorId)}
          {...props}
        >
          <SwitchPrimitive.Thumb
            className={cn(
              "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
              "data-[state=checked]:translate-x-5",
              "data-[state=unchecked]:translate-x-0",
              "high-contrast-text",
              "reduced-motion-safe"
            )}
          />
        </SwitchPrimitive.Root>
        {label && (
          <label
            htmlFor={id}
            className={cn(
              "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
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
            "text-sm text-muted-foreground",
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
            "text-sm text-destructive",
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
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
