/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormCheckbox } from '../FormCheckbox';
import { useForm } from 'react-hook-form';

// Mock component wrapper to provide form context
const FormCheckboxWrapper = ({
  defaultValues = {},
  ...props
}: any) => {
  const form = useForm({ defaultValues });
  return <FormCheckbox form={form} {...props} />;
};

describe('FormCheckbox', () => {
  it('renders correctly with all props', () => {
    render(
      <FormCheckboxWrapper
        name="test-checkbox"
        label="Test Label"
        description="Test Description"
      />
    );
    
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('handles disabled state', () => {
    render(
      <FormCheckboxWrapper
        name="test-checkbox"
        label="Disabled Checkbox"
        disabled={true}
      />
    );
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
    
    const label = screen.getByText('Disabled Checkbox');
    expect(label).toHaveClass('peer-disabled:cursor-not-allowed', 'peer-disabled:opacity-70');
  });

  it('handles checkbox state changes', async () => {
    const user = userEvent.setup();
    render(
      <FormCheckboxWrapper
        name="test-checkbox"
        label="Test Checkbox"
      />
    );
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('applies validation and shows error message', async () => {
    const validation = {
      required: 'This field is required',
    };

    render(
      <FormCheckboxWrapper
        name="test-checkbox"
        label="Required Checkbox"
        validation={validation}
      />
    );
    
    const checkbox = screen.getByRole('checkbox');
    await userEvent.click(checkbox);
    await userEvent.click(checkbox); // Uncheck
    await userEvent.tab(); // Trigger blur event
    
    const errorMessage = await screen.findByText('This field is required');
    expect(errorMessage).toBeInTheDocument();
    expect(checkbox).toHaveClass('border-destructive');
  });

  it('handles form value changes', async () => {
    const defaultValues = {
      'test-checkbox': true,
    };

    render(
      <FormCheckboxWrapper
        name="test-checkbox"
        label="Test Checkbox"
        defaultValues={defaultValues}
      />
    );
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('applies custom className correctly', () => {
    render(
      <FormCheckboxWrapper
        name="test-checkbox"
        label="Test Checkbox"
        className="custom-class"
      />
    );
    
    const formField = screen.getByRole('checkbox').closest('div')!.parentElement;
    expect(formField).toHaveClass('custom-class');
  });

  it('renders without label', () => {
    render(
      <FormCheckboxWrapper
        name="test-checkbox"
      />
    );
    
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.queryByRole('label')).not.toBeInTheDocument();
  });

  it('associates label with checkbox using htmlFor', () => {
    render(
      <FormCheckboxWrapper
        name="test-checkbox"
        label="Test Label"
      />
    );
    
    const checkbox = screen.getByRole('checkbox');
    const label = screen.getByText('Test Label');
    
    expect(checkbox).toHaveAttribute('id', 'test-checkbox');
    expect(label).toHaveAttribute('for', 'test-checkbox');
  });

  it('handles click on label', async () => {
    const user = userEvent.setup();
    render(
      <FormCheckboxWrapper
        name="test-checkbox"
        label="Test Label"
      />
    );
    
    const checkbox = screen.getByRole('checkbox');
    const label = screen.getByText('Test Label');
    
    await user.click(label);
    expect(checkbox).toBeChecked();
    
    await user.click(label);
    expect(checkbox).not.toBeChecked();
  });
}); 