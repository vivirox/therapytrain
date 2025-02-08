import { FormCheckboxProps } from '../../types/form';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from './FormField';
import { Controller } from 'react-hook-form';

export const FormCheckbox = <T extends Record<string, any>>({
  name,
  form,
  label,
  description,
  validation,
  className,
  disabled,
}: FormCheckboxProps<T>) => {
  const {
    control,
    formState: { errors },
  } = form;

  return (
    <FormField
      name={name}
      description={description}
      error={errors[name]?.message as string}
      className={cn('space-x-2', className)}
    >
      <div className="flex items-center space-x-2">
        <Controller
          name={name}
          control={control}
          rules={validation}
          render={({ field }) => (
            <Checkbox
              id={name}
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={disabled}
              className={cn(errors[name] && 'border-destructive')}
            />
          )}
        />
        {label && (
          <label
            htmlFor={name}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </label>
        )}
      </div>
    </FormField>
  );
};

export default FormCheckbox;
