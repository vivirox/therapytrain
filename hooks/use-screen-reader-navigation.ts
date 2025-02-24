import * as React from 'react'
import { useScreenReader } from '@/components/ui/screen-reader-context'
import { announceListNavigation } from '@/lib/screen-reader-utils'

interface UseScreenReaderNavigationProps {
  items: any[]
  onNavigate?: (index: number) => void
}

export function useScreenReaderNavigation({
  items,
  onNavigate
}: UseScreenReaderNavigationProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const { announce } = useScreenReader()

  const handleKeyDown = React.useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault()
        setCurrentIndex(prev => {
          const next = (prev + 1) % items.length
          announce(announceListNavigation(next, items.length))
          onNavigate?.(next)
          return next
        })
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault()
        setCurrentIndex(prev => {
          const next = prev === 0 ? items.length - 1 : prev - 1
          announce(announceListNavigation(next, items.length))
          onNavigate?.(next)
          return next
        })
        break
      case 'Home':
        event.preventDefault()
        setCurrentIndex(0)
        announce(announceListNavigation(0, items.length))
        onNavigate?.(0)
        break
      case 'End':
        event.preventDefault()
        setCurrentIndex(items.length - 1)
        announce(announceListNavigation(items.length - 1, items.length))
        onNavigate?.(items.length - 1)
        break
    }
  }, [items.length, announce, onNavigate])

  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return {
    currentIndex,
    setCurrentIndex
  }
} 