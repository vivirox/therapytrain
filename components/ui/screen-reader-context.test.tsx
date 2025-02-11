import * as React from 'react'
import { render, screen, act } from '@testing-library/react'
import { ScreenReaderProvider, useScreenReader } from './screen-reader-context'

const TestComponent = () => {
  const { announce } = useScreenReader()
  return (
    <button onClick={() => announce('Test announcement')}>
      Announce
    </button>
  )
}

describe('ScreenReaderProvider', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('should create live regions on mount', () => {
    render(
      <ScreenReaderProvider>
        <div>Test</div>
      </ScreenReaderProvider>
    )

    const politeRegion = document.querySelector('[aria-live="polite"]')
    const assertiveRegion = document.querySelector('[aria-live="assertive"]')

    expect(politeRegion).toBeInTheDocument()
    expect(assertiveRegion).toBeInTheDocument()
  })

  it('should announce messages', async () => {
    render(
      <ScreenReaderProvider>
        <TestComponent />
      </ScreenReaderProvider>
    )

    const button = screen.getByText('Announce')
    await act(async () => {
      button.click()
      // Wait for announcement
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    const announcement = document.querySelector('[aria-live][role="status"]')
    expect(announcement).toHaveTextContent('Test announcement')
  })
}) 