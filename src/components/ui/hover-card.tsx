import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { cn } from "@/lib/utils";
import { useAccessibility } from "@/contexts/accessibility-context";
import { useFocusable } from "@/contexts/keyboard-navigation";

const HoverCard = HoverCardPrimitive.Root;

const HoverCardTrigger = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Trigger>
>(({ className, children, ...props }, ref) => {
  const triggerRef = useFocusable(0, 'hover-card');
  const { announce } = useAccessibility();

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof HoverCardPrimitive.Trigger> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (triggerRef) triggerRef.current = node;
    },
    [ref, triggerRef]
  );

  // Announce state changes
  const handleStateChange = (open: boolean) => {
    if (open) {
      announce(`${props['aria-label'] || props['aria-describedby']} details shown`, 'polite');
    }
  };

  return (
    <HoverCardPrimitive.Trigger
      ref={combinedRef}
      className={cn(
        "inline-flex items-center justify-center",
        "focus-visible-ring",
        "high-contrast-text",
        "reduced-motion-safe",
        className
      )}
      onMouseEnter={() => handleStateChange(true)}
      {...props}
    >
      {children}
    </HoverCardPrimitive.Trigger>
  );
});
HoverCardTrigger.displayName = HoverCardPrimitive.Trigger.displayName;

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => {
  const contentRef = useFocusable(1, 'hover-card');

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof HoverCardPrimitive.Content> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (contentRef) contentRef.current = node;
    },
    [ref, contentRef]
  );

  return (
    <HoverCardPrimitive.Content
      ref={combinedRef}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
        "animate-in zoom-in-90 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
        "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        "focus-visible-within",
        "high-contrast-text",
        "reduced-motion-safe",
        className
      )}
      {...props}
    />
  );
});
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName;

const HoverCardArrow = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Arrow>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Arrow>
>(({ className, ...props }, ref) => (
  <HoverCardPrimitive.Arrow
    ref={ref}
    className={cn(
      "fill-popover",
      "high-contrast-text",
      className
    )}
    {...props}
  />
));
HoverCardArrow.displayName = HoverCardPrimitive.Arrow.displayName;

export { HoverCard, HoverCardTrigger, HoverCardContent, HoverCardArrow };
