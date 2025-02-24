import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";
import { useAccessibility } from "@/contexts/accessibility-context";
import { useKeyboardNavigation, useFocusable } from "@/contexts/keyboard-navigation";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>(({ className, children, ...props }, ref) => {
  const triggerRef = useFocusable(0, 'popover');
  const { announce } = useAccessibility();

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof PopoverPrimitive.Trigger> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (triggerRef) triggerRef.current = node;
    },
    [ref, triggerRef]
  );

  // Announce state changes
  const handleStateChange = (open: boolean) => {
    if (open) {
      announce(`${props['aria-label'] || props['aria-describedby']} popover expanded`, 'polite');
    } else {
      announce(`${props['aria-label'] || props['aria-describedby']} popover collapsed`, 'polite');
    }
  };

  return (
    <PopoverPrimitive.Trigger
      ref={combinedRef}
      className={cn(
        "inline-flex items-center justify-center rounded-md",
        "focus-visible-ring",
        "high-contrast-text",
        "reduced-motion-safe",
        className
      )}
      onMouseDown={(event) => {
        // Prevent focus ring from showing on mouse click
        if (event.button === 0) {
          event.preventDefault();
        }
      }}
      onSelect={(event) => {
        handleStateChange(event.type === 'select');
        props.onSelect?.(event);
      }}
      {...props}
    >
      {children}
    </PopoverPrimitive.Trigger>
  );
});
PopoverTrigger.displayName = PopoverPrimitive.Trigger.displayName;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => {
  const contentRef = useFocusable(1, 'popover');
  const { focusTrap } = useAccessibility();
  const { setFocusGroup } = useKeyboardNavigation();

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof PopoverPrimitive.Content> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (contentRef) contentRef.current = node;
    },
    [ref, contentRef]
  );

  React.useEffect(() => {
    if (props['data-state'] === 'open') {
      focusTrap.activate('popover');
      setFocusGroup('popover');
    } else {
      focusTrap.deactivate();
      setFocusGroup('default');
    }
  }, [props['data-state'], focusTrap, setFocusGroup]);

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={combinedRef}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
          "animate-in data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          "focus-visible-within",
          "high-contrast-border",
          "reduced-motion-safe",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

const PopoverClose = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Close>
>(({ className, children, ...props }, ref) => {
  const closeRef = useFocusable(2, 'popover');
  const { announce } = useAccessibility();

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof PopoverPrimitive.Close> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (closeRef) closeRef.current = node;
    },
    [ref, closeRef]
  );

  // Announce close action
  const handleClose = () => {
    announce('Closing popover', 'polite');
  };

  return (
    <PopoverPrimitive.Close
      ref={combinedRef}
      className={cn(
        "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity",
        "hover:opacity-100",
        "focus-visible-ring",
        "high-contrast-text",
        "reduced-motion-safe",
        "disabled:pointer-events-none",
        className
      )}
      onClick={handleClose}
      {...props}
    >
      {children}
      <span className="sr-only">Close</span>
    </PopoverPrimitive.Close>
  );
});
PopoverClose.displayName = PopoverPrimitive.Close.displayName;

const PopoverArrow = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Arrow>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Arrow>
>(({ className, ...props }, ref) => (
  <PopoverPrimitive.Arrow
    ref={ref}
    className={cn(
      "fill-popover",
      "high-contrast-text",
      className
    )}
    {...props}
  />
));
PopoverArrow.displayName = PopoverPrimitive.Arrow.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverClose, PopoverArrow };
