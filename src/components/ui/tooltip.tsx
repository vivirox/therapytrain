import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
import { useAccessibility } from "@/contexts/accessibility-context";
import { useFocusable } from "@/contexts/keyboard-navigation";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ className, children, ...props }, ref) => {
  const triggerRef = useFocusable(0, 'tooltip');
  const { announce } = useAccessibility();

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof TooltipPrimitive.Trigger> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (triggerRef) triggerRef.current = node;
    },
    [ref, triggerRef]
  );

  // Announce state changes
  const handleStateChange = (open: boolean) => {
    if (open) {
      announce(`Tooltip opened: ${props['aria-label'] || props['aria-describedby']}`, 'polite');
    }
  };

  return (
    <TooltipPrimitive.Trigger
      ref={combinedRef}
      className={cn(
        "inline-flex items-center justify-center rounded-md",
        "focus-visible-ring",
        "high-contrast-text",
        "reduced-motion-safe",
        className
      )}
      onMouseEnter={() => handleStateChange(true)}
      {...props}
    >
      {children}
    </TooltipPrimitive.Trigger>
  );
});
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => {
  const contentRef = useFocusable(1, 'tooltip');

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof TooltipPrimitive.Content> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (contentRef) contentRef.current = node;
    },
    [ref, contentRef]
  );

  return (
    <TooltipPrimitive.Content
      ref={combinedRef}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
        "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
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
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

const TooltipArrow = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Arrow>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Arrow>
>(({ className, ...props }, ref) => (
  <TooltipPrimitive.Arrow
    ref={ref}
    className={cn(
      "fill-popover",
      "high-contrast-text",
      className
    )}
    {...props}
  />
));
TooltipArrow.displayName = TooltipPrimitive.Arrow.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TooltipArrow };
