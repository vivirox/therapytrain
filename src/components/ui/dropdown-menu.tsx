import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle } from "lucide-react";
import { cn } from '@/lib/utils';
import { useAccessibility } from "@/contexts/accessibility-context";
import { useKeyboardNavigation, useFocusable } from "@/contexts/keyboard-navigation";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>
>(({ className, children, ...props }, ref) => {
  const triggerRef = useFocusable(0, 'dropdown');
  const { announce } = useAccessibility();

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof DropdownMenuPrimitive.Trigger> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (triggerRef) triggerRef.current = node;
    },
    [ref, triggerRef]
  );

  // Announce state changes
  const handleStateChange = (open: boolean) => {
    if (open) {
      announce(`${children} menu expanded`, 'polite');
    } else {
      announce(`${children} menu collapsed`, 'polite');
    }
  };

  return (
    <DropdownMenuPrimitive.Trigger
      ref={combinedRef}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        "focus-visible-ring",
        "high-contrast-text",
        "reduced-motion-safe",
        className
      )}
      onSelect={(event) => {
        handleStateChange(event.type === 'select');
        props.onSelect?.(event);
      }}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.Trigger>
  );
});
DropdownMenuTrigger.displayName = DropdownMenuPrimitive.Trigger.displayName;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;
const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => {
  const subTriggerRef = useFocusable(1, 'dropdown');
  const { announce } = useAccessibility();

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (subTriggerRef) subTriggerRef.current = node;
    },
    [ref, subTriggerRef]
  );

  // Announce state changes
  const handleStateChange = (open: boolean) => {
    if (open) {
      announce(`${children} submenu expanded`, 'polite');
    } else {
      announce(`${children} submenu collapsed`, 'polite');
    }
  };

  return (
    <DropdownMenuPrimitive.SubTrigger
      ref={combinedRef}
      className={cn(
        "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
        "focus-visible-ring",
        "high-contrast-text",
        "reduced-motion-safe",
        inset && "pl-8",
        className
      )}
      onSelect={(event) => {
        handleStateChange(event.type === 'select');
        props.onSelect?.(event);
      }}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto h-4 w-4" />
    </DropdownMenuPrimitive.SubTrigger>
  );
});
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;
const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => {
  const subContentRef = useFocusable(2, 'dropdown');

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof DropdownMenuPrimitive.SubContent> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (subContentRef) subContentRef.current = node;
    },
    [ref, subContentRef]
  );

  return (
    <DropdownMenuPrimitive.SubContent
      ref={combinedRef}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        "focus-visible-within",
        "reduced-motion-safe",
        className
      )}
      {...props}
    />
  );
});
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;
const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => {
  const contentRef = useFocusable(3, 'dropdown');
  const { focusTrap } = useAccessibility();
  const { setFocusGroup } = useKeyboardNavigation();

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof DropdownMenuPrimitive.Content> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (contentRef) contentRef.current = node;
    },
    [ref, contentRef]
  );

  React.useEffect(() => {
    if (props['data-state'] === 'open') {
      focusTrap.activate('dropdown');
      setFocusGroup('dropdown');
    } else {
      focusTrap.deactivate();
      setFocusGroup('default');
    }
  }, [props['data-state'], focusTrap, setFocusGroup]);

  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={combinedRef}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          "focus-visible-within",
          "reduced-motion-safe",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
});
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;
const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => {
  const itemRef = useFocusable(4, 'dropdown');

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof DropdownMenuPrimitive.Item> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (itemRef) itemRef.current = node;
    },
    [ref, itemRef]
  );

  return (
    <DropdownMenuPrimitive.Item
      ref={combinedRef}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "focus-visible-ring",
        "high-contrast-text",
        "reduced-motion-safe",
        inset && "pl-8",
        className
      )}
      {...props}
    />
  );
});
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;
const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => {
  const checkboxRef = useFocusable(5, 'dropdown');
  const { announce } = useAccessibility();

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (checkboxRef) checkboxRef.current = node;
    },
    [ref, checkboxRef]
  );

  // Announce state changes
  const handleCheckedChange = (checked: boolean | 'indeterminate') => {
    const state = checked === 'indeterminate' ? 'indeterminate' : checked ? 'checked' : 'unchecked';
    announce(`${children} ${state}`, 'polite');
  };

  return (
    <DropdownMenuPrimitive.CheckboxItem
      ref={combinedRef}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "focus-visible-ring",
        "high-contrast-text",
        "reduced-motion-safe",
        className
      )}
      checked={checked}
      onCheckedChange={handleCheckedChange}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
});
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;
const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => {
  const radioRef = useFocusable(6, 'dropdown');
  const { announce } = useAccessibility();

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof DropdownMenuPrimitive.RadioItem> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (radioRef) radioRef.current = node;
    },
    [ref, radioRef]
  );

  // Announce selection
  const handleSelect = () => {
    announce(`${children} selected`, 'polite');
  };

  return (
    <DropdownMenuPrimitive.RadioItem
      ref={combinedRef}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "focus-visible-ring",
        "high-contrast-text",
        "reduced-motion-safe",
        className
      )}
      onSelect={handleSelect}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Circle className="h-2 w-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
});
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;
const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-sm font-semibold",
      "high-contrast-text",
      inset && "pl-8",
      className
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;
const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;
const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
      {...props}
    />
  );
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
