import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";
import { cn } from '@/lib/utils';
import { useAccessibility } from '@/contexts/accessibility-context';
import { useFocusable } from '@/contexts/keyboard-navigation';

export interface RadioGroupProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> {
    error?: string;
    description?: string;
    label?: string;
    'aria-describedby'?: string;
    'aria-errormessage'?: string;
}

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  RadioGroupProps
>(({ 
  className, 
  error,
  description,
  label,
  id,
  'aria-describedby': ariaDescribedby,
  'aria-errormessage': ariaErrorMessage,
  onValueChange,
  ...props 
}, ref) => {
  const { announce } = useAccessibility();
  const groupRef = useFocusable(0, 'radio-group');
  
  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof RadioGroupPrimitive.Root> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (groupRef) groupRef.current = node;
    },
    [ref, groupRef]
  );

  // Announce value changes to screen readers
  const handleValueChange = (value: string) => {
    announce(`Selected: ${value}`, 'polite');
    onValueChange?.(value);
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
      {label && (
        <div
          className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            error && "text-destructive",
            "high-contrast-text"
          )}
        >
          {label}
        </div>
      )}
      <RadioGroupPrimitive.Root
        ref={combinedRef}
        className={cn(
          "grid gap-2",
          "focus-visible-within",
          "reduced-motion-safe",
          className
        )}
        onValueChange={handleValueChange}
        aria-invalid={!!error}
        aria-describedby={cn(descriptionId, errorId)}
        {...props}
      />
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
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

export interface RadioGroupItemProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> {
    itemDescription?: string;
}

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioGroupItemProps
>(({ className, children, itemDescription, id, ...props }, ref) => {
  const itemRef = useFocusable(1, 'radio-item');
  
  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof RadioGroupPrimitive.Item> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (itemRef) itemRef.current = node;
    },
    [ref, itemRef]
  );

  const descriptionId = itemDescription ? `${id}-description` : undefined;

  return (
    <div className="flex items-center space-x-2">
      <RadioGroupPrimitive.Item
        ref={combinedRef}
        className={cn(
          "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          "focus-visible-ring",
          "high-contrast-text",
          "reduced-motion-safe",
          className
        )}
        aria-describedby={descriptionId}
        {...props}
      >
        <RadioGroupPrimitive.Indicator 
          className={cn(
            "flex items-center justify-center",
            "high-contrast-icon",
            "reduced-motion"
          )}
        >
          <Circle className="h-2.5 w-2.5 fill-current text-current" />
        </RadioGroupPrimitive.Indicator>
      </RadioGroupPrimitive.Item>
      {children && (
        <label
          htmlFor={id}
          className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            "high-contrast-text"
          )}
        >
          {children}
        </label>
      )}
      {itemDescription && (
        <div
          id={descriptionId}
          className={cn(
            "text-sm text-muted-foreground",
            "high-contrast-text"
          )}
        >
          {itemDescription}
        </div>
      )}
    </div>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
