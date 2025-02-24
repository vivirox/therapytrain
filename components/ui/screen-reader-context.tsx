import * as React from 'react'

interface ScreenReaderContext {
  announce: (message: string, priority?: 'polite' | 'assertive') => void
  clearAnnouncements: () => void
  isScreenReader: boolean
}

const ScreenReaderContext = React.createContext<ScreenReaderContext>({
  announce: () => {},
  clearAnnouncements: () => {},
  isScreenReader: false
})

export function ScreenReaderProvider({ children }: { children: React.ReactNode }) {
  const [announcements, setAnnouncements] = React.useState<string[]>([])
  const [isScreenReader, setIsScreenReader] = React.useState(false)
  
  // Detect screen reader
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(forced-colors: active)')
    const hasReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    
    // Common screen reader detection patterns
    setIsScreenReader(
      mediaQuery.matches || 
      hasReducedMotion || 
      document.documentElement.getAttribute('data-force-sr') === 'true'
    )
  }, [])

  const announce = React.useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncements(prev => [...prev, message])
    
    // Create aria-live region
    const liveRegion = document.createElement('div')
    liveRegion.setAttribute('aria-live', priority)
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.className = 'sr-only'
    document.body.appendChild(liveRegion)
    
    // Announce message
    setTimeout(() => {
      liveRegion.textContent = message
      setTimeout(() => {
        document.body.removeChild(liveRegion)
      }, 1000)
    }, 100)
  }, [])

  const clearAnnouncements = React.useCallback(() => {
    setAnnouncements([])
  }, [])

  return (
    <ScreenReaderContext.Provider 
      value={{ 
        announce, 
        clearAnnouncements,
        isScreenReader 
      }}
    >
      {children}
      {/* Persistent live regions */}
      <div className="sr-only" aria-live="polite" aria-atomic="true" />
      <div className="sr-only" aria-live="assertive" aria-atomic="true" />
    </ScreenReaderContext.Provider>
  )
}

export const useScreenReader = () => React.useContext(ScreenReaderContext) 