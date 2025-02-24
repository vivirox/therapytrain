import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";
import { useAccessibility } from "@/contexts/accessibility-context";
import { useFocusable } from "@/contexts/keyboard-navigation";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
    error?: string;
    description?: string;
    'aria-label'?: string;
    'aria-describedby'?: string;
    'aria-errormessage'?: string;
  }
>(({ 
  className, 
  error,
  description,
  id,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
  'aria-errormessage': ariaErrorMessage,
  onValueChange,
  ...props 
}, ref) => {
  const { announce } = useAccessibility();
  const sliderRef = useFocusable(0, 'slider');

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof SliderPrimitive.Root> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (sliderRef) sliderRef.current = node;
    },
    [ref, sliderRef]
  );

  // Announce value changes
  const handleValueChange = (value: number[]) => {
    announce(`Value changed to ${value.join(', ')}`, 'polite');
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
      <SliderPrimitive.Root
        ref={combinedRef}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          "focus-visible-within",
          "reduced-motion-safe",
          className
        )}
        onValueChange={handleValueChange}
        aria-label={ariaLabel}
        aria-invalid={!!error}
        aria-describedby={cn(descriptionId, errorId)}
        {...props}
      >
        <SliderPrimitive.Track
          className={cn(
            "relative h-2 w-full grow overflow-hidden rounded-full bg-secondary",
            error && "bg-destructive/20"
          )}
        >
          <SliderPrimitive.Range 
            className={cn(
              "absolute h-full bg-primary",
              error && "bg-destructive",
              "high-contrast-text"
            )} 
          />
        </SliderPrimitive.Track>
        {props.value?.map((_, index) => (
          <SliderPrimitive.Thumb
            key={index}
            className={cn(
              "block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors",
              "focus-visible-ring",
              "high-contrast-button",
              "reduced-motion-safe",
              error && "border-destructive",
              "disabled:pointer-events-none disabled:opacity-50"
            )}
            ref={useFocusable(index + 1, 'slider')}
          />
        ))}
      </SliderPrimitive.Root>
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
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
