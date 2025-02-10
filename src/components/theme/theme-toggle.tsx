import { useTheme } from "./theme-provider";
import { useAccessibility } from "@/contexts/accessibility-context";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "../ui/dropdown-menu";
import { Sun, Moon, Monitor, Contrast, Waves } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { highContrastMode, setHighContrastMode, reducedMotion, setReducedMotion } = useAccessibility();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="relative h-9 w-9 dark-hover dark-focus-ring high-contrast-focus reduced-motion-safe"
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all duration-200 dark:-rotate-90 dark:scale-0 high-contrast-icon reduced-motion" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all duration-200 dark:rotate-0 dark:scale-100 high-contrast-icon reduced-motion" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end"
        className="dark-glass dark-shadow animate-in fade-in-0 zoom-in-95 high-contrast-border reduced-motion-safe"
      >
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className="dark-hover cursor-pointer gap-2 high-contrast-text"
        >
          <Sun className="h-4 w-4 high-contrast-icon" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className="dark-hover cursor-pointer gap-2 high-contrast-text"
        >
          <Moon className="h-4 w-4 high-contrast-icon" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className="dark-hover cursor-pointer gap-2 high-contrast-text"
        >
          <Monitor className="h-4 w-4 high-contrast-icon" />
          <span>System</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={highContrastMode}
          onCheckedChange={setHighContrastMode}
          className="dark-hover cursor-pointer gap-2 high-contrast-text"
        >
          <Contrast className="h-4 w-4 high-contrast-icon" />
          <span>High Contrast</span>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={reducedMotion}
          onCheckedChange={setReducedMotion}
          className="dark-hover cursor-pointer gap-2 high-contrast-text"
        >
          <Waves className="h-4 w-4 high-contrast-icon" />
          <span>Reduced Motion</span>
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 