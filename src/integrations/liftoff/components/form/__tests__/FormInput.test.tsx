/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormInput } from '../FormInput';
import { useForm } from 'react-hook-form';

// Mock component wrapper to provide form context
const FormInputWrapper = ({
  defaultValues = {},
  ...props
}: any) => {
  const form = useForm({ defaultValues });
  return <FormInput form={form} {...props} />;
};

describe('FormInput', () => {
  it('renders correctly with all props', () => {
    render(
      <FormInputWrapper
        name="test-input"
        label="Test Label"
        description="Test Description"
        placeholder="Test Placeholder"
        type="text"
      />
    );
    
    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Test Placeholder')).toBeInTheDocument();
  });

  it('handles different input types', () => {
    render(
      <FormInputWrapper
        name="test-input"
        type="password"
        placeholder="Enter password"
      />
    );
    
    const input = screen.getByPlaceholderText('Enter password');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('handles disabled state', () => {
    render(
      <FormInputWrapper
        name="test-input"
        disabled={true}
        placeholder="Disabled input"
      />
    );
    
    const input = screen.getByPlaceholderText('Disabled input');
    expect(input).toBeDisabled();
  });

  it('applies validation and shows error message', async () => {
    const validation = {
      required: 'This field is required',
    };

    render(
      <FormInputWrapper
        name="test-input"
        validation={validation}
        placeholder="Required input"
      />
    );
    
    const input = screen.getByPlaceholderText('Required input');
    await userEvent.click(input);
    await userEvent.tab(); // Trigger blur event
    
    // Wait for error message to appear
    const errorMessage = await screen.findByText('This field is required');
    expect(errorMessage).toBeInTheDocument();
    expect(input).toHaveClass('border-destructive');
  });

  it('handles form value changes', async () => {
    const defaultValues = {
      'test-input': 'Initial value',
    };

    render(
      <FormInputWrapper
        name="test-input"
        defaultValues={defaultValues}
        placeholder="Test input"
      />
    );
    
    const input = screen.getByPlaceholderText('Test input');
    expect(input).toHaveValue('Initial value');
    
    await userEvent.clear(input);
    await userEvent.type(input, 'New value');
    expect(input).toHaveValue('New value');
  });

  it('applies custom className correctly', () => {
    render(
      <FormInputWrapper
        name="test-input"
        className="custom-class"
        placeholder="Test input"
      />
    );
    
    const formField = screen.getByPlaceholderText('Test input').closest('div');
    expect(formField).toHaveClass('custom-class');
  });

  it('integrates with react-hook-form validation', async () => {
    const onSubmit =jest.fn();
    const validation = {
      minLength: {
        value: 3,
        message: 'Minimum length is 3 characters',
      },
    };

    render(
      <form onSubmit={onSubmit}>
        <FormInputWrapper
          name="test-input"
          validation={validation}
          placeholder="Test input"
        />
      </form>
    );
    
    const input = screen.getByPlaceholderText('Test input');
    await userEvent.type(input, 'ab');
    await userEvent.tab(); // Trigger validation
    
    const errorMessage = await screen.findByText('Minimum length is 3 characters');
    expect(errorMessage).toBeInTheDocument();
    
    await userEvent.type(input, 'c');
    expect(screen.queryByText('Minimum length is 3 characters')).not.toBeInTheDocument();
  });
}); 