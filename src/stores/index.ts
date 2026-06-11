import { writable } from 'svelte/store';
import type { AppContext, GameState, NavigationState, PWAInstallState } from '../types';
import { TabsList } from '../types';

// Application context store
export const appContext = writable<AppContext>({
  isPWAInstalled: false,
  isLoading: true,
  splashVisible: true,
  screenSize: 'md',
});

// Game state store - Initialize with one plot
const minesInitialState = {
  activePlot: 0,
  plots: [], // Will be initialized by MineGen when needed
  selectedMiner: null,
  draggedMiner: null,
  lastTick: 0,
};

export const gameState = writable<GameState>({
  money: 0,
  mines: minesInitialState,
  meta: {
    engineeringIdeas: 0,
    resetCount: 0,
    MaxnorthExpansions: 1, // Roman numeral I (starting)
    MaxundergroundLevels: 0,
  },
  settings: {
    navbarPosition: 'top',
    devMode: false,
    soundEnabled: false,
    notificationsEnabled: true,
    appVersion: '0.0.1',
    commitHash: 'abc#123',
    theme: 'dark',
    worldSeed: '123456',
  },
});

// Navigation store
export const navigation = writable<NavigationState>({
  activeTab: 'settings', // Start with settings as per dev preference
  tabs: [...TabsList],
  navbarPosition: 'top',
  showLabels: true, // Desktop mode: show text labels
  showEmojis: true, // Emoji fallback: always show emojis
  showActiveLabel: false, // Will be initialized in App.svelte based on screen size
});

// PWA installation store
export const pwaInstall = writable<PWAInstallState>({
  visible: false,
  shouldShow: true,
});
