import { FormFieldProps } from '../../types/form';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { FieldValues } from 'react-hook-form';

export const FormField = <T extends FieldValues>({
  name,
  label,
  description,
  error,
  className,
  children,
}: FormFieldProps<T>) => {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label
          htmlFor={name}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </label>
      )}
      {children}
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-medium text-destructive"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};

export default FormField;
