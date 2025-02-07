declare module '@vaul/react' {
  import * as React from 'react'

  export interface DrawerProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    modal?: boolean
    nested?: boolean
    children?: React.ReactNode
    shouldScaleBackground?: boolean
    onDrag?: (event: { y: number }) => void
    onDragStart?: (event: { y: number }) => void
    onDragEnd?: (event: { y: number }) => void
    snapPoints?: number[]
    activeSnapPoint?: number | null
    setActiveSnapPoint?: (snapPoint: number | null) => void
    drawerRef?: React.RefObject<HTMLDivElement>
    fadeFromIndex?: number
    overlayClassName?: string
    drawerClassName?: string
    contentClassName?: string
    dismissible?: boolean
  }

  export interface DrawerContentProps {
    children?: React.ReactNode
    className?: string
  }

  export interface DrawerOverlayProps {
    children?: React.ReactNode
    className?: string
  }

  export interface DrawerTriggerProps {
    children?: React.ReactNode
    asChild?: boolean
  }

  export interface DrawerPortalProps {
    children?: React.ReactNode
  }

  export interface DrawerCloseProps {
    children?: React.ReactNode
    asChild?: boolean
  }

  export interface DrawerNestedProps {
    children?: React.ReactNode
  }

  export const Drawer: React.FC<DrawerProps> & {
    Content: React.FC<DrawerContentProps>
    Overlay: React.FC<DrawerOverlayProps>
    Trigger: React.FC<DrawerTriggerProps>
    Portal: React.FC<DrawerPortalProps>
    Close: React.FC<DrawerCloseProps>
    Nested: React.FC<DrawerNestedProps>
  }

  export const DrawerContent: React.FC<DrawerContentProps>
  export const DrawerOverlay: React.FC<DrawerOverlayProps>
  export const DrawerTrigger: React.FC<DrawerTriggerProps>
  export const DrawerPortal: React.FC<DrawerPortalProps>
  export const DrawerClose: React.FC<DrawerCloseProps>
  export const DrawerNested: React.FC<DrawerNestedProps>
} 