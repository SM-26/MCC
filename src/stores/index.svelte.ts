import type {
  AppContext,
  GameState,
  NavigationState,
  PWAInstallState,
  NavPosition,
} from '../types';
import { TabsList } from '../types';
import { log } from '../lib/logger';

// 1. Application context
export const appContext = $state<AppContext>({
  isPWAInstalled: false,
  isLoading: true,
  splashVisible: true,
  screenSize: 'md',
});

// 2. Helper to get default baseline
function getInitialState(): GameState {
  return {
    money: 75,
    mines: {
      activePlot: 0,
      plots: [],
      selectedMiner: null,
      draggedMiner: null,
      lastTick: 0,
    },
    meta: {
      engineeringIdeas: 0,
      resetCount: 0,
      MaxnorthExpansions: 1,
      MaxundergroundLevels: 0,
    },
    settings: {
      navbarPosition: 'top',
      defaultView: 'world',
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
}

// 3. Game state initialization
function bootstrapState(): GameState {
  const baseData = getInitialState();

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('mcc_save');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.data) {
          // Merge logic
          baseData.money = parsed.data.money ?? baseData.money;
          baseData.settings = { ...baseData.settings, ...parsed.data.settings };
          baseData.meta = { ...baseData.meta, ...parsed.data.meta };
          baseData.mines = { ...baseData.mines, ...parsed.data.mines };
        }
      }
    } catch (e) {
      log.error('bootstrapState', 'Failed to read localStorage:', e);
    }
  }
  return baseData;
}

export const gameState = $state<GameState>(bootstrapState());

// 4. Navigation store
export const navigation = $state<NavigationState>({
  activeTab: 'settings',
  tabs: [...TabsList],
  showLabels: true,
  showEmojis: true,
  showActiveLabel: false,
});

// 5. PWA state
export const pwaInstall = $state<PWAInstallState>({
  visible: false,
  shouldShow: true,
});
