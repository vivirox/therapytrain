/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

import { render, screen } from '@testing-library/react';
import { FormField } from '../FormField';

describe('FormField', () => {
  it('renders correctly with all props', () => {
    const { container } = render(
      <FormField
        name="test-field"
        label="Test Label"
        description="Test Description"
        error="Test Error"
      >
        <input type="text" id="test-field" />
      </FormField>
    );
    
    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Test Error')).toBeInTheDocument();
    expect(container.querySelector('input')).toBeInTheDocument();
  });

  it('renders correctly without optional props', () => {
    const { container } = render(
      <FormField name="test-field">
        <input type="text" id="test-field" />
      </FormField>
    );
    
    expect(screen.queryByRole('label')).not.toBeInTheDocument();
    expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    expect(container.querySelector('input')).toBeInTheDocument();
  });

  it('applies custom className correctly', () => {
    const { container } = render(
      <FormField
        name="test-field"
        className="custom-class"
      >
        <input type="text" id="test-field" />
      </FormField>
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('associates label with input using htmlFor', () => {
    render(
      <FormField
        name="test-field"
        label="Test Label"
      >
        <input type="text" id="test-field" />
      </FormField>
    );
    
    const label = screen.getByText('Test Label');
    expect(label).toHaveAttribute('for', 'test-field');
  });

  it('renders children correctly', () => {
    render(
      <FormField name="test-field">
        <div data-testid="child-element">Child Content</div>
      </FormField>
    );
    
    expect(screen.getByTestId('child-element')).toBeInTheDocument();
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('handles disabled state styling', () => {
    render(
      <FormField
        name="test-field"
        label="Test Label"
      >
        <input type="text" id="test-field" disabled />
      </FormField>
    );
    
    const label = screen.getByText('Test Label');
    expect(label).toHaveClass('peer-disabled:cursor-not-allowed', 'peer-disabled:opacity-70');
  });
});