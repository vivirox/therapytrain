import type { HTMLAttributes, ReactNode } from 'react'
import type * as LabelPrimitive from '@radix-ui/react-label'
import type * as DialogPrimitive from '@radix-ui/react-dialog'
import type * as AccordionPrimitive from '@radix-ui/react-accordion'
import type * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import type * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import type * as ContextMenuPrimitive from '@radix-ui/react-context-menu'
import type * as HoverCardPrimitive from '@radix-ui/react-hover-card'

// Base props interface
export interface BaseProps {
    className?: string;
    children?: ReactNode;
}

// Button props
export interface ButtonProps extends BaseProps {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'primary';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    loading?: boolean;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    onClick?: () => void;
}

// Input props
export interface InputProps extends HTMLAttributes<HTMLInputElement> {
    className?: string;
    type?: string;
    error?: string;
    hint?: string;
    disabled?: boolean;
}

// Textarea props
export interface TextareaProps extends HTMLAttributes<HTMLTextAreaElement> {
    className?: string;
    error?: string;
    hint?: string;
    disabled?: boolean;
}

// Select props
export interface SelectProps extends BaseProps {
    options: Array<{ label: string; value: string }>;
    value?: string;
    onChange?: (value: string) => void;
    error?: string;
    hint?: string;
    disabled?: boolean;
}

// Form props
export interface FormProps extends BaseProps {
    onSubmit?: (data: any) => void;
    loading?: boolean;
    error?: string;
}

// Dialog props
export interface DialogProps extends DialogPrimitive.DialogProps {
    className?: string;
    children?: ReactNode;
}

// AlertDialog props
export interface AlertDialogProps extends AlertDialogPrimitive.AlertDialogProps {
    className?: string;
    children?: ReactNode;
}

// Accordion props
export interface AccordionProps extends AccordionPrimitive.AccordionSingleProps {
    className?: string;
    children?: ReactNode;
}

// DropdownMenu props
export interface DropdownMenuProps extends DropdownMenuPrimitive.DropdownMenuProps {
    className?: string;
    children?: ReactNode;
}

// ContextMenu props
export interface ContextMenuProps extends ContextMenuPrimitive.ContextMenuProps {
    className?: string;
    children?: ReactNode;
}

// HoverCard props
export interface HoverCardProps extends HoverCardPrimitive.HoverCardProps {
    className?: string;
    children?: ReactNode;
}

// Avatar props
export interface AvatarProps extends BaseProps {
    src?: string;
    alt?: string;
    fallback?: string;
    size?: 'sm' | 'md' | 'lg';
}

// Badge props
export interface BadgeProps extends BaseProps {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

// Card props
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    className?: string;
}

// Toast props
export interface ToastProps extends BaseProps {
    variant?: 'default' | 'destructive' | 'success';
    title?: string;
    description?: string;
}

// Tooltip props
export interface TooltipProps extends BaseProps {
    content: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
}

// Progress props
export interface ProgressProps extends BaseProps {
    value: number;
    max?: number;
    showValue?: boolean;
}

// Calendar props
export interface CalendarProps extends BaseProps {
    selected?: Date;
    onSelect?: (date: Date) => void;
    disabled?: boolean;
}

// Drawer props
export interface DrawerProps extends DialogProps {
    side?: 'top' | 'right' | 'bottom' | 'left';
}

// Re-export primitive component props
export type {
    AccordionContentProps,
    AccordionItemProps,
    AccordionTriggerProps,
} from '@radix-ui/react-accordion'

export type {
    AlertDialogActionProps,
    AlertDialogCancelProps,
    AlertDialogContentProps,
    AlertDialogDescriptionProps,
    AlertDialogOverlayProps,
    AlertDialogTitleProps,
} from '@radix-ui/react-alert-dialog'

