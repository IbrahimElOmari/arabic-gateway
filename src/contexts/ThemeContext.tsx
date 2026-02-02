import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Theme = 'light' | 'dark' | 'system';
type ThemeStyle = 'professional' | 'playful';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
  themeStyle: ThemeStyle;
  setThemeStyle: (style: ThemeStyle) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'system';
    }
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  const [themeStyle, setThemeStyleState] = useState<ThemeStyle>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('themeStyle') as ThemeStyle) || 'professional';
    }
    return 'professional';
  });

  useEffect(() => {
    const root = window.document.documentElement;

    const updateTheme = () => {
      let resolved: 'light' | 'dark';

      if (theme === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      } else {
        resolved = theme;
      }

      setResolvedTheme(resolved);
      root.classList.remove('light', 'dark');
      root.classList.add(resolved);
    };

    updateTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        updateTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Apply theme style class
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('theme-professional', 'theme-playful');
    root.classList.add(`theme-${themeStyle}`);
  }, [themeStyle]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const setThemeStyle = async (newStyle: ThemeStyle) => {
    setThemeStyleState(newStyle);
    localStorage.setItem('themeStyle', newStyle);
    
    // Sync to database if user is logged in
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ preferred_theme: newStyle })
          .eq('user_id', user.id);
      }
    } catch (error) {
      console.error('Failed to sync theme preference:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme, themeStyle, setThemeStyle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
