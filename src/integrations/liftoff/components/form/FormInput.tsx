import { FormInputProps } from '../../types/form';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { FormField } from './FormField';

export const FormInput = <T extends Record<string, any>>({
  name,
  form,
  label,
  description,
  placeholder,
  type = 'text',
  validation,
  className,
  disabled,
}: FormInputProps<T>) => {
  const {
    register,
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
      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        {...register(name, validation)}
        className={cn(errors[name] && 'border-destructive')}
      />
    </FormField>
  );
};

export default FormInput;
