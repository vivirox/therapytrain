import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  const setTheme = useCallback((newTheme: Theme) => {
    const root = window.document.documentElement;
    const oldTheme = root.getAttribute("data-theme") || "light";
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const resolvedOldTheme = oldTheme === "system" ? systemTheme : oldTheme;
    const resolvedNewTheme = newTheme === "system" ? systemTheme : newTheme;

    // Don't animate if the theme isn't actually changing
    if (resolvedOldTheme === resolvedNewTheme) {
      setThemeState(newTheme);
      localStorage.setItem(storageKey, newTheme);
      return;
    }

    // Get the click position for the radial animation
    const x = window.event ? (window.event as MouseEvent).clientX : window.innerWidth / 2;
    const y = window.event ? (window.event as MouseEvent).clientY : window.innerHeight / 2;

    // Create and append the overlay
    const overlay = document.createElement("div");
    overlay.className = "theme-switch-overlay";
    overlay.style.setProperty("--theme-switch-x", `${x}px`);
    overlay.style.setProperty("--theme-switch-y", `${y}px`);
    overlay.style.setProperty("--theme-switch-from", `hsl(var(--background))`);
    overlay.style.setProperty(
      "--theme-switch-to",
      resolvedNewTheme === "dark"
        ? "hsl(222.2 84% 4.9%)"
        : "hsl(0 0% 100%)"
    );
    document.body.appendChild(overlay);

    // Start the animation
    requestAnimationFrame(() => {
      overlay.classList.add("active");
      root.setAttribute("data-theme", newTheme);
      setThemeState(newTheme);
      localStorage.setItem(storageKey, newTheme);

      // Clean up
      setTimeout(() => {
        document.body.removeChild(overlay);
      }, 500);
    });
  }, [storageKey]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleChange = () => {
      if (theme === "system") {
        const root = window.document.documentElement;
        const systemTheme = mediaQuery.matches ? "dark" : "light";
        root.setAttribute("data-theme", systemTheme);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.add("theme-switch-transition");
  }, []);

  const value = {
    theme,
    setTheme,
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
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
}; 