import React from 'react';
import { User, Settings, Moon, Sun, HelpCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../ui/Button';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleGetHelp = () => {
    // Open the widget if available
    if (window.voicepilot) {
      window.voicepilot.open();
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 border-b bg-card">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold">Design Insights</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGetHelp}
          className="text-primary hover:text-primary/80"
        >
          <HelpCircle className="h-4 w-4 mr-2" />
          Get Help
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center space-x-3">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground">
              <User className="h-4 w-4" />
            </div>
          )}
          
          <span className="text-sm font-medium hidden md:block">
            {user?.name}
          </span>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-sm"
          >
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};