import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change theme">
          <Sun className="h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 absolute" />
          <Moon className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        <DropdownMenuItem onClick={() => setTheme('dark')} className={theme === 'dark' ? 'text-primary' : ''}>
          <Moon className="h-4 w-4 mr-2" /> Dark Mode
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('light')} className={theme === 'light' ? 'text-primary' : ''}>
          <Sun className="h-4 w-4 mr-2" /> Light Mode
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')} className={theme === 'system' ? 'text-primary' : ''}>
          <Monitor className="h-4 w-4 mr-2" /> System Mode
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeToggle;
