import * as React from "react";
import * as MenubarPrimitive from "@radix-ui/react-menubar";
import { Check, ChevronRight, Circle } from "lucide-react";
import { cn } from '@/lib/utils';
import { useAccessibility } from "@/contexts/accessibility-context";
import { useKeyboardNavigation, useFocusable } from "@/contexts/keyboard-navigation";

const Menubar = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { shortcuts } = useAccessibility();
  const menubarRef = useFocusable(0, 'menubar');

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof MenubarPrimitive.Root> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (menubarRef) menubarRef.current = node;
    },
    [ref, menubarRef]
  );

  // Register keyboard shortcuts
  React.useEffect(() => {
    shortcuts.register('Alt+M', () => {
      const firstItem = document.querySelector('[data-menubar-item="0"]');
      if (firstItem instanceof HTMLElement) firstItem.focus();
    });

    shortcuts.register('Alt+ArrowLeft', () => {
      const activeItem = document.activeElement;
      const items = document.querySelectorAll('[data-menubar-item]');
      const index = Array.from(items).indexOf(activeItem as Element);
      if (index > 0) {
        (items[index - 1] as HTMLElement).focus();
      } else {
        (items[items.length - 1] as HTMLElement).focus();
      }
    });

    shortcuts.register('Alt+ArrowRight', () => {
      const activeItem = document.activeElement;
      const items = document.querySelectorAll('[data-menubar-item]');
      const index = Array.from(items).indexOf(activeItem as Element);
      if (index < items.length - 1) {
        (items[index + 1] as HTMLElement).focus();
      } else {
        (items[0] as HTMLElement).focus();
      }
    });

    return () => {
      shortcuts.unregister('Alt+M');
      shortcuts.unregister('Alt+ArrowLeft');
      shortcuts.unregister('Alt+ArrowRight');
    };
  }, [shortcuts]);

  return (
    <MenubarPrimitive.Root
      ref={combinedRef}
      className={cn(
        "flex h-10 items-center space-x-1 rounded-md border bg-background p-1",
        "focus-visible-within",
        "high-contrast-border",
        "reduced-motion-safe",
        className
      )}
      {...props}
    />
  );
});
Menubar.displayName = MenubarPrimitive.Root.displayName;

const MenubarMenu = MenubarPrimitive.Menu;

const MenubarGroup = MenubarPrimitive.Group;

const MenubarPortal = MenubarPrimitive.Portal;

const MenubarSub = MenubarPrimitive.Sub;

const MenubarRadioGroup = MenubarPrimitive.RadioGroup;

const MenubarTrigger = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Trigger> & {
    index?: number;
  }
>(({ className, children, index, ...props }, ref) => {
  const triggerRef = useFocusable(index ?? 1, 'menubar');
  const { announce } = useAccessibility();

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof MenubarPrimitive.Trigger> | null) => {
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
    <MenubarPrimitive.Trigger
      ref={combinedRef}
      className={cn(
        "flex cursor-default select-none items-center rounded-sm px-3 py-1.5 text-sm font-medium outline-none",
        "focus-visible-ring",
        "high-contrast-text",
        "reduced-motion-safe",
        "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
        className
      )}
      data-menubar-item={index}
      onSelect={(event) => {
        handleStateChange(event.type === 'select');
        props.onSelect?.(event);
      }}
      {...props}
    >
      {children}
    </MenubarPrimitive.Trigger>
  );
});
MenubarTrigger.displayName = MenubarPrimitive.Trigger.displayName;

const MenubarSubTrigger = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <MenubarPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </MenubarPrimitive.SubTrigger>
));
MenubarSubTrigger.displayName = MenubarPrimitive.SubTrigger.displayName;

const MenubarSubContent = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
));
MenubarSubContent.displayName = MenubarPrimitive.SubContent.displayName;

const MenubarContent = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Content>
>(({ className, align = "start", alignOffset = -4, sideOffset = 8, ...props }, ref) => {
  const contentRef = useFocusable(2, 'menubar');
  const { focusTrap } = useAccessibility();
  const { setFocusGroup } = useKeyboardNavigation();

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof MenubarPrimitive.Content> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (contentRef) contentRef.current = node;
    },
    [ref, contentRef]
  );

  React.useEffect(() => {
    if (props['data-state'] === 'open') {
      focusTrap.activate('menubar');
      setFocusGroup('menubar');
    } else {
      focusTrap.deactivate();
      setFocusGroup('default');
    }
  }, [props['data-state'], focusTrap, setFocusGroup]);

  return (
    <MenubarPrimitive.Portal>
      <MenubarPrimitive.Content
        ref={combinedRef}
        align={align}
        alignOffset={alignOffset}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
          "animate-in fade-in-80 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "focus-visible-within",
          "high-contrast-border",
          "reduced-motion-safe",
          className
        )}
        {...props}
      />
    </MenubarPrimitive.Portal>
  );
});
MenubarContent.displayName = MenubarPrimitive.Content.displayName;

const MenubarItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => {
  const itemRef = useFocusable(3, 'menubar');

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof MenubarPrimitive.Item> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (itemRef) itemRef.current = node;
    },
    [ref, itemRef]
  );

  return (
    <MenubarPrimitive.Item
      ref={combinedRef}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
        "focus-visible-ring",
        "high-contrast-text",
        "reduced-motion-safe",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        inset && "pl-8",
        className
      )}
      {...props}
    />
  );
});
MenubarItem.displayName = MenubarPrimitive.Item.displayName;

const MenubarCheckboxItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => {
  const checkboxRef = useFocusable(4, 'menubar');
  const { announce } = useAccessibility();

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof MenubarPrimitive.CheckboxItem> | null) => {
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
    <MenubarPrimitive.CheckboxItem
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
        <MenubarPrimitive.ItemIndicator>
          <Check className="h-4 w-4 high-contrast-icon" />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.CheckboxItem>
  );
});
MenubarCheckboxItem.displayName = MenubarPrimitive.CheckboxItem.displayName;

const MenubarRadioItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => {
  const radioRef = useFocusable(5, 'menubar');
  const { announce } = useAccessibility();

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof MenubarPrimitive.RadioItem> | null) => {
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
    <MenubarPrimitive.RadioItem
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
        <MenubarPrimitive.ItemIndicator>
          <Circle className="h-2 w-2 fill-current high-contrast-icon" />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.RadioItem>
  );
});
MenubarRadioItem.displayName = MenubarPrimitive.RadioItem.displayName;

const MenubarLabel = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <MenubarPrimitive.Label
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
MenubarLabel.displayName = MenubarPrimitive.Label.displayName;

const MenubarSeparator = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
));
MenubarSeparator.displayName = MenubarPrimitive.Separator.displayName;

const MenubarShortcut = ({
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
MenubarShortcut.displayName = "MenubarShortcut";

export {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarPortal,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarGroup,
  MenubarSub,
  MenubarShortcut,
};
