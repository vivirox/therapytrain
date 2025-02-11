import * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { Check, ChevronRight, Circle } from "lucide-react";
import { cn } from '@/lib/utils';
import { useAccessibility } from "@/contexts/accessibility-context";
import { useKeyboardNavigation, useFocusable } from "@/contexts/keyboard-navigation";
import type {
  ContextMenuProps,
  ContextMenuCheckboxItemProps,
  ContextMenuContentProps,
  ContextMenuItemProps,
  ContextMenuLabelProps,
  ContextMenuRadioItemProps,
  ContextMenuSeparatorProps,
  ContextMenuSubContentProps,
  ContextMenuSubTriggerProps,
} from "@/types/ui";

const ContextMenu = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Root> & {
    'aria-label'?: string;
  }
>(({ className, 'aria-label': ariaLabel = 'Context menu', ...props }, ref) => {
  const { announce } = useAccessibility();

  // Announce when context menu is opened
  const handleOpenChange = (open: boolean) => {
    if (open) {
      announce('Context menu opened', 'polite');
    }
  };

  return (
    <ContextMenuPrimitive.Root
      onOpenChange={handleOpenChange}
      {...props}
    />
  );
});
ContextMenu.displayName = ContextMenuPrimitive.Root.displayName;

const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

const ContextMenuGroup = ContextMenuPrimitive.Group;

const ContextMenuPortal = ContextMenuPrimitive.Portal;

const ContextMenuSub = ContextMenuPrimitive.Sub;

const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

const ContextMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => {
  const triggerRef = useFocusable(0, 'context-menu');
  const { announce } = useAccessibility();

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof ContextMenuPrimitive.SubTrigger> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (triggerRef) triggerRef.current = node;
    },
    [ref, triggerRef]
  );

  // Announce state changes
  const handleSelect = () => {
    announce(`${children} submenu expanded`, 'polite');
  };

  return (
    <ContextMenuPrimitive.SubTrigger
      ref={combinedRef}
      className={cn(
        "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
        "focus-visible-ring",
        "high-contrast-text",
        "reduced-motion-safe",
        inset && "pl-8",
        "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
        className
      )}
      onSelect={handleSelect}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto h-4 w-4" />
    </ContextMenuPrimitive.SubTrigger>
  );
});
ContextMenuSubTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName;

const ContextMenuSubContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => {
  const contentRef = useFocusable(1, 'context-menu');

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof ContextMenuPrimitive.SubContent> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (contentRef) contentRef.current = node;
    },
    [ref, contentRef]
  );

  return (
    <ContextMenuPrimitive.SubContent
      ref={combinedRef}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        "animate-in slide-in-from-left-1 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        "focus-visible-within",
        "high-contrast-border",
        "reduced-motion-safe",
        className
      )}
      {...props}
    />
  );
});
ContextMenuSubContent.displayName = ContextMenuPrimitive.SubContent.displayName;

const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(({ className, ...props }, ref) => {
  const contentRef = useFocusable(2, 'context-menu');
  const { focusTrap } = useAccessibility();
  const { setFocusGroup } = useKeyboardNavigation();

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof ContextMenuPrimitive.Content> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (contentRef) contentRef.current = node;
    },
    [ref, contentRef]
  );

  React.useEffect(() => {
    if (props['data-state'] === 'open') {
      focusTrap.activate('context-menu');
      setFocusGroup('context-menu');
    } else {
      focusTrap.deactivate();
      setFocusGroup('default');
    }
  }, [props['data-state'], focusTrap, setFocusGroup]);

  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        ref={combinedRef}
        className={cn(
          "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
          "animate-in fade-in-80 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          "focus-visible-within",
          "high-contrast-border",
          "reduced-motion-safe",
          className
        )}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
});
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName;

const ContextMenuItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => {
  const itemRef = useFocusable(3, 'context-menu');
  const { announce } = useAccessibility();

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof ContextMenuPrimitive.Item> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (itemRef) itemRef.current = node;
    },
    [ref, itemRef]
  );

  // Announce when item is selected
  const handleSelect = () => {
    announce(`${props['aria-label'] || children} selected`, 'polite');
  };

  return (
    <ContextMenuPrimitive.Item
      ref={combinedRef}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
        "focus-visible-ring",
        "high-contrast-text",
        "reduced-motion-safe",
        inset && "pl-8",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      onSelect={handleSelect}
      {...props}
    >
      {children}
    </ContextMenuPrimitive.Item>
  );
});
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName;

const ContextMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => {
  const checkboxRef = useFocusable(4, 'context-menu');
  const { announce } = useAccessibility();

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof ContextMenuPrimitive.CheckboxItem> | null) => {
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
    <ContextMenuPrimitive.CheckboxItem
      ref={combinedRef}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
        "focus-visible-ring",
        "high-contrast-text",
        "reduced-motion-safe",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      checked={checked}
      onCheckedChange={handleCheckedChange}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <Check className="h-4 w-4 high-contrast-icon" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
});
ContextMenuCheckboxItem.displayName = ContextMenuPrimitive.CheckboxItem.displayName;

const ContextMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => {
  const radioRef = useFocusable(5, 'context-menu');
  const { announce } = useAccessibility();

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof ContextMenuPrimitive.RadioItem> | null) => {
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
    <ContextMenuPrimitive.RadioItem
      ref={combinedRef}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
        "focus-visible-ring",
        "high-contrast-text",
        "reduced-motion-safe",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      onSelect={handleSelect}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <Circle className="h-2 w-2 fill-current high-contrast-icon" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
});
ContextMenuRadioItem.displayName = ContextMenuPrimitive.RadioItem.displayName;

const ContextMenuLabel = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Label
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
ContextMenuLabel.displayName = ContextMenuPrimitive.Label.displayName;

const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    {...props}
  />
));
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName;

const ContextMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        "high-contrast-text",
        className
      )}
      {...props}
    />
  );
};
ContextMenuShortcut.displayName = "ContextMenuShortcut";

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
};
