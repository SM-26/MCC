// src/logic/save/save.svelte.ts

import appVersion from '../../assets/version.txt?raw';
import gitInfo from '../../assets/git-info.txt?raw';
import { log } from '../../lib/logger';
import { gameState } from '../app/gameState.svelte';
import { navigation } from '../app/navigationStore.svelte';
import { createDefaultNavigationState } from '../app/navigationTypes';
import { getInitialState } from '../stateFactory';
import { isPlotBuilt } from '../mine/mineTypes';
import { plotsStore } from '../mine/plotsStore.svelte';
import { worldStore } from '../world/worldStore.svelte';
import { runTrainCompletion } from '../trainRuntime';
import { saveStore } from './saveStore.svelte';
import type { GameState, PersistedGameState } from './saveTypes';

const SAVE_STORAGE_KEY = 'mcc_save';
const SAVE_VERSION = appVersion.trim();
const [commitHash = 'dev'] = gitInfo.trim().split('\n');

let saveTimeoutId: ReturnType<typeof setTimeout> | null = null;

function getPersistedSnapshot(): PersistedGameState {
  const defaults = getInitialState();
  const world = $state.snapshot(worldStore.current);
  world.plots = plotsStore.snapshot();
  world.inspectedCellId = null; // session-only; must not be persisted
  return {
    ...defaults,
    money: gameState.current.money,
    settings: $state.snapshot(gameState.current.settings),
    world,
    engineering: $state.snapshot(defaults.engineering),
    navigation: $state.snapshot(navigation.current),
  };
}

export function getSaveSnapshot(): PersistedGameState {
  return getPersistedSnapshot();
}

function applyDefaultState(): void {
  const defaults = getInitialState();

  gameState.setMoney(defaults.money);
  gameState.updateSettings(defaults.settings);
  worldStore.replace(defaults.world);
  plotsStore.replaceAll(defaults.world.plots);
  navigation.replace(createDefaultNavigationState());
}

function applyLoadedState(snapshot: PersistedGameState): void {
  gameState.setMoney(snapshot.money);
  gameState.updateSettings(snapshot.settings);
  worldStore.replace(snapshot.world);
  plotsStore.replaceAll(snapshot.world.plots ?? {});

  // Load guard: active plot must be a discovered, built plot cell; else fall back to home (0,0).
  const world = snapshot.world;
  const active = world.activePlotCellId;
  const cell = active ? world.cells.find((c) => c.id === active) : null;
  const plot = active ? (snapshot.world.plots?.[active] ?? null) : null;
  const valid = !!cell && cell.type === 'plot' && cell.discovered && !!plot && isPlotBuilt(plot);
  if (!valid) {
    const home = world.cells.find((c) => c.type === 'plot' && c.ring === 0)?.id ?? null;
    worldStore.setActivePlotCellId(home);
  }

  navigation.replace(snapshot.navigation);
}

function persistSnapshot(snapshot: PersistedGameState): boolean {
  const gameStateData: GameState = {
    money: snapshot.money,
    world: snapshot.world,
    engineering: snapshot.engineering,
    settings: snapshot.settings,
  };

  return saveStore.saveToLocalStorage(gameStateData, {
    navigation: snapshot.navigation,
    saveVersion: SAVE_VERSION,
    saveCommitHash: commitHash,
  });
}

function saveSnapshotNow(): boolean {
  try {
    const snapshot = getPersistedSnapshot();
    return persistSnapshot(snapshot);
  } catch (error) {
    log.error('save', `Failed to save game state: ${String(error)}`);
    return false;
  }
}

export function debouncedSave(): void {
  if (saveTimeoutId) {
    clearTimeout(saveTimeoutId);
  }

  saveTimeoutId = setTimeout(() => {
    saveTimeoutId = null;
    const ok = saveSnapshotNow();
    if (!ok) {
      log.error('save', `Failed to save full game state: Error: ${saveStore.current.lastError ?? 'unknown'}`);
    }
  }, 500);
}

export function manualSave(): void {
  const ok = saveSnapshotNow();
  if (ok) {
    log.info('save', 'Manual save triggered by user.');
  } else {
    log.error('save', `Failed to manual save: Error: ${saveStore.current.lastError ?? 'unknown'}`);
  }
}

export function loadGame(): void {
  try {
    saveStore.setStorageKey(SAVE_STORAGE_KEY);

    const loaded = saveStore.loadFromLocalStorage();
    log.debug('load', `loadFromLocalStorage -> ${loaded ? loaded.navigation.activeTab : 'null'}`);

    if (!loaded) {
      applyDefaultState();
      navigation.setActiveTab('world');

      const snapshot = getPersistedSnapshot();
      const ok = persistSnapshot(snapshot);
      if (!ok) {
        log.warn('save', saveStore.current.lastError ?? 'Failed to write default save.');
      }

      log.info('load', 'No save found, created default game state.');
      return;
    }

    applyLoadedState(loaded);

    // Offline catch-up: trips carry absolute timestamps, so one completion
    // pass over "now" resolves everything that finished while the app was closed.
    if (runTrainCompletion()) {
      debouncedSave();
      log.info('load', 'Completed train trips that finished while offline.');
    }

    if (loaded.settings.defaultView === 'world') {
      navigation.setActiveTab('world');
      log.debug('load', 'startup forced activeTab=world because defaultView=world');
    } else {
      navigation.setActiveTab(loaded.navigation.activeTab);
      log.debug('load', `startup restored activeTab=${loaded.navigation.activeTab} because defaultView=last-active`);
    }

    const version = saveStore.current.lastSaveMetadata?.saveVersion ?? 'unknown';
    log.info('load', `Full game state loaded from localStorage (${version}).`);
  } catch (error) {
    log.error('load', `Failed to load game state: ${String(error)}`);
    applyDefaultState();
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

    applyDefaultState();
    navigation.setActiveTab('world');

    const snapshot = getPersistedSnapshot();
    const ok = persistSnapshot(snapshot);
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

// Cleanup module-level timeout on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (saveTimeoutId) {
      clearTimeout(saveTimeoutId);
      saveTimeoutId = null;
    }
  });
}
