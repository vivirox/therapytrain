import { ReactNode } from 'react';
import { FieldValues, UseFormReturn, Path, RegisterOptions } from 'react-hook-form';

export interface FormFieldProps<T extends FieldValues = FieldValues> {
  name: Path<T>;
  label?: string;
  description?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

export interface FormInputProps<T extends FieldValues = FieldValues> {
  name: Path<T>;
  form: UseFormReturn<T>;
  label?: string;
  description?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  validation?: RegisterOptions;
  className?: string;
  disabled?: boolean;
}

export interface FormTextareaProps<T extends FieldValues = FieldValues> {
  name: Path<T>;
  form: UseFormReturn<T>;
  label?: string;
  description?: string;
  placeholder?: string;
  validation?: RegisterOptions;
  className?: string;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
}

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface FormSelectProps<T extends FieldValues = FieldValues> {
  name: Path<T>;
  form: UseFormReturn<T>;
  options: SelectOption[];
  label?: string;
  description?: string;
  placeholder?: string;
  validation?: RegisterOptions;
  className?: string;
  disabled?: boolean;
}

export interface FormCheckboxProps<T extends FieldValues = FieldValues> {
  name: Path<T>;
  form: UseFormReturn<T>;
  label?: string;
  description?: string;
  validation?: RegisterOptions;
  className?: string;
  disabled?: boolean;
}

export interface RadioOption {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface FormRadioGroupProps<T extends FieldValues = FieldValues> {
  name: Path<T>;
  form: UseFormReturn<T>;
  options: RadioOption[];
  label?: string;
  description?: string;
  validation?: RegisterOptions;
  className?: string;
  disabled?: boolean;
  orientation?: 'horizontal' | 'vertical';
} 