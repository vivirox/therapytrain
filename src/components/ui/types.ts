import * as React from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import * as LabelPrimitive from '@radix-ui/react-label'
import * as MenubarPrimitive from '@radix-ui/react-menubar'
import * as NavigationMenuPrimitive from '@radix-ui/react-navigation-menu'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import * as SelectPrimitive from '@radix-ui/react-select'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

// Common props
export interface BaseProps {
  className?: string
  children?: React.ReactNode
}

// Accordion
export interface AccordionProps extends AccordionPrimitive.AccordionSingleProps, BaseProps {}

// Alert
export interface AlertProps extends BaseProps {
  variant?: 'default' | 'destructive'
}

// Alert Dialog
export interface AlertDialogProps extends AlertDialogPrimitive.AlertDialogProps {}
export interface AlertDialogContentProps extends AlertDialogPrimitive.AlertDialogContentProps, BaseProps {}
export interface AlertDialogTitleProps extends AlertDialogPrimitive.AlertDialogTitleProps, BaseProps {}
export interface AlertDialogDescriptionProps extends AlertDialogPrimitive.AlertDialogDescriptionProps, BaseProps {}

// Aspect Ratio
export interface AspectRatioProps extends BaseProps {
  ratio?: number
}

// Avatar
export interface AvatarProps extends AvatarPrimitive.AvatarProps, BaseProps {}
export interface AvatarImageProps extends AvatarPrimitive.AvatarImageProps, BaseProps {}
export interface AvatarFallbackProps extends AvatarPrimitive.AvatarFallbackProps, BaseProps {}

// Badge
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, BaseProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

// Button
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, BaseProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg'
  asChild?: boolean
}

// Calendar
export interface CalendarProps extends BaseProps {
  mode?: 'single' | 'multiple' | 'range'
  selected?: Date | Date[] | { from: Date; to: Date }
  onSelect?: (date: Date | undefined) => void
  disabled?: boolean
  initialFocus?: boolean
}

// Card
export interface CardProps extends React.HTMLAttributes<HTMLDivElement>, BaseProps {}

// Carousel
export interface CarouselProps extends BaseProps {
  orientation?: 'horizontal' | 'vertical'
  opts?: any
}

// Checkbox
export interface CheckboxProps extends CheckboxPrimitive.CheckboxProps, BaseProps {}

// Collapsible
export interface CollapsibleProps extends BaseProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// Command
export interface CommandProps extends BaseProps {
  shouldFilter?: boolean
  filter?: (value: string, search: string) => number
  value?: string
  onValueChange?: (value: string) => void
}

// Dialog
export interface DialogProps extends DialogPrimitive.DialogProps {}
export interface DialogContentProps extends DialogPrimitive.DialogContentProps, BaseProps {}
export interface DialogHeaderProps extends BaseProps {}
export interface DialogFooterProps extends BaseProps {}
export interface DialogTitleProps extends DialogPrimitive.DialogTitleProps, BaseProps {}
export interface DialogDescriptionProps extends DialogPrimitive.DialogDescriptionProps, BaseProps {}

// Drawer
export interface DrawerProps extends BaseProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// Dropdown Menu
export interface DropdownMenuProps extends DropdownMenuPrimitive.DropdownMenuProps {}

// Form
export interface FormProps<T> extends BaseProps {
  onSubmit?: (data: T) => void
}

// Hover Card
export interface HoverCardProps extends BaseProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// Input
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement>, BaseProps {}

// Label
export interface LabelProps extends LabelPrimitive.LabelProps, BaseProps {}

// Menubar
export interface MenubarProps extends MenubarPrimitive.MenubarProps, BaseProps {}

// Navigation Menu
export interface NavigationMenuProps extends NavigationMenuPrimitive.NavigationMenuProps, BaseProps {}

// Popover
export interface PopoverProps extends PopoverPrimitive.PopoverProps {}

// Progress
export interface ProgressProps extends React.ProgressHTMLAttributes<HTMLProgressElement>, BaseProps {
  value?: number
}

// Radio Group
export interface RadioGroupProps extends RadioGroupPrimitive.RadioGroupProps, BaseProps {}

// Scroll Area
export interface ScrollAreaProps extends BaseProps {
  orientation?: 'horizontal' | 'vertical' | 'both'
}

// Select
export interface SelectProps extends SelectPrimitive.SelectProps {}

// Separator
export interface SeparatorProps extends React.HTMLAttributes<HTMLHRElement>, BaseProps {
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
}

// Sheet
export interface SheetProps extends BaseProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// Slider
export interface SliderProps extends React.HTMLAttributes<HTMLDivElement>, BaseProps {
  defaultValue?: number[]
  value?: number[]
  onValueChange?: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  orientation?: 'horizontal' | 'vertical'
}

// Switch
export interface SwitchProps extends SwitchPrimitive.SwitchProps, BaseProps {}

// Table
export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement>, BaseProps {}

// Tabs
export interface TabsProps extends TabsPrimitive.TabsProps, BaseProps {}

// Textarea
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement>, BaseProps {}

// Toast
export interface ToastProps extends BaseProps {
  variant?: 'default' | 'destructive'
  title?: string
  description?: string
  action?: React.ReactNode
  duration?: number
}

// Toggle
export interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, BaseProps {
  pressed?: boolean
  onPressedChange?: (pressed: boolean) => void
}

// Tooltip
export interface TooltipProps extends TooltipPrimitive.TooltipProps {}
