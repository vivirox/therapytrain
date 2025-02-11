import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormFocusRing } from './form-focus-ring'
import React from 'react'

describe('FormFocusRing', () => {
  it('should show error state focus ring', async () => {
    render(
      <FormFocusRing error>
        <input placeholder="Test input" />
      </FormFocusRing>
    )

    const input = screen.getByPlaceholderText('Test input')
    await userEvent.tab()
    
    const focusRing = input.parentElement?.querySelector('[aria-hidden="true"]')
    expect(focusRing).toHaveClass('ring-destructive')
  })

  it('should handle disabled state', () => {
    render(
      <FormFocusRing disabled>
        <input placeholder="Test input" />
      </FormFocusRing>
    )

    const wrapper = screen.getByPlaceholderText('Test input').parentElement
    expect(wrapper).toHaveClass('opacity-50', 'cursor-not-allowed')
  })
}) 