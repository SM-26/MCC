import { writable } from 'svelte/store';
import type { AppContext, GameState } from './types';

// Application context store
export const appContext = writable<AppContext>({
  theme: 'dark',
  isPWAInstalled: false,
  isLoading: true,
  splashVisible: true
});

// Game state store
export const gameState = writable<GameState>({
  currentWorld: 1,
  mineLevel: 0,
  settings: {
    soundEnabled: true,
    vibrationEnabled: true,
    notificationsEnabled: true
  }
});

// Navigation store
export const navigation = writable({
  activeTab: 'world',
  tabs: ['world', 'mine', 'settings'] as const
});

// PWA installation store
export const pwaInstall = writable({
  visible: false,
  shouldShow: true
});
