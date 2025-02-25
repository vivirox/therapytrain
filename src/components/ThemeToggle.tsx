import { Moon, Sun, ZapIcon, MousePointerClick } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from './ui/dropdown-menu';

export function ThemeToggle() {
  const { theme, setTheme, highContrast, setHighContrast, reducedMotion, setReducedMotion } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={`
            h-9 w-9 relative theme-icon-spin
            ${!reducedMotion ? 'transition-transform duration-200' : ''}
          `}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => setTheme('light')} className="flex items-center">
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')} className="flex items-center">
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')} className="flex items-center">
          <span className="mr-2">💻</span>
          <span>System</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={highContrast}
          onCheckedChange={setHighContrast}
          className="flex items-center"
        >
          <ZapIcon className="mr-2 h-4 w-4" />
          <span>High Contrast</span>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={reducedMotion}
          onCheckedChange={setReducedMotion}
          className="flex items-center"
        >
          <MousePointerClick className="mr-2 h-4 w-4" />
          <span>Reduced Motion</span>
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 