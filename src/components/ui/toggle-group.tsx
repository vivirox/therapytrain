import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { toggleVariants } from "./toggle";
import { useAccessibility } from "@/contexts/accessibility-context";
import { useFocusable } from "@/contexts/keyboard-navigation";

const ToggleGroupContext = React.createContext<{
  size?: VariantProps<typeof toggleVariants>["size"];
  variant?: VariantProps<typeof toggleVariants>["variant"];
}>({});

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
    VariantProps<typeof toggleVariants> & {
      'aria-label': string;
    }
>(({ className, variant, size, children, onValueChange, ...props }, ref) => {
  const groupRef = useFocusable(0, 'toggle-group');
  const { announce } = useAccessibility();

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof ToggleGroupPrimitive.Root> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (groupRef) groupRef.current = node;
    },
    [ref, groupRef]
  );

  // Announce value changes
  const handleValueChange = (value: string) => {
    announce(`${props['aria-label']} value changed to ${value}`, 'polite');
    onValueChange?.(value);
  };

  return (
    <ToggleGroupPrimitive.Root
      ref={combinedRef}
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-md",
        "focus-visible-within",
        "reduced-motion-safe",
        className
      )}
      onValueChange={handleValueChange}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
});
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> &
    VariantProps<typeof toggleVariants>
>(({ className, children, variant, size, ...props }, ref) => {
  const itemRef = useFocusable(1, 'toggle-group');
  const context = React.useContext(ToggleGroupContext);
  const { announce } = useAccessibility();

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof ToggleGroupPrimitive.Item> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (itemRef) itemRef.current = node;
    },
    [ref, itemRef]
  );

  // Announce selection
  const handleSelect = () => {
    announce(`${children} selected`, 'polite');
  };

  return (
    <ToggleGroupPrimitive.Item
      ref={combinedRef}
      className={cn(
        toggleVariants({
          variant: variant ?? context.variant,
          size: size ?? context.size,
        }),
        "focus-visible-ring",
        "high-contrast-text",
        "reduced-motion-safe",
        variant === 'outline' && "high-contrast-button",
        className
      )}
      onClick={handleSelect}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
});
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
