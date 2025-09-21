'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useDashboardPreferences } from '@/hooks/use-dashboard-preferences';

interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: string;
  defaultTheme?: string;
  enableSystem?: boolean;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  attribute = 'class',
  defaultTheme = 'system',
  enableSystem = true,
  storageKey = 'syncro-space-theme',
  ...props
}: ThemeProviderProps) {
  const { preferences, loading } = useDashboardPreferences();
  
  // Use the user's theme preference if available, otherwise use the default
  const userTheme = !loading && preferences.theme ? preferences.theme : defaultTheme;
  
  return (
    <NextThemesProvider
      attribute={attribute}
      defaultTheme={userTheme}
      enableSystem={enableSystem}
      storageKey={storageKey}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}