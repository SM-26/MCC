// src/logic/save/save.svelte.ts

import appVersion from '../../assets/version.txt?raw';
import gitInfo from '../../assets/git-info.txt?raw';
import { log } from '../../lib/logger';
import { gameState } from '../app/gameState.svelte';
import { navigation } from '../app/navigationStore.svelte';
import { createDefaultNavigationState } from '../app/navigationTypes';
import { getInitialState } from '../stateFactory';
import { mineStore } from '../mine/mineStore.svelte';
import { worldStore } from '../world/worldStore.svelte';
import { saveStore } from './saveStore.svelte';
import type { GameState, PersistedGameState } from './saveTypes';

const SAVE_STORAGE_KEY = 'mcc_save';
const SAVE_VERSION = appVersion.trim();
const [commitHash = 'dev'] = gitInfo.trim().split('\n');

let saveTimeoutId: ReturnType<typeof setTimeout> | null = null;

function getPlotIdForCell(cell: { type: string; id: string | number } | undefined): string | null {
  if (!cell) return null;
  return `${cell.type}-${cell.id}`;
}

function getPersistedSnapshot(): PersistedGameState {
  const defaults = getInitialState();

  return {
    ...defaults,
    money: gameState.current.money,
    settings: $state.snapshot(gameState.current.settings),
    world: $state.snapshot(worldStore.current),
    plots: $state.snapshot(mineStore.current ? [mineStore.current] : []),
    engineering: $state.snapshot(defaults.engineering),
    navigation: $state.snapshot(navigation.current),
  };
}

function applyDefaultState(): void {
  const defaults = getInitialState();

  gameState.setMoney(defaults.money);
  gameState.updateSettings(defaults.settings);
  worldStore.replace(defaults.world);
  if (defaults.plots[0]) {
    mineStore.replace(defaults.plots[0]);
  }
  navigation.replace(createDefaultNavigationState());
}

function applyLoadedState(snapshot: PersistedGameState): void {
  gameState.setMoney(snapshot.money);
  gameState.updateSettings(snapshot.settings);
  worldStore.replace(snapshot.world);

  if (snapshot.plots.length > 0) {
    const world = snapshot.world;
    const activeIndex = world.activePlotIndex;
    const activeCell = world.cells[activeIndex];
    const activePlotId = getPlotIdForCell(activeCell);

    const activePlot =
      (activeIndex >= 0 && activeIndex < snapshot.plots.length ? snapshot.plots[activeIndex] : null) ??
      snapshot.plots.find((plot) => plot.plotId === activePlotId) ??
      snapshot.plots[0] ??
      null;

    if (activePlot) {
      mineStore.replace(activePlot);
    }
  }

  navigation.replace(snapshot.navigation);
}

function persistSnapshot(snapshot: PersistedGameState): boolean {
  const gameStateData: GameState = {
    money: snapshot.money,
    world: snapshot.world,
    plots: snapshot.plots,
    engineering: snapshot.engineering,
    settings: snapshot.settings,
  };

  return saveStore.saveToLocalStorage(gameStateData, {
    navigation: snapshot.navigation,
    saveVersion: SAVE_VERSION,
    saveCommitHash: commitHash,
  });
}

function saveSnapshotNow(reason: string): void {
  try {
    const snapshot = getPersistedSnapshot();
    log.debug(
      'save',
      `${reason}: activeTab=${snapshot.navigation.activeTab}, defaultView=${snapshot.settings.defaultView}, navbarPosition=${snapshot.settings.navbarPosition}`,
    );

    const ok = persistSnapshot(snapshot);

    if (!ok) {
      log.error('save', saveStore.current.lastError ?? 'Failed to save.');
    }
  } catch (error) {
    log.error('save', `Failed to save game state: ${String(error)}`);
  }
}

export function debouncedSave(): void {
  if (saveTimeoutId) {
    clearTimeout(saveTimeoutId);
  }

  saveTimeoutId = setTimeout(() => {
    saveTimeoutId = null;
    saveSnapshotNow('autosave');
  }, 500);
}

export function manualSave(): void {
  saveSnapshotNow('manual save');
  if (!saveStore.current.lastError) {
    log.info('save', 'Manual save wrote full game state to localStorage.');
  }
}

export function loadGame(): void {
  try {
    saveStore.setStorageKey(SAVE_STORAGE_KEY);

    const loaded = saveStore.loadFromLocalStorage();
    log.debug('load', `loadFromLocalStorage -> ${loaded ? loaded.navigation.activeTab : 'null'}`);

    if (!loaded) {
      applyDefaultState();

      const snapshot = getPersistedSnapshot();
      persistSnapshot(snapshot);

      log.info('load', 'No save found, created default game state.');
      return;
    }

    applyLoadedState(loaded);
    log.debug(
      'load',
      `applied loaded state: defaultView=${loaded.settings.defaultView}, activeTab=${loaded.navigation.activeTab}, navbarPosition=${loaded.settings.navbarPosition}`,
    );

    if (loaded.settings.defaultView === 'world') {
      navigation.setActiveTab('world');
      log.debug('load', 'startup forced activeTab=world because defaultView=world');
    } else {
      navigation.setActiveTab(loaded.navigation.activeTab);
      log.debug('load', `startup restored activeTab=${loaded.navigation.activeTab} because defaultView=last-active`);
    }

    log.info('load', 'Game state loaded from localStorage.');
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
    saveStore.clearLocalStorageSave();

    applyDefaultState();

    const snapshot = getPersistedSnapshot();
    persistSnapshot(snapshot);

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
