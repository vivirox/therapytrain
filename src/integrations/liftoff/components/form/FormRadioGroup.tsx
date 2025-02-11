import { FormRadioGroupProps } from '../../types/form';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FormField } from './FormField';
import { Controller } from 'react-hook-form';

export const FormRadioGroup = <T extends Record<string, any>>({
  name,
  form,
  options,
  label,
  description,
  validation,
  className,
  disabled,
  orientation = 'vertical',
}: FormRadioGroupProps<T>) => {
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
      <Controller
        name={name}
        control={control}
        rules={validation}
        render={({ field }) => (
          <RadioGroup
            disabled={disabled}
            onValueChange={field.onChange}
            value={field.value}
            className={cn(
              'gap-3',
              orientation === 'horizontal' ? 'flex' : 'flex flex-col'
            )}
          >
            {options.map((option) => (
              <div
                key={option.value}
                className={cn(
                  'flex items-start',
                  orientation === 'horizontal' ? 'mr-4' : 'mb-2'
                )}
              >
                <RadioGroupItem
                  value={option.value}
                  id={`${name}-${option.value}`}
                  disabled={option.disabled}
                  className={cn(errors[name] && 'border-destructive')}
                />
                <div className="ml-2 space-y-1">
                  <label
                    htmlFor={`${name}-${option.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {option.label}
                  </label>
                  {option.description && (
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </RadioGroup>
        )}
      />
    </FormField>
  );
};

export default FormRadioGroup;
