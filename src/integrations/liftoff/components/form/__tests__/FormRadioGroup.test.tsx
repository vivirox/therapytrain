/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormRadioGroup } from '../FormRadioGroup';
import { useForm } from 'react-hook-form';

const mockOptions = [
  { value: 'option1', label: 'Option 1', description: 'Description 1' },
  { value: 'option2', label: 'Option 2', description: 'Description 2' },
  { value: 'option3', label: 'Option 3', disabled: true },
];

// Mock component wrapper to provide form context
const FormRadioGroupWrapper = ({
  defaultValues = {},
  options = mockOptions,
  ...props
}: any) => {
  const form = useForm({ defaultValues });
  return <FormRadioGroup form={form} options={options} {...props} />;
};

describe('FormRadioGroup', () => {
  it('renders correctly with all props', () => {
    render(
      <FormRadioGroupWrapper
        name="test-radio"
        label="Test Label"
        description="Test Description"
      />
    );
    
    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Description 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Description 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('handles disabled state', () => {
    render(
      <FormRadioGroupWrapper
        name="test-radio"
        disabled={true}
      />
    );
    
    const radioButtons = screen.getAllByRole('radio');
    radioButtons.forEach(radio => {
      expect(radio).toBeDisabled();
    });
    
    const labels = screen.getAllByRole('label');
    labels.forEach(label => {
      expect(label).toHaveClass('peer-disabled:cursor-not-allowed', 'peer-disabled:opacity-70');
    });
  });

  it('handles individual disabled options', () => {
    render(
      <FormRadioGroupWrapper
        name="test-radio"
      />
    );
    
    const radioButtons = screen.getAllByRole('radio');
    expect(radioButtons[2]).toBeDisabled(); // Option 3 is disabled
    expect(radioButtons[0]).not.toBeDisabled();
    expect(radioButtons[1]).not.toBeDisabled();
  });

  it('handles radio selection', async () => {
    const user = userEvent.setup();
    render(
      <FormRadioGroupWrapper
        name="test-radio"
      />
    );
    
    const radioButtons = screen.getAllByRole('radio');
    expect(radioButtons[0]).not.toBeChecked();
    
    await user.click(radioButtons[0]);
    expect(radioButtons[0]).toBeChecked();
    expect(radioButtons[1]).not.toBeChecked();
    
    await user.click(radioButtons[1]);
    expect(radioButtons[0]).not.toBeChecked();
    expect(radioButtons[1]).toBeChecked();
  });

  it('applies validation and shows error message', async () => {
    const validation = {
      required: 'This field is required',
    };

    render(
      <FormRadioGroupWrapper
        name="test-radio"
        validation={validation}
      />
    );
    
    const radioButtons = screen.getAllByRole('radio');
    await userEvent.click(radioButtons[0]);
    await userEvent.tab(); // Move focus away
    
    const errorMessage = await screen.findByText('This field is required');
    expect(errorMessage).toBeInTheDocument();
    expect(radioButtons[0]).toHaveClass('border-destructive');
  });

  it('handles form value changes', async () => {
    const defaultValues = {
      'test-radio': 'option1',
    };

    render(
      <FormRadioGroupWrapper
        name="test-radio"
        defaultValues={defaultValues}
      />
    );
    
    const radioButtons = screen.getAllByRole('radio');
    expect(radioButtons[0]).toBeChecked();
  });

  it('applies custom className correctly', () => {
    render(
      <FormRadioGroupWrapper
        name="test-radio"
        className="custom-class"
      />
    );
    
    const formField = screen.getAllByRole('radio')[0].closest('div')!.parentElement!.parentElement;
    expect(formField).toHaveClass('custom-class');
  });

  it('handles horizontal orientation', () => {
    render(
      <FormRadioGroupWrapper
        name="test-radio"
        orientation="horizontal"
      />
    );
    
    const radioGroup = screen.getAllByRole('radio')[0].closest('div[role="radiogroup"]');
    expect(radioGroup).toHaveClass('flex');
    
    const radioItems = screen.getAllByRole('radio').map(radio => radio.closest('div'));
    radioItems.forEach(item => {
      expect(item).toHaveClass('mr-4');
    });
  });

  it('handles vertical orientation', () => {
    render(
      <FormRadioGroupWrapper
        name="test-radio"
        orientation="vertical"
      />
    );
    
    const radioGroup = screen.getAllByRole('radio')[0].closest('div[role="radiogroup"]');
    expect(radioGroup).toHaveClass('flex', 'flex-col');
    
    const radioItems = screen.getAllByRole('radio').map(radio => radio.closest('div'));
    radioItems.forEach(item => {
      expect(item).toHaveClass('mb-2');
    });
  });

  it('associates labels with radio buttons using htmlFor', () => {
    render(
      <FormRadioGroupWrapper
        name="test-radio"
      />
    );
    
    const radioButtons = screen.getAllByRole('radio');
    const labels = screen.getAllByRole('label');
    
    radioButtons.forEach((radio, index) => {
      expect(radio).toHaveAttribute('id', `test-radio-${mockOptions[index].value}`);
      expect(labels[index]).toHaveAttribute('for', `test-radio-${mockOptions[index].value}`);
    });
  });

  it('handles click on labels', async () => {
    const user = userEvent.setup();
    render(
      <FormRadioGroupWrapper
        name="test-radio"
      />
    );
    
    const labels = screen.getAllByRole('label');
    const radioButtons = screen.getAllByRole('radio');
    
    await user.click(labels[0]);
    expect(radioButtons[0]).toBeChecked();
    
    await user.click(labels[1]);
    expect(radioButtons[1]).toBeChecked();
    expect(radioButtons[0]).not.toBeChecked();
  });
}); 