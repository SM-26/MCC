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

export const gameState = $state<GameState>({
  money: 0,
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
});

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
