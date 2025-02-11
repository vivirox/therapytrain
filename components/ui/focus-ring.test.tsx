import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FocusRing } from './focus-ring'

describe('FocusRing', () => {
  it('should show focus ring on keyboard focus', async () => {
    render(
      <FocusRing>
        <button>Click me</button>
      </FocusRing>
    )

    const button = screen.getByRole('button')
    
    // Tab to focus
    await userEvent.tab()
    expect(button).toHaveFocus()
    
    // Check focus ring is visible
    const focusRing = button.parentElement?.querySelector('[aria-hidden="true"]')
    expect(focusRing).toHaveClass('opacity-100')
  })

  it('should not show focus ring on mouse focus', async () => {
    render(
      <FocusRing>
        <button>Click me</button>
      </FocusRing>
    )

    const button = screen.getByRole('button')
    
    // Click to focus
    await userEvent.click(button)
    expect(button).toHaveFocus()
    
    // Check focus ring is not visible
    const focusRing = button.parentElement?.querySelector('[aria-hidden="true"]')
    expect(focusRing).not.toHaveClass('opacity-100')
  })
}) 