import { FormSelectProps } from '../../types/form';
import { cn } from '@/lib/utils';
import { FormField } from './FormField';
import { Controller, RegisterOptions, Path } from 'react-hook-form';

export const FormSelect = <T extends Record<string, any>>({
  name,
  form,
  options,
  label,
  description,
  placeholder,
  validation,
  className,
  disabled,
}: FormSelectProps<T>) => {
  const {
    control,
    formState: { errors },
  } = form;

  return (
    <FormField
      name={name}
      label={label}
      description={description}
      error={errors[name]?.message as string}
      className={className}
    >
      <Controller<T>
        name={name as Path<T>}
        control={control}
        rules={validation as RegisterOptions<T, Path<T>>}
        render={({ field }) => (
          <select
            {...field}
            disabled={disabled}
            className={cn(
              "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              errors[name] && "border-destructive",
              className
            )}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
        )}
      />
    </FormField>
  );
};

export default FormSelect;
