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

// Debounce timer reference
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

/**
 * Builds a fresh default persisted state snapshot.
 *
 * @returns A brand-new persisted state with default game data and default navigation.
 */
function buildDefaultPersistedState(): PersistedGameState {
  const defaults = getInitialState();

  return {
    ...defaults,
    navigation: getInitialNavigationState(),
  };
}

/**
 * Applies a full GameState object to live stores.
 *
 * Side effects:
 * - mutates live app and feature stores
 *
 * @param state Full game state to assign into the live stores.
 */
function applyGameState(state: GameState): void {
  gameState.setMoney(state.money);
  gameState.updateSettings(state.settings);

  worldStore.replace(state.world);
  engineeringStore.replace(state.engineering);

  const firstPlot = state.plots[0]; // this line is the current compromise: If we later move to a true multi-plot runtime store, this file should switch to that.
  if (firstPlot) {
    mineStore.replace(firstPlot);
  } else {
    mineStore.reset();
  }
}

/**
 * Applies a persisted state snapshot to live stores.
 *
 * Side effects:
 * - mutates live app and feature stores
 *
 * @param state Fully resolved persisted state to assign into live state.
 */
function applyPersistedState(state: PersistedGameState): void {
  applyGameState(state);
  navigation.setActiveTab(state.navigation.activeTab);
}

/**
 * Creates a raw, serializable snapshot of current live state.
 *
 * @returns Serializable persisted state snapshot.
 */
export function getSaveSnapshot(): PersistedGameState {
  return {
    ...buildGameStateSnapshot(),
    navigation: {
      activeTab: navigation.current.activeTab,
    },
  };
}

/**
 * Persists the current live state immediately.
 *
 * Side effects:
 * - reads from stores
 * - writes to localStorage
 * - logs success or failure
 */
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

/**
 * Full game state save function (debounced).
 *
 * Saves the full current state to localStorage after 500ms of inactivity.
 */
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

/**
 * Manual save function (immediate, no debounce).
 */
export function manualSave(): void {
  try {
    saveNow('manual save');
  } catch (error) {
    log.error('save', `Failed to manual save: ${String(error)}`);
  }
}

/**
 * Load full game state from localStorage.
 *
 * Called on app initialization.
 *
 * Behavior:
 * - if no save exists, applies defaults and writes them
 * - if save is invalid, resets to defaults
 * - if save is valid, applies the loaded persisted state
 */
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

/**
 * Reset progress with confirmation.
 *
 * Reset policy:
 * - cancel pending autosave
 * - clear persisted save
 * - apply fresh defaults
 * - write fresh defaults
 * - reload the page
 */
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
