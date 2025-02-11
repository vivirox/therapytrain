import * as React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { NavFocusRing } from './nav-focus-ring'

describe('NavFocusRing', () => {
  it('should show active state styles', async () => {
    render(
      <NavFocusRing active>
        <a href="#">Test Link</a>
      </NavFocusRing>
    )

    const link = screen.getByText('Test Link')
    const wrapper = link.parentElement as HTMLElement
    
    expect(wrapper).toHaveClass('bg-accent/10')
    
    await userEvent.tab()
    const focusRing = wrapper?.querySelector('[aria-hidden="true"]') as HTMLElement
    expect(focusRing).toHaveClass('ring-accent')
  })
}) 