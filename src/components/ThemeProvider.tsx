import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (enabled: boolean) => void;
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
  highContrast: false,
  setHighContrast: () => null,
  reducedMotion: false,
  setReducedMotion: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'app-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(`${storageKey}-mode`) as Theme) || defaultTheme
  );
  const [highContrast, setHighContrast] = useState<boolean>(
    () => localStorage.getItem(`${storageKey}-contrast`) === 'true'
  );
  const [reducedMotion, setReducedMotion] = useState<boolean>(
    () => localStorage.getItem(`${storageKey}-motion`) === 'true'
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';

      root.dataset.theme = systemTheme;
    } else {
      root.dataset.theme = theme;
    }

    root.dataset.highContrast = highContrast ? 'true' : 'false';
    root.dataset.reducedMotion = reducedMotion ? 'true' : 'false';
  }, [theme, highContrast, reducedMotion]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        document.documentElement.dataset.theme = mediaQuery.matches ? 'dark' : 'light';
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Listen for system reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => {
      if (!localStorage.getItem(`${storageKey}-motion`)) {
        setReducedMotion(mediaQuery.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    handleChange(); // Check initial state
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [storageKey]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(`${storageKey}-mode`, theme);
      setTheme(theme);
    },
    highContrast,
    setHighContrast: (enabled: boolean) => {
      localStorage.setItem(`${storageKey}-contrast`, String(enabled));
      setHighContrast(enabled);
    },
    reducedMotion,
    setReducedMotion: (enabled: boolean) => {
      localStorage.setItem(`${storageKey}-motion`, String(enabled));
      setReducedMotion(enabled);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
}; 