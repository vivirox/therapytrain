import type * as React from 'react'
import type { DialogProps } from '@radix-ui/react-dialog'
import type { HTMLAttributes } from 'react'
import type * as LabelPrimitive from '@radix-ui/react-label'
import type * as DialogPrimitive from '@radix-ui/react-dialog'
import type * as AccordionPrimitive from '@radix-ui/react-accordion'
import type * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import type * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import type * as ContextMenuPrimitive from '@radix-ui/react-context-menu'
import type * as HoverCardPrimitive from '@radix-ui/react-hover-card'

// Base Props
export interface BaseProps {
    className?: string;
    children?: React.ReactNode;
}

// Dialog Props
export interface DialogContentProps extends DialogProps {
    className?: string;
    children: React.ReactNode;
}

export interface DialogHeaderProps extends HTMLAttributes<HTMLDivElement> {
    className?: string;
    children: React.ReactNode;
}

export interface DialogFooterProps extends HTMLAttributes<HTMLDivElement> {
    className?: string;
    children: React.ReactNode;
}

export interface DialogTitleProps extends HTMLAttributes<HTMLHeadingElement> {
    className?: string;
    children: React.ReactNode;
}

export interface DialogDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
    className?: string;
    children: React.ReactNode;
}

// Form Props
export interface InputProps extends HTMLAttributes<HTMLInputElement> {
    type?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    className?: string;
    placeholder?: string;
    disabled?: boolean;
}

export interface TextareaProps extends HTMLAttributes<HTMLTextAreaElement> {
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    className?: string;
    placeholder?: string;
    disabled?: boolean;
    rows?: number;
}

export interface SelectProps extends HTMLAttributes<HTMLSelectElement> {
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    className?: string;
    disabled?: boolean;
    options: Array<{
        value: string;
        label: string;
    }>;
}

export interface SwitchProps extends Omit<HTMLAttributes<HTMLInputElement>, keyof BaseProps | 'type'>, BaseProps {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
}

// Export all component props
export type {
    DialogProps,
    DialogContentProps,
    DialogDescriptionProps,
    DialogFooterProps,
    DialogHeaderProps,
    DialogTitleProps,
    InputProps,
    TextareaProps,
    SelectProps,
    SwitchProps,
};

// Button props
export interface ButtonProps extends BaseProps {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'primary';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    loading?: boolean;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    onClick?: () => void;
}

// Form props
export interface FormProps extends BaseProps {
    onSubmit?: (data: any) => void;
    loading?: boolean;
    error?: string;
}

// AlertDialog props
export interface AlertDialogProps extends AlertDialogPrimitive.AlertDialogProps {
    className?: string;
    children?: React.ReactNode;
}

// Accordion props
export interface AccordionProps extends AccordionPrimitive.AccordionSingleProps {
    className?: string;
    children?: React.ReactNode;
}

// DropdownMenu props
export interface DropdownMenuProps extends DropdownMenuPrimitive.DropdownMenuProps {
    className?: string;
    children?: React.ReactNode;
}

// ContextMenu props
export interface ContextMenuProps extends ContextMenuPrimitive.ContextMenuProps {
    className?: string;
    children?: React.ReactNode;
}

// HoverCard props
export interface HoverCardProps extends HoverCardPrimitive.HoverCardProps {
    className?: string;
    children?: React.ReactNode;
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
    action?: React.ReactNode;
    onClose?: () => void;
    children: React.ReactNode;
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
    trigger?: React.ReactNode;
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

export interface TabsProps extends BaseProps {
    defaultValue?: string;
    value?: string;
    onValueChange?: (value: string) => void;
} 