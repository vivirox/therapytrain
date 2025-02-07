import { HTMLAttributes, ReactNode } from "react";
import { VariantProps as RadixVariantProps } from "class-variance-authority";
// Base component props
export interface BaseProps extends HTMLAttributes<HTMLElement> {
    className?: string;
    children?: ReactNode;
}
// Variant props helper type
export type VariantProps<T> = RadixVariantProps<T>;
// Position props
export interface PositionProps extends BaseProps {
    position?: "top" | "bottom" | "left" | "right";
    align?: "start" | "center" | "end";
    sideOffset?: number;
    alignOffset?: number;
}
// Checked props
export interface CheckedProps extends BaseProps {
    checked?: boolean;
    defaultChecked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
}
// Progress props
export interface ProgressProps extends BaseProps {
    value?: number;
    max?: number;
    indicatorClassName?: string;
}
// OTP props
export interface OTPProps extends BaseProps {
    value?: string;
    onChange?: (value: string) => void;
    maxLength?: number;
    containerClassName?: string;
}
// Button props
export interface ButtonProps extends BaseProps {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
    asChild?: boolean;
}
// Badge props
export interface BadgeProps extends BaseProps {
    variant?: "default" | "secondary" | "destructive" | "outline";
}
// Dialog props
export interface DialogProps extends BaseProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    modal?: boolean;
}
// Form props
export interface FormProps extends BaseProps {
    onSubmit?: (event: React.FormEvent) => void;
}
// Input props
export interface InputProps extends BaseProps {
    type?: string;
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    disabled?: boolean;
}
// Select props
export interface SelectProps extends BaseProps {
    value?: string;
    onValueChange?: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}
// Tooltip props
export interface TooltipProps extends PositionProps {
    content: ReactNode;
    delayDuration?: number;
    skipDelayDuration?: number;
}
// Menu props
export interface MenuProps extends BaseProps {
    trigger?: ReactNode;
    align?: "start" | "center" | "end";
    side?: "top" | "right" | "bottom" | "left";
}
// Tabs props
export interface TabsProps extends BaseProps {
    defaultValue?: string;
    value?: string;
    onValueChange?: (value: string) => void;
    orientation?: "horizontal" | "vertical";
}
// Accordion props
export interface AccordionProps extends BaseProps {
    type?: "single" | "multiple";
    defaultValue?: string | string[];
    value?: string | string[];
    onValueChange?: (value: string | string[]) => void;
    collapsible?: boolean;
}
// Drawer props
export interface DrawerProps extends BaseProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    side?: "top" | "right" | "bottom" | "left";
}
// HoverCard props
export interface HoverCardProps extends BaseProps {
    openDelay?: number;
    closeDelay?: number;
}
// Command props
export interface CommandProps extends BaseProps {
    value?: string;
    onValueChange?: (value: string) => void;
    filter?: (value: string, search: string) => number;
    loop?: boolean;
}
export interface InsetProps extends BaseProps {
    inset?: boolean;
}
