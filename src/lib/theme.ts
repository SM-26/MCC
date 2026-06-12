export const THEME = {
  modes: {
    // Dark theme (default)
    dark: {
      bgPrimary: '#1A1A1A',
      bgSurface: '#14213D',
      textMain: '#f0f0f0',
      textMuted: '#89A7A7',
      accent: '#3B00DB',
    },

    // Light theme
    light: {
      bgPrimary: '#f8f9fa',
      bgSurface: '#ffffff',
      textMain: '#1A1A1A',
      textMuted: '#4a6b6b',
      accent: '#3B00DB',
    },
  },

  // System theme configuration
  system: 'system',
} as const;

export type ThemeMode = 'dark' | 'light';
export type ThemeColors = typeof THEME.modes.dark;