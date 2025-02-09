/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormTextarea } from '../FormTextarea';
import { useForm } from 'react-hook-form';

// Mock component wrapper to provide form context
const FormTextareaWrapper = ({
  defaultValues = {},
  ...props
}: any) => {
  const form = useForm({ defaultValues });
  return <FormTextarea form={form} {...props} />;
};

describe('FormTextarea', () => {
  it('renders correctly with all props', () => {
    render(
      <FormTextareaWrapper
        name="test-textarea"
        label="Test Label"
        description="Test Description"
        placeholder="Test Placeholder"
        rows={4}
      />
    );
    
    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Test Placeholder')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Test Placeholder')).toHaveAttribute('rows', '4');
  });

  it('handles disabled state', () => {
    render(
      <FormTextareaWrapper
        name="test-textarea"
        disabled={true}
        placeholder="Disabled textarea"
      />
    );
    
    const textarea = screen.getByPlaceholderText('Disabled textarea');
    expect(textarea).toBeDisabled();
  });

  it('shows character count when maxLength is provided', async () => {
    const user = userEvent.setup();
    render(
      <FormTextareaWrapper
        name="test-textarea"
        maxLength={100}
        placeholder="Limited textarea"
      />
    );
    
    const textarea = screen.getByPlaceholderText('Limited textarea');
    expect(screen.getByText('0/100')).toBeInTheDocument();
    
    await user.type(textarea, 'Hello, world!');
    expect(screen.getByText('13/100')).toBeInTheDocument();
  });

  it('applies validation and shows error message', async () => {
    const validation = {
      required: 'This field is required',
    };

    render(
      <FormTextareaWrapper
        name="test-textarea"
        validation={validation}
        placeholder="Required textarea"
      />
    );
    
    const textarea = screen.getByPlaceholderText('Required textarea');
    await userEvent.click(textarea);
    await userEvent.tab(); // Trigger blur event
    
    const errorMessage = await screen.findByText('This field is required');
    expect(errorMessage).toBeInTheDocument();
    expect(textarea).toHaveClass('border-destructive');
  });

  it('handles form value changes', async () => {
    const user = userEvent.setup();
    const defaultValues = {
      'test-textarea': 'Initial value',
    };

    render(
      <FormTextareaWrapper
        name="test-textarea"
        defaultValues={defaultValues}
        placeholder="Test textarea"
      />
    );
    
    const textarea = screen.getByPlaceholderText('Test textarea');
    expect(textarea).toHaveValue('Initial value');
    
    await user.clear(textarea);
    await user.type(textarea, 'New value');
    expect(textarea).toHaveValue('New value');
  });

  it('applies custom className correctly', () => {
    render(
      <FormTextareaWrapper
        name="test-textarea"
        className="custom-class"
        placeholder="Test textarea"
      />
    );
    
    const formField = screen.getByPlaceholderText('Test textarea').closest('div');
    expect(formField).toHaveClass('custom-class');
  });

  it('enforces maxLength constraint', async () => {
    const user = userEvent.setup();
    render(
      <FormTextareaWrapper
        name="test-textarea"
        maxLength={5}
        placeholder="Limited textarea"
      />
    );
    
    const textarea = screen.getByPlaceholderText('Limited textarea');
    await user.type(textarea, '123456');
    
    expect(textarea).toHaveValue('12345');
    expect(screen.getByText('5/5')).toBeInTheDocument();
  });

  it('updates character count in real-time', async () => {
    const user = userEvent.setup();
    render(
      <FormTextareaWrapper
        name="test-textarea"
        maxLength={10}
        placeholder="Limited textarea"
      />
    );
    
    const textarea = screen.getByPlaceholderText('Limited textarea');
    
    await user.type(textarea, 'Hello');
    expect(screen.getByText('5/10')).toBeInTheDocument();
    
    await user.type(textarea, ' world');
    expect(screen.getByText('10/10')).toBeInTheDocument();
  });
}); 