import { ComponentPropsWithoutRef, ReactNode } from 'react';
import { DayPickerProps } from 'react-day-picker';

// Base Props that all components can extend
export interface BaseProps {
  className?: string;
  children?: ReactNode;
}

// Button Props
export interface ButtonProps extends BaseProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}

// Input Props
export interface InputProps extends ComponentPropsWithoutRef<'input'>, BaseProps {
  error?: string;
}

// Textarea Props
export interface TextareaProps extends ComponentPropsWithoutRef<'textarea'>, BaseProps {
  error?: string;
}

// Select Props
export interface SelectProps extends BaseProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

// Calendar Props
export interface CalendarProps extends Omit<DayPickerProps, 'className'>, BaseProps {
  mode?: 'single' | 'multiple' | 'range';
  selected?: Date | Date[] | { from: Date; to: Date };
  onSelect?: (date: Date | Date[] | { from: Date; to: Date }) => void;
}

// Card Props
export interface CardProps extends BaseProps {
  variant?: 'default' | 'destructive' | 'outline';
}

// Dialog Props
export interface DialogProps extends BaseProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Drawer Props
export interface DrawerProps extends BaseProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: 'left' | 'right' | 'top' | 'bottom';
}

// Form Props
export interface FormProps<T extends Record<string, unknown>> extends BaseProps {
  onSubmit: (data: T) => void;
  defaultValues?: Partial<T>;
}

// Input OTP Props
export interface OTPProps extends BaseProps {
  value?: string;
  onChange?: (value: string) => void;
  length?: number;
  disabled?: boolean;
}

// Toast Props
export interface ToastProps extends BaseProps {
  variant?: 'default' | 'destructive' | 'success';
  title?: string;
  description?: string;
  action?: ReactNode;
  duration?: number;
}

// Hover Card Props
export interface HoverCardProps extends BaseProps {
  openDelay?: number;
  closeDelay?: number;
}

// Menu Props
export interface MenuProps extends BaseProps {
  trigger?: ReactNode;
  align?: 'start' | 'center' | 'end';
}

// Progress Props
export interface ProgressProps extends BaseProps {
  value?: number;
  max?: number;
  size?: 'default' | 'sm' | 'lg';
}

// Slider Props
export interface SliderProps extends BaseProps {
  min?: number;
  max?: number;
  step?: number;
  value?: number[];
  onValueChange?: (value: number[]) => void;
  disabled?: boolean;
}

// Switch Props
export interface SwitchProps extends BaseProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}

// Tabs Props
export interface TabsProps extends BaseProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

// Tooltip Props
export interface TooltipProps extends BaseProps {
  content: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}

// Avatar Props
export interface AvatarProps extends BaseProps {
  src?: string;
  alt?: string;
  fallback?: ReactNode;
}

// Badge Props
export interface BadgeProps extends BaseProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
} 