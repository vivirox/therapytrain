import { HTMLAttributes, ReactNode } from 'react'

export interface BaseProps extends HTMLAttributes<HTMLElement> {
  className?: string
  children?: ReactNode
}

export interface PositionProps extends BaseProps {
  position?: 'top' | 'bottom' | 'left' | 'right'
  content?: string | ReactNode
}

export interface CheckedProps extends BaseProps {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export interface ProgressProps extends BaseProps {
  value?: number
  max?: number
  indeterminate?: boolean
}

export interface OTPProps extends BaseProps {
  value?: string
  length?: number
  onChange?: (value: string) => void
}

export interface DialogProps extends BaseProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean
}

export interface DrawerProps extends BaseProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  side?: 'left' | 'right' | 'top' | 'bottom'
}

export interface MenuProps extends BaseProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: ReactNode
}

export interface MenubarProps extends MenuProps {
  orientation?: 'horizontal' | 'vertical'
}

export interface TabsProps extends BaseProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

export interface ToastProps extends BaseProps {
  title?: string
  description?: string
  action?: ReactNode
  duration?: number
  onOpenChange?: (open: boolean) => void
}

export interface BadgeProps extends BaseProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success'
}

export interface ButtonProps extends BaseProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg'
  asChild?: boolean
}

export interface InputProps extends BaseProps {
  type?: string
  value?: string
  defaultValue?: string
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
}

export interface SelectProps extends BaseProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export interface TextareaProps extends BaseProps {
  value?: string
  defaultValue?: string
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  rows?: number
}

export interface AlertProps extends BaseProps {
  variant?: 'default' | 'destructive'
  title?: string
  description?: string
}

export interface CardProps extends BaseProps {
  variant?: 'default' | 'interactive'
}

export interface AvatarProps extends BaseProps {
  src?: string
  alt?: string
  fallback?: ReactNode
}

export interface SkeletonProps extends BaseProps {
  variant?: 'default' | 'circular' | 'rectangular'
}

export interface TooltipProps extends PositionProps {
  content: ReactNode
  delayDuration?: number
  skipDelayDuration?: number
}

export interface PopoverProps extends PositionProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean
}

export interface CommandProps extends BaseProps {
  value?: string
  onValueChange?: (value: string) => void
  filter?: (value: string, search: string) => boolean
}

export interface ScrollAreaProps extends BaseProps {
  orientation?: 'vertical' | 'horizontal' | 'both'
}

export interface AccordionProps extends BaseProps {
  type?: 'single' | 'multiple'
  value?: string | string[]
  defaultValue?: string | string[]
  onValueChange?: (value: string | string[]) => void
  collapsible?: boolean
}
