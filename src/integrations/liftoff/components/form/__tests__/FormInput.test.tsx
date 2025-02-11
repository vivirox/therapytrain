/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { useForm } from 'react-hook-form';
import FormInput from '../FormInput';

// Test wrapper to provide form context
const FormWrapper = ({ children }: { children: React.ReactNode }) => {
  const form = useForm({
    defaultValues: {
      testInput: '',
    },
  });
  return <form>{children}</form>;
};

describe('FormInput', () => {
  const defaultProps = {
    name: 'testInput',
    label: 'Test Input',
    description: 'This is a test input',
    placeholder: 'Enter test value',
    type: 'text',
    form: useForm({
      defaultValues: {
        testInput: '',
      },
    }),
  };

  it('renders with label and description', () => {
    render(
      <FormWrapper>
        <FormInput {...defaultProps} />
      </FormWrapper>
    );

    expect(screen.getByLabelText('Test Input')).toBeInTheDocument();
    expect(screen.getByText('This is a test input')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter test value')).toBeInTheDocument();
  });

  it('handles user input correctly', async () => {
    const user = userEvent.setup();
    render(
      <FormWrapper>
        <FormInput {...defaultProps} />
      </FormWrapper>
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'test value');
    expect(input).toHaveValue('test value');
  });

  it('shows validation errors', async () => {
    const form = useForm({
      defaultValues: {
        testInput: '',
      },
    });

    const validation = {
      required: 'This field is required',
      minLength: {
        value: 3,
        message: 'Minimum length is 3 characters',
      },
    };

    render(
      <FormWrapper>
        <FormInput {...defaultProps} form={form} validation={validation} />
      </FormWrapper>
    );

    await form.trigger('testInput');
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('supports different input types', () => {
    render(
      <FormWrapper>
        <FormInput {...defaultProps} type="password" />
      </FormWrapper>
    );

    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'password');
  });

  it('handles disabled state', () => {
    render(
      <FormWrapper>
        <FormInput {...defaultProps} disabled />
      </FormWrapper>
    );

    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('applies custom className', () => {
    const className = 'custom-input';
    render(
      <FormWrapper>
        <FormInput {...defaultProps} className={className} />
      </FormWrapper>
    );

    expect(screen.getByRole('textbox').parentElement).toHaveClass(className);
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    render(
      <FormWrapper>
        <FormInput {...defaultProps} />
      </FormWrapper>
    );

    const input = screen.getByRole('textbox');
    
    // Tab to focus
    await user.tab();
    expect(input).toHaveFocus();

    // Type with keyboard
    await user.keyboard('test');
    expect(input).toHaveValue('test');

    // Tab out
    await user.tab();
    expect(input).not.toHaveFocus();
  });

  it('maintains accessibility attributes', () => {
    render(
      <FormWrapper>
        <FormInput {...defaultProps} required />
      </FormWrapper>
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(input).toHaveAttribute('aria-describedby');
  });

  it('handles form submission', async () => {
    const onSubmit = vi.fn();
    const form = useForm({
      defaultValues: {
        testInput: '',
      },
    });

    render(
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormInput {...defaultProps} form={form} />
        <button type="submit">Submit</button>
      </form>
    );

    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox'), 'test value');
    await user.click(screen.getByRole('button'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        testInput: 'test value',
      }),
      expect.any(Object)
    );
  });
}); 