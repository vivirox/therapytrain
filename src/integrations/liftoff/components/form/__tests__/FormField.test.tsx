/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

import { render, screen } from '@/test-setup';
import { FormField } from '../FormField';
import { useForm, FormProvider } from 'react-hook-form';

// Test component wrapper to provide form context
const FormFieldWrapper = ({ children, defaultValues = {} }: any) => {
  const form = useForm({ defaultValues });
  return <FormProvider {...form}>{children}</FormProvider>;
};

describe('FormField', () => {
  it('renders correctly with all props', () => {
    render(
      <FormFieldWrapper>
        <FormField
          name="test-field"
          label="Test Label"
          description="Test Description"
          error="Test Error"
        >
          <input type="text" id="test-field" />
        </FormField>
      </FormFieldWrapper>
    );
    
    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Test Error')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders correctly without optional props', () => {
    render(
      <FormFieldWrapper>
        <FormField name="test-field">
          <input type="text" id="test-field" />
        </FormField>
      </FormFieldWrapper>
    );
    
    expect(screen.queryByRole('label')).not.toBeInTheDocument();
    expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('applies custom className correctly', () => {
    render(
      <FormFieldWrapper>
        <FormField
          name="test-field"
          className="custom-class"
        >
          <input type="text" id="test-field" />
        </FormField>
      </FormFieldWrapper>
    );
    
    const formField = screen.getByRole('textbox').closest('div');
    expect(formField).toHaveClass('custom-class');
  });

  it('handles form context integration', () => {
    const defaultValues = {
      'test-field': 'test value'
    };

    render(
      <FormFieldWrapper defaultValues={defaultValues}>
        <FormField name="test-field">
          <input type="text" id="test-field" />
        </FormField>
      </FormFieldWrapper>
    );

    expect(screen.getByRole('textbox')).toHaveValue('test value');
  });

  it('displays error message with proper styling', () => {
    render(
      <FormFieldWrapper>
        <FormField
          name="test-field"
          error="This field is required"
        >
          <input type="text" id="test-field" />
        </FormField>
      </FormFieldWrapper>
    );

    const errorMessage = screen.getByText('This field is required');
    expect(errorMessage).toHaveClass('text-destructive');
  });
});