/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render } from '@/test-setup';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FormSelect } from '../FormSelect';
import { useForm } from 'react-hook-form';

const mockOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3', disabled: true },
];

// Mock component wrapper to provide form context
const FormSelectWrapper = ({
  defaultValues = {},
  options = mockOptions,
  ...props
}: any) => {
  const form = useForm({ defaultValues });
  return (
    <FormSelect
      control={form.control}
      options={options}
      {...props}
    />
  );
};

describe('FormSelect', () => {
  const defaultProps = {
    id: 'test-select',
    name: 'test-select',
    label: 'Test Select',
    control: undefined,
    options: mockOptions,
    onChange: vi.fn(),
  };

  it('renders correctly with all props', () => {
    render(
      <FormSelect
        {...defaultProps}
        name="test-select"
        label="Test Label"
        description="Test Description"
        placeholder="Select an option"
      />
    );
    
    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Select an option')).toBeInTheDocument();
  });

  it('handles disabled state', () => {
    render(
      <FormSelectWrapper
        name="test-select"
        disabled={true}
        placeholder="Disabled select"
      />
    );
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDisabled();
  });

  it('shows options when clicked', async () => {
    const user = userEvent.setup();
    render(
      <FormSelectWrapper
        name="test-select"
        placeholder="Select an option"
      />
    );
    
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('handles option selection', async () => {
    const user = userEvent.setup();
    render(
      <FormSelectWrapper
        name="test-select"
        placeholder="Select an option"
      />
    );
    
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    
    const option = screen.getByText('Option 1');
    await user.click(option);
    
    expect(trigger).toHaveTextContent('Option 1');
  });

  it('respects disabled options', async () => {
    const user = userEvent.setup();
    render(
      <FormSelectWrapper
        name="test-select"
        placeholder="Select an option"
      />
    );
    
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    
    const disabledOption = screen.getByText('Option 3');
    expect(disabledOption.parentElement).toHaveAttribute('data-disabled');
  });

  it('applies validation and shows error message', async () => {
    const validation = {
      required: 'This field is required',
    };

    render(
      <FormSelectWrapper
        name="test-select"
        validation={validation}
        placeholder="Required select"
      />
    );
    
    const trigger = screen.getByRole('combobox');
    await userEvent.click(trigger);
    await userEvent.tab(); // Trigger blur event
    
    const errorMessage = await screen.findByText('This field is required');
    expect(errorMessage).toBeInTheDocument();
    expect(trigger).toHaveClass('border-destructive');
  });

  it('handles form value changes', async () => {
    const user = userEvent.setup();
    const defaultValues = {
      'test-select': 'option1',
    };

    render(
      <FormSelectWrapper
        name="test-select"
        defaultValues={defaultValues}
        placeholder="Test select"
      />
    );
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveTextContent('Option 1');
    
    await user.click(trigger);
    const option = screen.getByText('Option 2');
    await user.click(option);
    
    expect(trigger).toHaveTextContent('Option 2');
  });

  it('applies custom className correctly', () => {
    render(
      <FormSelectWrapper
        name="test-select"
        className="custom-class"
        placeholder="Test select"
      />
    );
    
    const formField = screen.getByRole('combobox').closest('div');
    expect(formField).toHaveClass('custom-class');
  });

  it('handles empty options array', () => {
    render(
      <FormSelectWrapper
        name="test-select"
        options={[]}
        placeholder="No options"
      />
    );
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveTextContent('No options');
  });

  it('renders with label and options', () => {
    render(<FormSelect {...defaultProps} />);
    
    expect(screen.getByLabelText('Test Select')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    defaultProps.options.forEach(option => {
      expect(screen.getByText(option.label)).toBeInTheDocument();
    });
  });

  it('handles value changes', () => {
    render(<FormSelect {...defaultProps} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'option2' } });
    
    expect(defaultProps.onChange).toHaveBeenCalledTimes(1);
    expect(defaultProps.onChange).toHaveBeenCalledWith(expect.any(Object));
  });

  it('displays error message when provided', () => {
    const error = 'This field is required';
    render(<FormSelect {...defaultProps} error={error} />);
    
    expect(screen.getByText(error)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('supports disabled state', () => {
    render(<FormSelect {...defaultProps} disabled />);
    
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('handles required attribute', () => {
    render(<FormSelect {...defaultProps} required />);
    
    expect(screen.getByRole('combobox')).toHaveAttribute('required');
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const className = 'custom-select';
    render(<FormSelect {...defaultProps} className={className} />);
    
    expect(screen.getByRole('combobox')).toHaveClass(className);
  });

  it('supports placeholder option', () => {
    const placeholder = 'Select an option';
    render(<FormSelect {...defaultProps} placeholder={placeholder} />);
    
    expect(screen.getByText(placeholder)).toBeInTheDocument();
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<FormSelect {...defaultProps} />);
    
    const select = screen.getByRole('combobox');
    
    // Tab to focus
    await user.tab();
    expect(select).toHaveFocus();
    
    // Space to open
    await user.keyboard('[Space]');
    
    // Arrow down to navigate
    await user.keyboard('[ArrowDown]');
    expect(screen.getByRole('option', { name: 'Option 1' })).toHaveFocus();
    
    // Arrow down again
    await user.keyboard('[ArrowDown]');
    expect(screen.getByRole('option', { name: 'Option 2' })).toHaveFocus();
    
    // Enter to select
    await user.keyboard('[Enter]');
    expect(defaultProps.onChange).toHaveBeenCalled();
  });

  it('maintains focus after selection', async () => {
    const user = userEvent.setup();
    render(<FormSelect {...defaultProps} />);
    
    const select = screen.getByRole('combobox');
    
    // Focus and open
    await user.tab();
    await user.keyboard('[Space]');
    
    // Make selection
    await user.keyboard('[ArrowDown]');
    await user.keyboard('[Enter]');
    
    // Select should retain focus
    expect(select).toHaveFocus();
  });

  it('supports screen reader accessibility', () => {
    render(<FormSelect {...defaultProps} />);
    
    const select = screen.getByRole('combobox');
    
    // ARIA attributes
    expect(select).toHaveAttribute('aria-label', 'Test Select');
    expect(select).toHaveAttribute('aria-expanded', 'false');
    expect(select).toHaveAttribute('aria-haspopup', 'listbox');
    
    // Required state
    render(<FormSelect {...defaultProps} required />);
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-required', 'true');
    
    // Error state
    render(<FormSelect {...defaultProps} error="Error message" />);
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-errormessage');
  });
}); 