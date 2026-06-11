// Theme tokens - centralized color system
export const THEME = {
  // Dark theme (default)
  dark: {
    background: '#1a1a2e',
    surface: '#16213e',
    primary: '#0f3460',
    accent: '#e94560',
    text: '#e0e0e0',
    textMuted: '#a0a0a0',
    border: '#2a2a4a',
  },
  
  // Light theme
  light: {
    background: '#f5f5f5',
    surface: '#ffffff',
    primary: '#1976d2',
    accent: '#f44336',
    text: '#212121',
    textMuted: '#757575',
    border: '#e0e0e0',
  },
  
  // System theme (auto)
  system: 'system',
};

export type ThemeName = keyof typeof THEME;
