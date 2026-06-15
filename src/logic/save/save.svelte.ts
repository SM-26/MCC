// src/logic/save/save.svelte.ts

import { log } from '../../lib/logger';

import type { GameState, PersistedGameState } from './saveTypes';

import { getInitialNavigationState, getInitialState } from '../stateFactory';

import { gameState } from '../app/gameState.svelte';
import { mineStore } from '../mine/mineStore.svelte';
import { worldStore } from '../world/worldStore.svelte';
import { engineeringStore } from '../engineering/engineeringStore.svelte';
import { saveStore } from './saveStore.svelte';
import { navigation } from '../app/navigationStore.svelte';

const SAVE_STORAGE_KEY = 'mcc_save';

let saveTimeoutId: ReturnType<typeof setTimeout> | null = null;

function buildGameStateSnapshot(): GameState {
  return {
    money: gameState.current.money,
    world: $state.snapshot(worldStore.current),
    plots: [$state.snapshot(mineStore.current)],
    engineering: $state.snapshot(engineeringStore.current),
    settings: $state.snapshot(gameState.current.settings),
  };
}

function buildDefaultPersistedState(): PersistedGameState {
  const defaults = getInitialState();

  return {
    ...defaults,
    navigation: getInitialNavigationState(),
  };
}

function applyGameState(state: GameState): void {
  gameState.setMoney(state.money);
  gameState.updateSettings(state.settings);

  worldStore.replace(state.world);
  engineeringStore.replace(state.engineering);

  const firstPlot = state.plots[0];
  if (firstPlot) {
    mineStore.replace(firstPlot);
  } else {
    mineStore.reset();
  }
}

function applyPersistedState(state: PersistedGameState): void {
  applyGameState(state);
  navigation.setActiveTab(state.navigation.activeTab);
}

export function getSaveSnapshot(): PersistedGameState {
  return {
    ...buildGameStateSnapshot(),
    navigation: $state.snapshot(navigation.current),
  };
}

function saveNow(logContext: 'debounced save' | 'manual save'): void {
  const snapshot = getSaveSnapshot();

  const ok = saveStore.saveToLocalStorage(
    {
      money: snapshot.money,
      world: snapshot.world,
      plots: snapshot.plots,
      engineering: snapshot.engineering,
      settings: snapshot.settings,
    },
    {
      navigation: snapshot.navigation,
    },
  );

  if (!ok) {
    throw new Error(saveStore.current.lastError ?? 'Unknown save failure.');
  }

  if (logContext === 'debounced save') {
    log.debug('save', 'Debounced save wrote full game state to localStorage.');
  } else {
    log.info('save', 'Manual save triggered by user.');
  }
}

export function debouncedSave(): void {
  if (saveTimeoutId) {
    clearTimeout(saveTimeoutId);
  }

  saveTimeoutId = setTimeout(() => {
    try {
      saveNow('debounced save');
    } catch (error) {
      log.error('save', `Failed to save full game state: ${String(error)}`);
    }
  }, 500);
}

export function manualSave(): void {
  try {
    saveNow('manual save');
  } catch (error) {
    log.error('save', `Failed to manual save: ${String(error)}`);
  }
}

export function loadGame(): void {
  try {
    saveStore.setStorageKey(SAVE_STORAGE_KEY);

    const loaded = saveStore.loadFromLocalStorage();

    if (!loaded) {
      const defaultState = buildDefaultPersistedState();
      applyPersistedState(defaultState);

      const ok = saveStore.saveToLocalStorage(
        {
          money: defaultState.money,
          world: defaultState.world,
          plots: defaultState.plots,
          engineering: defaultState.engineering,
          settings: defaultState.settings,
        },
        {
          navigation: defaultState.navigation,
        },
      );

      if (!ok) {
        log.warn('save', saveStore.current.lastError ?? 'No existing save found and default save could not be written.');
      }

      return;
    }

    applyPersistedState(loaded);

    log.info('load', `Full game state loaded from localStorage (${saveStore.current.lastSaveMetadata?.saveVersion ?? 'unknown version'}).`);
  } catch (error) {
    log.error('load', `Failed to load game state: ${String(error)}`);
  }
}

export async function resetProgress(): Promise<void> {
  try {
    log.warn('save', 'Reset progress initiated - clearing all data');

    if (saveTimeoutId) {
      clearTimeout(saveTimeoutId);
      saveTimeoutId = null;
    }

    saveStore.setStorageKey(SAVE_STORAGE_KEY);

    const cleared = saveStore.clearLocalStorageSave();
    if (!cleared) {
      throw new Error(saveStore.current.lastError ?? 'Failed to clear local save.');
    }

    const defaultState = buildDefaultPersistedState();
    applyPersistedState(defaultState);

    const ok = saveStore.saveToLocalStorage(
      {
        money: defaultState.money,
        world: defaultState.world,
        plots: defaultState.plots,
        engineering: defaultState.engineering,
        settings: defaultState.settings,
      },
      {
        navigation: defaultState.navigation,
      },
    );

    if (!ok) {
      throw new Error(saveStore.current.lastError ?? 'Failed to rewrite default save.');
    }

    log.info('save', 'Progress reset successfully');
    window.location.reload();
  } catch (error) {
    log.error('save', `Failed to reset progress: ${String(error)}`);
    throw error;
  }
}