export type {
    DialogContentProps,
    DialogDescriptionProps,
    DialogFooterProps,
    DialogHeaderProps,
    DialogOverlayProps,
    DialogTitleProps,
} from '@radix-ui/react-dialog'

export type {
    DropdownMenuCheckboxItemProps,
    DropdownMenuContentProps,
    DropdownMenuItemProps,
    DropdownMenuLabelProps,
    DropdownMenuRadioItemProps,
    DropdownMenuSeparatorProps,
    DropdownMenuSubContentProps,
    DropdownMenuSubTriggerProps,
} from '@radix-ui/react-dropdown-menu'

export type {
    ContextMenuCheckboxItemProps,
    ContextMenuContentProps,
    ContextMenuItemProps,
    ContextMenuLabelProps,
    ContextMenuRadioItemProps,
    ContextMenuSeparatorProps,
    ContextMenuSubContentProps,
    ContextMenuSubTriggerProps,
} from '@radix-ui/react-context-menu'

export type {
    HoverCardContentProps,
    HoverCardTriggerProps,
} from '@radix-ui/react-hover-card'

export type { LabelProps } from '@radix-ui/react-label'

// Additional props
export interface CardHeaderProps extends BaseProps {}
export interface CardFooterProps extends BaseProps {}
export interface CardTitleProps extends BaseProps {}
export interface CardDescriptionProps extends BaseProps {}

export interface DialogTriggerProps extends BaseProps {
    asChild?: boolean;
}

export interface DialogContentProps extends BaseProps {
    forceMount?: boolean;
}

export interface DialogHeaderProps extends BaseProps {}
export interface DialogFooterProps extends BaseProps {}
export interface DialogTitleProps extends BaseProps {}
export interface DialogDescriptionProps extends BaseProps {}

export interface Toast {
    id: string;
    title?: string;
    description?: string;
    action?: ToastAction;
    type?: 'default' | 'success' | 'error' | 'warning' | 'info';
    duration?: number;
    onDismiss?: () => void;
    variant?: 'default' | 'destructive' | 'success';
}

export interface ToastAction {
    label: string;
    onClick: () => void;
}

export interface ToastViewportProps extends BaseProps {
    hotkey?: string[];
    label?: string;
}

export interface AlertProps extends BaseProps {
    variant?: 'default' | 'destructive';
    title?: string;
    description?: string;
    action?: ReactNode;
    onClose?: () => void;
    children: ReactNode;
}

export interface AlertTitleProps extends BaseProps {}
export interface AlertDescriptionProps extends BaseProps {}

export interface FormFieldProps extends BaseProps {
    name: string;
}

export interface FormItemProps extends BaseProps {}
export interface FormLabelProps extends BaseProps {}
export interface FormControlProps extends BaseProps {}
export interface FormDescriptionProps extends BaseProps {}
export interface FormMessageProps extends BaseProps {}

export interface DrawerTriggerProps extends BaseProps {}
export interface DrawerContentProps extends BaseProps {}
export interface DrawerHeaderProps extends BaseProps {}
export interface DrawerFooterProps extends BaseProps {}
export interface DrawerTitleProps extends BaseProps {}
export interface DrawerDescriptionProps extends BaseProps {}

export interface OTPProps extends Omit<BaseProps, 'onChange'> {
    value: string;
    onChange: (value: string) => void;
    length?: number;
    disabled?: boolean;
    placeholder?: string;
}

export interface MenuProps extends BaseProps {
    trigger?: ReactNode;
    align?: 'start' | 'center' | 'end';
}

export interface SliderProps extends BaseProps {
    min?: number;
    max?: number;
    step?: number;
    value?: number[];
    onValueChange?: (value: number[]) => void;
    disabled?: boolean;
}

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, keyof BaseProps | 'type'>, BaseProps {
    label?: string;
    description?: string;
}

export interface TabsProps extends BaseProps {
    defaultValue?: string;
    value?: string;
    onValueChange?: (value: string) => void;
} 