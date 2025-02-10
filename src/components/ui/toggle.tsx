import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useAccessibility } from "@/contexts/accessibility-context";
import { useFocusable } from "@/contexts/keyboard-navigation";

const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-3",
        sm: "h-9 px-2.5",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ToggleProps
  extends React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root>,
    VariantProps<typeof toggleVariants> {
  pressed?: boolean;
}

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  ToggleProps
>(({ className, variant, size, pressed, children, onPressedChange, ...props }, ref) => {
  const toggleRef = useFocusable(0, 'toggle');
  const { announce } = useAccessibility();

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof TogglePrimitive.Root> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (toggleRef) toggleRef.current = node;
    },
    [ref, toggleRef]
  );

  // Announce state changes
  const handlePressedChange = (pressed: boolean) => {
    announce(`${children} ${pressed ? 'pressed' : 'released'}`, 'polite');
    onPressedChange?.(pressed);
  };

  return (
    <TogglePrimitive.Root
      ref={combinedRef}
      pressed={pressed}
      onPressedChange={handlePressedChange}
      className={cn(
        toggleVariants({ variant, size, className }),
        "focus-visible-ring",
        "high-contrast-text",
        "reduced-motion-safe",
        variant === 'outline' && "high-contrast-button"
      )}
      {...props}
    >
      {children}
    </TogglePrimitive.Root>
  );
});
Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
