import * as React from "react";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { cva } from "class-variance-authority";
import { ChevronDown } from "lucide-react";
import { cn } from '@/lib/utils';
import { useAccessibility } from '@/contexts/accessibility-context';
import { useKeyboardNavigation, useFocusable } from '@/contexts/keyboard-navigation';

const navigationMenuTriggerStyle = cva(
  "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50 focus-visible-ring"
);

const NavigationMenu = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>
>(({ className, children, ...props }, ref) => {
  const { shortcuts } = useAccessibility();
  const menuRef = useFocusable(0, 'navigation');

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof NavigationMenuPrimitive.Root> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (menuRef) menuRef.current = node;
    },
    [ref, menuRef]
  );

  // Register keyboard shortcuts
  React.useEffect(() => {
    shortcuts.register('Alt+1', () => {
      const firstItem = document.querySelector('[data-nav-item="0"]');
      if (firstItem instanceof HTMLElement) firstItem.focus();
    });

    shortcuts.register('Alt+ArrowLeft', () => {
      const activeItem = document.activeElement;
      const items = document.querySelectorAll('[data-nav-item]');
      const index = Array.from(items).indexOf(activeItem as Element);
      if (index > 0) {
        (items[index - 1] as HTMLElement).focus();
      } else {
        (items[items.length - 1] as HTMLElement).focus();
      }
    });

    shortcuts.register('Alt+ArrowRight', () => {
      const activeItem = document.activeElement;
      const items = document.querySelectorAll('[data-nav-item]');
      const index = Array.from(items).indexOf(activeItem as Element);
      if (index < items.length - 1) {
        (items[index + 1] as HTMLElement).focus();
      } else {
        (items[0] as HTMLElement).focus();
      }
    });

    return () => {
      shortcuts.unregister('Alt+1');
      shortcuts.unregister('Alt+ArrowLeft');
      shortcuts.unregister('Alt+ArrowRight');
    };
  }, [shortcuts]);

  return (
    <NavigationMenuPrimitive.Root
      ref={combinedRef}
      className={cn(
        "relative z-10 flex max-w-max flex-1 items-center justify-center focus-visible-within",
        className
      )}
      {...props}
    >
      {children}
      <NavigationMenuViewport />
    </NavigationMenuPrimitive.Root>
  );
});
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName;

const NavigationMenuList = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>
>(({ className, ...props }, ref) => {
  const listRef = useFocusable(1, 'navigation');

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof NavigationMenuPrimitive.List> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (listRef) listRef.current = node;
    },
    [ref, listRef]
  );

  return (
    <NavigationMenuPrimitive.List
      ref={combinedRef}
      className={cn(
        "group flex flex-1 list-none items-center justify-center space-x-1 focus-visible-within",
        className
      )}
      {...props}
    />
  );
});
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName;

const NavigationMenuItem = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Item> & {
    index?: number;
  }
>(({ className, children, index, ...props }, ref) => {
  const itemRef = useFocusable(index ?? 2, 'navigation');

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof NavigationMenuPrimitive.Item> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (itemRef) itemRef.current = node;
    },
    [ref, itemRef]
  );

  return (
    <NavigationMenuPrimitive.Item
      ref={combinedRef}
      className={cn("focus-visible-ring", className)}
      data-nav-item={index}
      {...props}
    >
      {children}
    </NavigationMenuPrimitive.Item>
  );
});
NavigationMenuItem.displayName = NavigationMenuPrimitive.Item.displayName;

const NavigationMenuTrigger = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>
>(({ className, children, ...props }, ref) => {
  const triggerRef = useFocusable(3, 'navigation');
  const { announce } = useAccessibility();

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof NavigationMenuPrimitive.Trigger> | null) => {
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
    <NavigationMenuPrimitive.Trigger
      ref={combinedRef}
      className={cn(navigationMenuTriggerStyle(), "group focus-visible-ring", className)}
      onSelect={(event) => {
        handleStateChange(event.type === 'select');
        props.onSelect?.(event);
      }}
      {...props}
    >
      {children}{" "}
      <ChevronDown
        className="relative top-[1px] ml-1 h-3 w-3 transition duration-200 group-data-[state=open]:rotate-180"
        aria-hidden="true"
      />
    </NavigationMenuPrimitive.Trigger>
  );
});
NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName;

const NavigationMenuContent = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
>(({ className, ...props }, ref) => {
  const contentRef = useFocusable(4, 'navigation');

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof NavigationMenuPrimitive.Content> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (contentRef) contentRef.current = node;
    },
    [ref, contentRef]
  );

  return (
    <NavigationMenuPrimitive.Content
      ref={combinedRef}
      className={cn(
        "left-0 top-0 w-full data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 md:absolute md:w-auto focus-visible-ring",
        className
      )}
      {...props}
    />
  );
});
NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName;

const NavigationMenuLink = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Link>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Link>
>(({ className, ...props }, ref) => {
  const linkRef = useFocusable(5, 'navigation');

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof NavigationMenuPrimitive.Link> | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (linkRef) linkRef.current = node;
    },
    [ref, linkRef]
  );

  return (
    <NavigationMenuPrimitive.Link
      ref={combinedRef}
      className={cn("focus-visible-ring", className)}
      {...props}
    />
  );
});
NavigationMenuLink.displayName = NavigationMenuPrimitive.Link.displayName;

const NavigationMenuViewport = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <div className={cn("absolute left-0 top-full flex justify-center")}>
    <NavigationMenuPrimitive.Viewport
      className={cn(
        "origin-top-center relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 md:w-[var(--radix-navigation-menu-viewport-width)]",
        className
      )}
      ref={ref}
      {...props}
    />
  </div>
));
NavigationMenuViewport.displayName =
  NavigationMenuPrimitive.Viewport.displayName;

const NavigationMenuIndicator = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Indicator>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Indicator>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Indicator
    ref={ref}
    className={cn(
      "top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in",
      className
    )}
    {...props}
  >
    <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md" />
  </NavigationMenuPrimitive.Indicator>
));
NavigationMenuIndicator.displayName =
  NavigationMenuPrimitive.Indicator.displayName;

export {
  navigationMenuTriggerStyle,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
};
