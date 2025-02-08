import { FormTextareaProps } from '../../types/form';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from './FormField';
import { useState, useEffect } from 'react';

export const FormTextarea = <T extends Record<string, any>>({
  name,
  form,
  label,
  description,
  placeholder,
  validation,
  className,
  disabled,
  rows = 3,
  maxLength,
}: FormTextareaProps<T>) => {
  const {
    register,
    watch,
    formState: { errors },
  } = form;

  const value = watch(name);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    setCharCount(value?.length || 0);
  }, [value]);

  return (
    <FormField
      name={name}
      label={label}
      description={description}
      error={errors[name]?.message as string}
      className={className}
    >
      <div className="relative">
        <Textarea
          id={name}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
          {...register(name, validation)}
          className={cn(
            'resize-none',
            errors[name] && 'border-destructive',
            maxLength && 'pb-8'
          )}
        />
        {maxLength && (
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
            {charCount}/{maxLength}
          </div>
        )}
      </div>
    </FormField>
  );
};

export default FormTextarea;
