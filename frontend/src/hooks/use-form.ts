import { useState, useCallback } from "react";
import { z } from "zod";
interface UseFormProps<T> {
    initialValues: T;
    schema: z.ZodType<T>;
    onSubmit: (values: T) => Promise<void> | void;
}
interface FieldError {
    message: string;
}
type FormErrors<T> = {
    [K in keyof T]?: FieldError;
};
export function useForm<T extends Record<string, any>>({ initialValues, schema, onSubmit, }: UseFormProps<T>) {
    const [values, setValues] = useState<T>(initialValues);
    const [errors, setErrors] = useState<FormErrors<T>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>);
    const validateField = useCallback((name: keyof T, value: any) => {
        try {
            schema.shape[name].parse(value);
            setErrors((prev) => ({ ...prev, [name]: undefined }));
            return true;
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                setErrors((prev) => ({
                    ...prev,
                    [name]: { message: error.errors[0].message },
                }));
            }
            return false;
        }
    }, [schema]);
    const handleChange = useCallback((name: keyof T, value: any) => {
        setValues((prev) => ({ ...prev, [name]: value }));
        if (touched[name]) {
            validateField(name, value);
        }
    }, [touched, validateField]);
    const handleBlur = useCallback((name: keyof T) => {
        setTouched((prev) => ({ ...prev, [name]: true }));
        validateField(name, values[name]);
    }, [validateField, values]);
    const validateForm = useCallback(() => {
        try {
            schema.parse(values);
            setErrors({});
            return true;
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                const formErrors: FormErrors<T> = {};
                error.errors.forEach((err: unknown) => {
                    const path = err.path[0] as keyof T;
                    formErrors[path] = { message: err.message };
                });
                setErrors(formErrors);
            }
            return false;
        }
    }, [schema, values]);
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        if (validateForm()) {
            try {
                await onSubmit(values);
            }
            catch (error) {
                console.error("Form submission error:", error);
            }
        }
        setIsSubmitting(false);
    }, [onSubmit, validateForm, values]);
    const reset = useCallback(() => {
        setValues(initialValues);
        setErrors({});
        setTouched({} as Record<keyof T, boolean>);
    }, [initialValues]);
    return {
        values,
        errors,
        touched,
        isSubmitting,
        handleChange,
        handleBlur,
        handleSubmit,
        reset,
    };
}
