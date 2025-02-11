import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface AccessibilityContextType {
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  highContrastMode: boolean;
  setHighContrastMode: (enabled: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (enabled: boolean) => void;
  announcements: string[];
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  focusTrap: {
    active: boolean;
    activate: (containerId: string) => void;
    deactivate: () => void;
  };
  shortcuts: {
    register: (key: string, callback: () => void) => void;
    unregister: (key: string) => void;
  };
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  // Preferences state
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);
  const [highContrastMode, setHighContrastMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('high-contrast-mode');
      return stored ? stored === 'true' : false;
    }
    return false;
  });
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('reduced-motion');
      return stored ? stored === 'true' : false;
    }
    return false;
  });
  
  // Announcements for screen readers
  const [announcements, setAnnouncements] = useState<string[]>([]);
  
  // Focus trap state
  const [activeTrap, setActiveTrap] = useState<string | null>(null);
  
  // Keyboard shortcuts
  const [shortcuts, setShortcuts] = useState<Record<string, () => void>>({});

  // Monitor user preferences
  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: more)');

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
      if (!localStorage.getItem('reduced-motion')) {
        setReducedMotion(e.matches);
      }
    };
    const handleContrastChange = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches);
      if (!localStorage.getItem('high-contrast-mode')) {
        setHighContrastMode(e.matches);
      }
    };

    setPrefersReducedMotion(motionQuery.matches);
    setPrefersHighContrast(contrastQuery.matches);

    if (!localStorage.getItem('reduced-motion')) {
      setReducedMotion(motionQuery.matches);
    }

    motionQuery.addEventListener('change', handleMotionChange);
    contrastQuery.addEventListener('change', handleContrastChange);

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange);
      contrastQuery.removeEventListener('change', handleContrastChange);
    };
  }, []);

  // Handle high contrast mode changes
  useEffect(() => {
    const root = document.documentElement;
    if (highContrastMode) {
      root.setAttribute('data-high-contrast', 'true');
      localStorage.setItem('high-contrast-mode', 'true');
      announce('High contrast mode enabled', 'polite');
    } else {
      root.removeAttribute('data-high-contrast');
      localStorage.setItem('high-contrast-mode', 'false');
      if (localStorage.getItem('high-contrast-mode') !== null) {
        announce('High contrast mode disabled', 'polite');
      }
    }
  }, [highContrastMode]);

  // Handle reduced motion changes
  useEffect(() => {
    const root = document.documentElement;
    if (reducedMotion) {
      root.setAttribute('data-reduced-motion', 'true');
      localStorage.setItem('reduced-motion', 'true');
      announce('Reduced motion mode enabled', 'polite');
    } else {
      root.removeAttribute('data-reduced-motion');
      localStorage.setItem('reduced-motion', 'false');
      if (localStorage.getItem('reduced-motion') !== null) {
        announce('Reduced motion mode disabled', 'polite');
      }
    }
  }, [reducedMotion]);

  // Handle announcements
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncements(prev => [...prev, message]);
    
    // Clean up announcements after they've been read
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a !== message));
    }, 3000);
  }, []);

  // Focus trap management
  const activateFocusTrap = useCallback((containerId: string) => {
    setActiveTrap(containerId);
  }, []);

  const deactivateFocusTrap = useCallback(() => {
    setActiveTrap(null);
  }, []);

  // Keyboard shortcuts management
  const registerShortcut = useCallback((key: string, callback: () => void) => {
    setShortcuts(prev => ({ ...prev, [key]: callback }));
  }, []);

  const unregisterShortcut = useCallback((key: string) => {
    setShortcuts(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  // Global keyboard event handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = [
        event.ctrlKey && 'Ctrl',
        event.altKey && 'Alt',
        event.shiftKey && 'Shift',
        event.key
      ].filter(Boolean).join('+');

      if (shortcuts[key]) {
        event.preventDefault();
        shortcuts[key]();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  const value = {
    prefersReducedMotion,
    prefersHighContrast,
    highContrastMode,
    setHighContrastMode,
    reducedMotion,
    setReducedMotion,
    announcements,
    announce,
    focusTrap: {
      active: !!activeTrap,
      activate: activateFocusTrap,
      deactivate: deactivateFocusTrap
    },
    shortcuts: {
      register: registerShortcut,
      unregister: unregisterShortcut
    }
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      {/* Screen reader announcements */}
      <div 
        role="status" 
        aria-live="polite" 
        className="sr-only"
      >
        {announcements.map((announcement, index) => (
          <div key={`${announcement}-${index}`}>{announcement}</div>
        ))}
      </div>
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
} 