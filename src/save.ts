/**
 * ============================================================================
 * Merge & Choo-Choo - Save Slice
 * ============================================================================
 * Local persistence, serialization, migration, compatibility handling.
 * Versioned schema with graceful degradation for corrupted saves.
 * ============================================================================
 */

import { AppState } from '@/types/game';
import * as self from './save';

/**
 * Default empty state for recovery scenarios
 */
export function createDefaultState(): AppState {
  return {
    currentTab: 'world',
    devMode: false,
    version: null,
    commitHash: null,
    commitMessage: null,
    navPosition: 'top',

    // Core architectural system properties
    money: 75,
    worldSeed: 123456,
    mines: {
      activePlot: 0,
      maxUnlockedPlot: 0,
      plotid: 'A',
      plots: [],
      selectedMiner: null,
      draggedMiner: null,
      lastTick: Date.now()
    }
  };
}

/**
 * Initialize Save Slice
 * Hydrates the master appState in place.
 */
export async function initSaveSlice(appState: AppState): Promise<void> {
  console.log('[Save] Initializing save slice...');

  try {
    const data = localStorage.getItem('mcc_save');
    if (!data) {
      console.log('[Save] No save data found. Using baseline application defaults.');
      saveGameState(appState);
      return;
    }

    const parsed = JSON.parse(data);

    if (parsed.version === 1 && parsed.data) {
      const { data: d } = parsed;

      // Hydrate root primitives
      appState.currentTab = d.currentTab ?? appState.currentTab;
      appState.devMode = d.devMode ?? appState.devMode;
      appState.navPosition = d.navPosition ?? appState.navPosition;
      appState.money = d.money ?? appState.money;
      appState.worldSeed = d.worldSeed ?? appState.worldSeed;

      // Hydrate nested mines structure
      if (d.mines) {
        appState.mines = {
          activePlot: d.mines.activePlot ?? 0,
          maxUnlockedPlot: d.mines.maxUnlockedPlot ?? 0,
          plotid: d.mines.plotid,
          plots: d.mines.plots ?? [],
          selectedMiner: null, // Reset transient UI states
          draggedMiner: null,
          lastTick: d.mines.lastTick ?? Date.now()
        };
      }
      console.log('[Save] State loaded and hydrated successfully');
    } else {
      console.warn('[Save] Unknown or corrupt save version. Falling back to defaults.');
      saveGameState(appState); // Optionally save clean defaults if corrupt
    }
  } catch (error) {
    console.error('[Save] Failed to initialize save data:', error);
  }
}

/**
 * Save game state to localStorage
 */
export function saveGameState(appState: AppState): void {
  try {
    const cleanPayload = {
      version: 1,
      timestamp: Date.now(),
      data: {
        currentTab: appState.currentTab,
        devMode: appState.devMode,
        navPosition: appState.navPosition,
        money: Math.floor(appState.money),
        worldSeed: appState.worldSeed,
        mines: appState.mines
      }
    };

    localStorage.setItem('mcc_save', JSON.stringify(cleanPayload));
    console.log('[Save] Saved successfully. Seed:', cleanPayload.data.worldSeed);
  } catch (error) {
    console.error('[Save] Failed to save state:', error);
  }
}

/**
 * Reset save data
 */
export function resetSaveData(): void {
  try {
    localStorage.removeItem('mcc_save');
    console.log('[Save] Save data wiped from storage');
  } catch (error) {
    console.error('[Save] Failed to reset save data:', error);
  }
}

/**
 * Check if a valid save exists
 */
export function hasSave(): boolean {
  return !!localStorage.getItem('mcc_save');
}

/**
 * Triggers a full reset and reloads the app
 */
export function handleCorruptedSave(reason: string): void {
  console.error(`[Save] CRITICAL: Save corrupted. Reason: ${reason}`);
  resetSaveData();
  // In a real browser, this reloads the page.
  // In tests, this will throw a reference error, so we guard it. 
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}

/**
 * Validates the state object
 */
export function validateState(appState: AppState): boolean {
  if (appState.money < 0) {
    self.handleCorruptedSave('Negative balance');
    return false;
  }
  return true;
}