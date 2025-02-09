/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
  return <FormSelect form={form} options={options} {...props} />;
};

describe('FormSelect', () => {
  it('renders correctly with all props', () => {
    render(
      <FormSelectWrapper
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
}); 