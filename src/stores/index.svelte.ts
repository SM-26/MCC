import type { AppContext, GameState, NavigationState, PWAInstallState } from '../types';
import { TabsList } from '../types';
import { log } from '../lib/logger';
import { getInitialState } from '../logic/stateFactory';

export const appContext = $state<AppContext>({
  isPWAInstalled: false,
  isLoading: true,
  splashVisible: true,
  screenSize: 'md',
});

function applyBootstrappedData(baseData: GameState, savedData: Partial<GameState>) {
  baseData.money = savedData.money ?? baseData.money;
  baseData.settings = { ...baseData.settings, ...savedData.settings };
  baseData.meta = { ...baseData.meta, ...savedData.meta };

  if (savedData.world) {
    baseData.world = {
      ...baseData.world,
      ...savedData.world,
    };
  }
}

function readSavedGameData(): Partial<GameState> | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const saved = localStorage.getItem('mcc_save');
    if (!saved) {
      return null;
    }

    const parsed = JSON.parse(saved);
    return parsed?.data ?? null;
  } catch (e) {
    log.error('bootstrapState', 'Failed to read localStorage:', e);
    return null;
  }
}

function bootstrapState(): GameState {
  const baseData = getInitialState();
  const savedData = readSavedGameData();

  if (savedData) {
    applyBootstrappedData(baseData, savedData);
  }

  return baseData;
}
export const gameState = $state<GameState>(bootstrapState());

export const navigation = $state<NavigationState>({
  activeTab: 'settings',
  tabs: [...TabsList],
  showLabels: true,
  showEmojis: true,
  showActiveLabel: false,
});

export const pwaInstall = $state<PWAInstallState>({
  visible: false,
  shouldShow: true,
});
