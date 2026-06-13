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

function bootstrapState(): GameState {
  const baseData = getInitialState();

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('mcc_save');

      if (saved) {
        const parsed = JSON.parse(saved);

        if (parsed?.data) {
          baseData.money = parsed.data.money ?? baseData.money;
          baseData.settings = { ...baseData.settings, ...parsed.data.settings };
          baseData.meta = { ...baseData.meta, ...parsed.data.meta };

          if (parsed.data.world) {
            baseData.world = {
              ...baseData.world,
              ...parsed.data.world,
            };
          }
        }
      }
    } catch (e) {
      log.error('bootstrapState', 'Failed to read localStorage:', e);
    }
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
