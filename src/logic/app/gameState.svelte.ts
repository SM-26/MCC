// src/logic/app/gameState.svelte.ts

import type { TabId } from './navigationTypes';
import type { SettingsState } from './settingsTypes';

import { createDefaultSavedNavigation, isTabId } from './navigationTypes';
import { createDefaultSettingsState } from './settingsTypes';

export interface GameSessionState {
  money: number; // default: 75
  activeTab: TabId; // default: 'world'
  settings: SettingsState;
}

function createDefaultGameSessionState(): GameSessionState {
  return {
    money: 75,
    activeTab: createDefaultSavedNavigation().activeTab,
    settings: createDefaultSettingsState(),
  };
}

export function createGameStateStore(initial?: Partial<GameSessionState>) {
  const state = $state<GameSessionState>({
    ...createDefaultGameSessionState(),
    ...initial,
    settings: {
      ...createDefaultSettingsState(),
      ...initial?.settings,
    },
  });

  return {
    get current() {
      return state;
    },

    reset() {
      Object.assign(state, createDefaultGameSessionState());
    },

    replace(next: GameSessionState) {
      Object.assign(state, next);
    },

    setMoney(value: number) {
      state.money = Math.max(0, value);
    },

    addMoney(amount: number) {
      state.money = Math.max(0, state.money + amount);
    },

    spendMoney(amount: number): boolean {
      if (amount < 0) {
        return false;
      }
      if (state.money < amount) {
        return false;
      }

      state.money -= amount;
      return true;
    },

    setActiveTab(tab: TabId): boolean {
      if (!isTabId(tab)) {
        return false;
      }

      state.activeTab = tab;
      return true;
    },

    setNavbarPosition(navbarPosition: SettingsState['navbarPosition']) {
      state.settings.navbarPosition = navbarPosition;
    },

    setDefaultView(defaultView: SettingsState['defaultView']) {
      state.settings.defaultView = defaultView;
    },

    setTheme(theme: SettingsState['theme']) {
      state.settings.theme = theme;
    },

    setWorldSeed(worldSeed: string) {
      state.settings.worldSeed = worldSeed;
    },

    setDevMode(value: boolean) {
      state.settings.devMode = value;
    },

    setSoundEnabled(value: boolean) {
      state.settings.soundEnabled = value;
    },

    setNotificationsEnabled(value: boolean) {
      state.settings.notificationsEnabled = value;
    },

    updateSettings(updates: Partial<SettingsState>) {
      Object.assign(state.settings, updates);
    },
  };
}

export const gameState = createGameStateStore();
