import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useForm } from '../use-form';
import { z } from 'zod';

const testSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
});

type TestForm = z.infer<typeof testSchema>;

describe('useForm', () => {
  const initialValues: TestForm = {
    name: '',
    email: '',
  };

  it('initializes with default values', () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues,
        schema: testSchema,
        onSubmit: vi.fn(),
      })
    );

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
  });

  it('handles field changes', () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues,
        schema: testSchema,
        onSubmit: vi.fn(),
      })
    );

    act(() => {
      result.current.handleChange('name', 'John');
    });

    expect(result.current.values.name).toBe('John');
  });

  it('validates fields on blur', () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues,
        schema: testSchema,
        onSubmit: vi.fn(),
      })
    );

    act(() => {
      result.current.handleChange('email', 'invalid-email');
      result.current.handleBlur('email');
    });

    expect(result.current.errors.email).toBeDefined();
    expect(result.current.errors.email?.message).toBe('Invalid email address');
  });

  it('handles form submission', async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useForm({
        initialValues,
        schema: testSchema,
        onSubmit,
      })
    );

    const validValues = {
      name: 'John',
      email: 'john@example.com',
    };

    act(() => {
      result.current.handleChange('name', validValues.name);
      result.current.handleChange('email', validValues.email);
    });

    await act(async () => {
      const event = { preventDefault: vi.fn() } as unknown as React.FormEvent;
      await result.current.handleSubmit(event);
    });

    expect(onSubmit).toHaveBeenCalledWith(validValues);
  });

  it('prevents submission with invalid data', async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useForm({
        initialValues,
        schema: testSchema,
        onSubmit,
      })
    );

    await act(async () => {
      const event = { preventDefault: vi.fn() } as unknown as React.FormEvent;
      await result.current.handleSubmit(event);
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.errors.name).toBeDefined();
    expect(result.current.errors.email).toBeDefined();
  });

  it('resets form state', () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues,
        schema: testSchema,
        onSubmit: vi.fn(),
      })
    );

    act(() => {
      result.current.handleChange('name', 'John');
      result.current.handleChange('email', 'invalid');
      result.current.handleBlur('email');
      result.current.reset();
    });

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
  });
});
