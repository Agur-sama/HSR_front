import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

const THEMES = {
  light: {
    name: 'light',
    colors: {
      bgPrimary: '#f8fafc',
      bgSecondary: '#ffffff',
      bgCard: '#ffffff',
      bgSurface: '#f1f5f9',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#64748b',
      border: '#e2e8f0',
      borderLight: '#cbd5e1',
      primary: '#1e40af',
      primaryLight: '#3b82f6',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      cardShadow: '0 4px 6px rgba(0,0,0,0.05)'
    }
  },
  dark: {
    name: 'dark',
    colors: {
      bgPrimary: '#061227',
      bgSecondary: '#07152d',
      bgCard: 'rgba(8, 28, 51, 0.85)',
      bgSurface: 'rgba(255, 255, 255, 0.05)',
      textPrimary: '#ffffff',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
      border: 'rgba(59, 130, 246, 0.2)',
      borderLight: 'rgba(30, 64, 175, 0.3)',
      primary: '#1e40af',
      primaryLight: '#3b82f6',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      cardShadow: '0 8px 16px rgba(0, 0, 0, 0.4)'
    }
  }
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('vsm-theme');
    // По умолчанию всегда тёмная тема (синяя)
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('vsm-theme', theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Функция для сброса темы на тёмную (синюю)
  const resetToDarkTheme = () => {
    setTheme('dark');
    localStorage.setItem('vsm-theme', 'dark');
    document.body.setAttribute('data-theme', 'dark');
  };

  const value = {
    theme: THEMES[theme],
    themeName: theme,
    toggleTheme,
    resetToDarkTheme  // 👈 добавляем функцию сброса
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return context;
}