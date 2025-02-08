import { FormSelectProps } from '../../types/form';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormField } from './FormField';
import { Controller } from 'react-hook-form';

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
      <Controller
        name={name}
        control={control}
        rules={validation}
        render={({ field }) => (
          <Select
            disabled={disabled}
            onValueChange={field.onChange}
            value={field.value}
          >
            <SelectTrigger
              className={cn(errors[name] && 'border-destructive')}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </FormField>
  );
};

export default FormSelect;
