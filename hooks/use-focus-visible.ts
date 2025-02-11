import * as React from 'react'

interface UseFocusVisibleProps {
  onFocus?: (event: React.FocusEvent) => void
  onBlur?: (event: React.FocusEvent) => void
}

export function useFocusVisible({
  onFocus,
  onBlur,
}: UseFocusVisibleProps = {}) {
  const [focusVisible, setFocusVisible] = React.useState(false)
  const hadKeyboardEvent = React.useRef(false)
  const mouseDown = React.useRef(false)

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.altKey || event.ctrlKey) {
        return
      }
      hadKeyboardEvent.current = true
    }

    function handlePointerDown() {
      hadKeyboardEvent.current = false
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [])

  return {
    focusVisible,
    onFocus: React.useCallback(
      (event: React.FocusEvent) => {
        if (hadKeyboardEvent.current && !mouseDown.current) {
          setFocusVisible(true)
        }
        onFocus?.(event)
      },
      [onFocus]
    ),
    onBlur: React.useCallback(
      (event: React.FocusEvent) => {
        setFocusVisible(false)
        onBlur?.(event)
      },
      [onBlur]
    ),
    onMouseDown: () => {
      mouseDown.current = true
      requestAnimationFrame(() => {
        mouseDown.current = false
      })
    },
  }
} 