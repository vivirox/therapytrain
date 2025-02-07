import { useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("theme") as Theme) || "system"
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    
    function applyTheme(theme: Theme) {
      const root = window.document.documentElement;
      const isDark = theme === "dark" || (theme === "system" && media.matches);
      
      root.classList.remove("light", "dark");
      root.classList.add(isDark ? "dark" : "light");
    }

    applyTheme(theme);
    localStorage.setItem("theme", theme);

    const listener = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };

    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [theme]);

  return { theme, setTheme };
}

export { useTheme, type Theme };
