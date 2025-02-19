import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test-setup';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormActions
} from '../form';

// Test schema
const schema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
});

// Test component
function TestForm() {
  const form = useForm({
    defaultValues: {
      username: '',
      email: '',
    },
    resolver: async (values) => {
      try {
        schema.parse(values);
        return { values, errors: {} };
      } catch (error) {
        return {
          values: {},
          errors: error.formErrors?.fieldErrors || {},
        };
      }
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => {})}>
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <input {...field} />
              </FormControl>
              <FormDescription>Enter your username</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <input {...field} />
              </FormControl>
              <FormDescription>Enter your email address</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormActions>
          <button type="submit">Submit</button>
          <button type="reset">Reset</button>
        </FormActions>
      </form>
    </Form>
  );
}

describe('Form Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render form fields with labels and descriptions', () => {
    render(<TestForm />);

    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByText('Enter your username')).toBeInTheDocument();
    expect(screen.getByText('Enter your email address')).toBeInTheDocument();
  });

  it('should show validation errors when form is submitted with invalid data', async () => {
    render(<TestForm />);

    // Submit empty form
    fireEvent.click(screen.getByText('Submit'));

    // Wait for validation errors
    const usernameError = await screen.findByText('Username must be at least 3 characters');
    const emailError = await screen.findByText('Invalid email address');

    expect(usernameError).toBeInTheDocument();
    expect(emailError).toBeInTheDocument();
  });

  it('should apply error styles to form fields with errors', async () => {
    render(<TestForm />);

    // Submit empty form
    fireEvent.click(screen.getByText('Submit'));

    // Wait for validation
    await screen.findByText('Username must be at least 3 characters');

    // Check error styles
    const usernameLabel = screen.getByText('Username');
    expect(usernameLabel).toHaveClass('text-destructive');
  });

  it('should handle form field changes', () => {
    render(<TestForm />);

    const usernameInput = screen.getByLabelText('Username');
    const emailInput = screen.getByLabelText('Email');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    expect(usernameInput).toHaveValue('testuser');
    expect(emailInput).toHaveValue('test@example.com');
  });

  it('should clear validation errors when valid data is entered', async () => {
    render(<TestForm />);

    // Submit empty form to trigger errors
    fireEvent.click(screen.getByText('Submit'));
    await screen.findByText('Username must be at least 3 characters');

    // Enter valid data
    const usernameInput = screen.getByLabelText('Username');
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });

    // Error should be removed
    expect(screen.queryByText('Username must be at least 3 characters')).not.toBeInTheDocument();
  });

  it('should render form actions with proper styling', () => {
    render(<TestForm />);

    const formActions = screen.getByRole('group', { name: 'Form actions' });
    expect(formActions).toHaveClass('flex');
    expect(formActions).toHaveClass('sm:justify-end');

    const submitButton = screen.getByText('Submit');
    const resetButton = screen.getByText('Reset');

    expect(submitButton).toHaveAttribute('data-focus-order', '1');
    expect(resetButton).toHaveAttribute('data-focus-order', '2');
  });

  it('should handle form reset', () => {
    render(<TestForm />);

    // Enter some data
    const usernameInput = screen.getByLabelText('Username');
    const emailInput = screen.getByLabelText('Email');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    // Reset form
    fireEvent.click(screen.getByText('Reset'));

    // Inputs should be cleared
    expect(usernameInput).toHaveValue('');
    expect(emailInput).toHaveValue('');
  });

  it('should provide proper ARIA attributes for accessibility', () => {
    render(<TestForm />);

    const usernameInput = screen.getByLabelText('Username');
    const emailInput = screen.getByLabelText('Email');

    // Check form control ARIA attributes
    expect(usernameInput).toHaveAttribute('aria-describedby');
    expect(emailInput).toHaveAttribute('aria-describedby');

    // Submit empty form to trigger errors
    fireEvent.click(screen.getByText('Submit'));

    // Check error state ARIA attributes
    expect(usernameInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
  });

  it('should handle focus management properly', () => {
    render(<TestForm />);

    const usernameInput = screen.getByLabelText('Username');
    const emailInput = screen.getByLabelText('Email');
    const submitButton = screen.getByText('Submit');
    const resetButton = screen.getByText('Reset');

    // Test tab order
    usernameInput.focus();
    expect(document.activeElement).toBe(usernameInput);

    // Tab to next field
    fireEvent.keyDown(usernameInput, { key: 'Tab' });
    expect(document.activeElement).toBe(emailInput);

    // Tab to submit button
    fireEvent.keyDown(emailInput, { key: 'Tab' });
    expect(document.activeElement).toBe(submitButton);

    // Tab to reset button
    fireEvent.keyDown(submitButton, { key: 'Tab' });
    expect(document.activeElement).toBe(resetButton);
  });

  it('should support high contrast mode', () => {
    render(<TestForm />);

    const labels = screen.getAllByRole('label');
    const descriptions = screen.getAllByText(/Enter your/);
    const formActions = screen.getByRole('group', { name: 'Form actions' });

    labels.forEach(label => {
      expect(label).toHaveClass('high-contrast-text');
    });

    descriptions.forEach(description => {
      expect(description).toHaveClass('high-contrast-text');
    });

    expect(formActions.querySelector('button')).toHaveClass('high-contrast-text');
  });

  it('should support reduced motion', () => {
    render(<TestForm />);

    const formActions = screen.getByRole('group', { name: 'Form actions' });
    expect(formActions).toHaveClass('reduced-motion-safe');
    expect(formActions.querySelector('button')).toHaveClass('reduced-motion-safe');
  });
}); 