/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { useForm } from 'react-hook-form';
import FormTextarea from '../FormTextarea';

// Test wrapper to provide form context
const FormWrapper = ({ children }: { children: React.ReactNode }) => {
  const form = useForm({
    defaultValues: {
      testTextarea: '',
    },
  });
  return <form>{children}</form>;
};

describe('FormTextarea', () => {
  const defaultProps = {
    name: 'testTextarea',
    label: 'Test Textarea',
    description: 'This is a test textarea',
    placeholder: 'Enter your text here',
    form: useForm({
      defaultValues: {
        testTextarea: '',
      },
    }),
  };

  it('renders with label and description', () => {
    render(
      <FormWrapper>
        <FormTextarea {...defaultProps} />
      </FormWrapper>
    );

    expect(screen.getByLabelText('Test Textarea')).toBeInTheDocument();
    expect(screen.getByText('This is a test textarea')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your text here')).toBeInTheDocument();
  });

  it('handles user input correctly', async () => {
    const user = userEvent.setup();
    render(
      <FormWrapper>
        <FormTextarea {...defaultProps} />
      </FormWrapper>
    );

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'test\nvalue');
    expect(textarea).toHaveValue('test\nvalue');
  });

  it('shows validation errors', async () => {
    const form = useForm({
      defaultValues: {
        testTextarea: '',
      },
    });

    const validation = {
      required: 'This field is required',
      minLength: {
        value: 10,
        message: 'Minimum length is 10 characters',
      },
      maxLength: {
        value: 1000,
        message: 'Maximum length is 1000 characters',
      },
    };

    render(
      <FormWrapper>
        <FormTextarea {...defaultProps} form={form} validation={validation} />
      </FormWrapper>
    );

    await form.trigger('testTextarea');
    expect(screen.getByText('This field is required')).toBeInTheDocument();

    // Test min length validation
    await form.setValue('testTextarea', 'short');
    await form.trigger('testTextarea');
    expect(screen.getByText('Minimum length is 10 characters')).toBeInTheDocument();
  });

  it('handles disabled state', () => {
    render(
      <FormWrapper>
        <FormTextarea {...defaultProps} disabled />
      </FormWrapper>
    );

    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('applies custom className', () => {
    const className = 'custom-textarea';
    render(
      <FormWrapper>
        <FormTextarea {...defaultProps} className={className} />
      </FormWrapper>
    );

    expect(screen.getByRole('textbox').parentElement).toHaveClass(className);
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    render(
      <FormWrapper>
        <FormTextarea {...defaultProps} />
      </FormWrapper>
    );

    const textarea = screen.getByRole('textbox');
    
    // Tab to focus
    await user.tab();
    expect(textarea).toHaveFocus();

    // Type with keyboard
    await user.keyboard('test{enter}next line');
    expect(textarea).toHaveValue('test\nnext line');

    // Tab out
    await user.tab();
    expect(textarea).not.toHaveFocus();
  });

  it('maintains accessibility attributes', () => {
    render(
      <FormWrapper>
        <FormTextarea {...defaultProps} required />
      </FormWrapper>
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('aria-required', 'true');
    expect(textarea).toHaveAttribute('aria-invalid', 'false');
    expect(textarea).toHaveAttribute('aria-describedby');
  });

  it('handles form submission', async () => {
    const onSubmit = vi.fn();
    const form = useForm({
      defaultValues: {
        testTextarea: '',
      },
    });

    render(
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormTextarea {...defaultProps} form={form} />
        <button type="submit">Submit</button>
      </form>
    );

    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox'), 'test\nvalue');
    await user.click(screen.getByRole('button'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        testTextarea: 'test\nvalue',
      }),
      expect.any(Object)
    );
  });

  it('supports character count', async () => {
    const maxLength = 100;
    render(
      <FormWrapper>
        <FormTextarea {...defaultProps} maxLength={maxLength} showCharacterCount />
      </FormWrapper>
    );

    const textarea = screen.getByRole('textbox');
    expect(screen.getByText('0/100')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(textarea, 'Hello, world!');
    expect(screen.getByText('13/100')).toBeInTheDocument();
  });

  it('handles resize behavior', () => {
    render(
      <FormWrapper>
        <FormTextarea {...defaultProps} resize="none" />
      </FormWrapper>
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveStyle({ resize: 'none' });
  });

  it('supports autofocus', () => {
    render(
      <FormWrapper>
        <FormTextarea {...defaultProps} autoFocus />
      </FormWrapper>
    );

    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('handles rows prop', () => {
    render(
      <FormWrapper>
        <FormTextarea {...defaultProps} rows={5} />
      </FormWrapper>
    );

    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '5');
  });
}); 