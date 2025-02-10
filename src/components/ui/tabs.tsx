import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"
import { useAccessibility } from "@/contexts/accessibility-context"
import { useKeyboardNavigation, useFocusable } from "@/contexts/keyboard-navigation"

interface TabsProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  children: React.ReactNode
  'aria-label'?: string
}

interface TabsListProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  children: React.ReactNode
}

interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  children: React.ReactNode
  index?: number
}

interface TabsContentProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> {
  children: React.ReactNode
}

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  TabsProps
>(({ className, 'aria-label': ariaLabel = 'Tabs', ...props }, ref) => {
  const { shortcuts } = useAccessibility()
  const tabsRef = useFocusable(0, 'tabs')

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof TabsPrimitive.Root> | null) => {
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
      if (tabsRef) tabsRef.current = node
    },
    [ref, tabsRef]
  )

  // Register keyboard shortcuts
  React.useEffect(() => {
    shortcuts.register('Alt+ArrowLeft', () => {
      const activeTab = document.activeElement
      const tabs = document.querySelectorAll('[data-tab-trigger]')
      const index = Array.from(tabs).indexOf(activeTab as Element)
      if (index > 0) {
        (tabs[index - 1] as HTMLElement).focus()
      } else {
        (tabs[tabs.length - 1] as HTMLElement).focus()
      }
    })

    shortcuts.register('Alt+ArrowRight', () => {
      const activeTab = document.activeElement
      const tabs = document.querySelectorAll('[data-tab-trigger]')
      const index = Array.from(tabs).indexOf(activeTab as Element)
      if (index < tabs.length - 1) {
        (tabs[index + 1] as HTMLElement).focus()
      } else {
        (tabs[0] as HTMLElement).focus()
      }
    })

    return () => {
      shortcuts.unregister('Alt+ArrowLeft')
      shortcuts.unregister('Alt+ArrowRight')
    }
  }, [shortcuts])

  return (
    <TabsPrimitive.Root
      ref={combinedRef}
      className={cn(
        "focus-visible-within",
        "reduced-motion-safe",
        className
      )}
      aria-label={ariaLabel}
      {...props}
    />
  )
})
Tabs.displayName = TabsPrimitive.Root.displayName

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, ...props }, ref) => {
  const listRef = useFocusable(1, 'tabs')

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof TabsPrimitive.List> | null) => {
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
      if (listRef) listRef.current = node
    },
    [ref, listRef]
  )

  return (
    <TabsPrimitive.List
      ref={combinedRef}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
        "focus-visible-within",
        "high-contrast-border",
        "reduced-motion-safe",
        className
      )}
      {...props}
    />
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, children, index, ...props }, ref) => {
  const triggerRef = useFocusable(index ?? 2, 'tabs')
  const { announce } = useAccessibility()

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof TabsPrimitive.Trigger> | null) => {
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
      if (triggerRef) triggerRef.current = node
    },
    [ref, triggerRef]
  )

  // Announce state changes
  const handleStateChange = (selected: boolean) => {
    if (selected) {
      announce(`${children} tab selected`, 'polite')
    }
  }

  return (
    <TabsPrimitive.Trigger
      ref={combinedRef}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all",
        "focus-visible-ring",
        "high-contrast-text",
        "reduced-motion-safe",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        className
      )}
      data-tab-trigger={index}
      onSelect={(event) => {
        handleStateChange(event.type === 'select')
        props.onSelect?.(event)
      }}
      {...props}
    >
      {children}
    </TabsPrimitive.Trigger>
  )
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  TabsContentProps
>(({ className, ...props }, ref) => {
  const contentRef = useFocusable(3, 'tabs')

  // Combine refs
  const combinedRef = React.useCallback(
    (node: React.ElementRef<typeof TabsPrimitive.Content> | null) => {
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
      if (contentRef) contentRef.current = node
    },
    [ref, contentRef]
  )

  return (
    <TabsPrimitive.Content
      ref={combinedRef}
      className={cn(
        "mt-2 ring-offset-background",
        "focus-visible-ring",
        "high-contrast-text",
        "reduced-motion-safe",
        "data-[state=active]:animate-in data-[state=active]:fade-in-0",
        className
      )}
      {...props}
    />
  )
})
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
