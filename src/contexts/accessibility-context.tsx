import * as React from 'react';

interface AccessibilityContextType {
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  highContrastMode: boolean;
  setHighContrastMode: (enabled: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (enabled: boolean) => void;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  setColorBlindMode: (mode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia') => void;
  announcements: Announcement[];
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

const AccessibilityContext = React.createContext<AccessibilityContextType | undefined>(undefined);

interface Announcement {
  message: string;
  priority: 'polite' | 'assertive';
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  // Preferences state
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);
  const [prefersHighContrast, setPrefersHighContrast] = React.useState(false);
  const [highContrastMode, setHighContrastMode] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('high-contrast-mode');
      return stored ? stored === 'true' : false;
    }
    return false;
  });
  const [reducedMotion, setReducedMotion] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('reduced-motion');
      return stored ? stored === 'true' : false;
    }
    return false;
  });
  const [colorBlindMode, setColorBlindMode] = React.useState<'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('color-blind-mode');
      return (stored as 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia') || 'none';
    }
    return 'none';
  });
  
  // Announcements for screen readers
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  
  // Focus trap state
  const [activeTrap, setActiveTrap] = React.useState<string | null>(null);
  
  // Keyboard shortcuts
  const [shortcuts, setShortcuts] = React.useState<Record<string, () => void>>({});

  // Monitor user preferences
  React.useEffect(() => {
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
  React.useEffect(() => {
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
  React.useEffect(() => {
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

  // Handle color blind mode changes
  React.useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-color-blind', colorBlindMode);
    localStorage.setItem('color-blind-mode', colorBlindMode);
    if (colorBlindMode !== 'none') {
      announce(`${colorBlindMode} mode enabled`, 'polite');
    } else if (localStorage.getItem('color-blind-mode') !== null) {
      announce('Color blind mode disabled', 'polite');
    }
  }, [colorBlindMode]);

  // Handle announcements
  const announce = React.useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncements(prev => [...prev, { message, priority }]);
    
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.message !== message));
    }, 3000);
  }, []);

  // Focus trap management
  const activateFocusTrap = React.useCallback((containerId: string) => {
    setActiveTrap(containerId);
  }, []);

  const deactivateFocusTrap = React.useCallback(() => {
    setActiveTrap(null);
  }, []);

  // Keyboard shortcuts management
  const registerShortcut = React.useCallback((key: string, callback: () => void) => {
    setShortcuts(prev => ({ ...prev, [key]: callback }));
  }, []);

  const unregisterShortcut = React.useCallback((key: string) => {
    setShortcuts(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  // Global keyboard event handler
  React.useEffect(() => {
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
    colorBlindMode,
    setColorBlindMode,
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
          <div key={`${announcement.message}-${index}`}>{announcement.message}</div>
        ))}
      </div>
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = React.useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
} 