import type { AppContext, GameState, NavigationState, PWAInstallState } from '../types';
import { TabsList } from '../types';
import { log } from '../lib/logger';

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
      commitMessage: 'Initial build commit',
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
          baseData.money = parsed.data.money ?? baseData.money;
          baseData.settings = { ...baseData.settings, ...parsed.data.settings };
          baseData.meta = { ...baseData.meta, ...parsed.data.meta };
          baseData.mines = { ...baseData.mines, ...parsed.data.mines };
        }
      }
    } catch (e) {
      log.error('bootstrapState', 'Failed to read localStorage:', e);
    }

    // 2. Read runtime text payloads from your local static asset build file
    try {
      fetch('/src/assets/git-info.txt')
        .then((res) => res.text())
        .then((text) => {
          const lines = text
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean);
          if (lines.length >= 2) {
            baseData.settings.commitHash = lines[0];
            baseData.settings.commitMessage = lines[1];
          }
        });
    } catch (e) {
      log.error('fetch git-info', 'Could not fetch compile telemetry info:', e);
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
