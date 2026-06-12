import type { AppContext, GameState, NavigationState, PWAInstallState } from '../types';
import { TabsList } from '../types';

// 1. Application context store
export const appContext = $state<AppContext>({
  isPWAInstalled: false,
  isLoading: true,
  splashVisible: true,
  screenSize: 'md',
});

// 2. Game state store
const minesInitialState = {
  activePlot: 0,
  plots: [],
  selectedMiner: null,
  draggedMiner: null,
  lastTick: 0,
};
/**
 * Bootstrapper function that builds the initial state.
 * If a save exists in localStorage, it safely reads it before Svelte boots up.
 */
function bootstrapState(): GameState {
  const baseData: GameState = {
    money: 75,
    mines: minesInitialState,
    meta: {
      engineeringIdeas: 0,
      resetCount: 0,
      MaxnorthExpansions: 1,
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
  };

  // Check if we are running in a browser environment
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('mcc_save');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.data) {
          // Merge historical disk data onto our template structure safely
          return {
            ...baseData,
            ...parsed.data,
            settings: { ...baseData.settings, ...parsed.data.settings },
            meta: { ...baseData.meta, ...parsed.data.meta },
            mines: { ...baseData.mines, ...parsed.data.mines }
          };
        }
      }
    } catch (e) {
      console.error('Failed to bootstrap state from localStorage:', e);
    }
  }

  return baseData;
}

// Initialize the proxy state tree using our bootstrapped configuration
export const gameState = $state<GameState>(bootstrapState());

// 3. Navigation store
export const navigation = $state<NavigationState>({
  activeTab: 'settings',
  tabs: [...TabsList],
  navbarPosition: 'top',
  showLabels: true,
  showEmojis: true,
  showActiveLabel: false,
});

// 4. PWA installation store
export const pwaInstall = $state<PWAInstallState>({
  visible: false,
  shouldShow: true,
});
