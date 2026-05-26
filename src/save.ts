/**
 * ============================================================================
 * Merge & Choo-Choo - Save Slice
 * ============================================================================
 * Local persistence, serialization, migration, compatibility handling.
 * Versioned schema with graceful degradation for corrupted saves.
 * ============================================================================
 */

import { AppState } from '@/types/game';

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
    mines: {
      activePlot: 0,
      maxUnlockedPlot: 0,
      plots: [],
      selectedMiner: null,
      draggedMiner: null,
      lastTick: Date.now()
    }
  };
}

/**
 * Initialize Save Slice
 * Hydrates the master appState in place and sets up the auto-save cadence.
 */
export async function initSaveSlice(appState: AppState): Promise<void> {
  console.log('[Save] Initializing save slice...');

  try {
    const data = localStorage.getItem('mcc_save');

    if (data) {
      const parsed = JSON.parse(data);

      if (parsed.version === 1 && parsed.data) {
        // Hydrate top-level primitives safely
        appState.currentTab = parsed.data.currentTab ?? appState.currentTab;
        appState.devMode = parsed.data.devMode ?? appState.devMode;
        appState.navPosition = parsed.data.navPosition ?? appState.navPosition;
        appState.money = parsed.data.money ?? appState.money;

        // Safely deep merge the nested mines structure
        if (parsed.data.mines) {
          appState.mines = {
            activePlot: parsed.data.mines.activePlot ?? 0,
            maxUnlockedPlot: parsed.data.mines.maxUnlockedPlot ?? 0,
            plots: parsed.data.mines.plots ?? [],
            selectedMiner: null, // Reset transient UI states on load
            draggedMiner: null,
            lastTick: parsed.data.mines.lastTick ?? Date.now()
          };
        }

        console.log('[Save] State loaded and hydrated successfully');
      } else {
        console.warn('[Save] Unknown or corrupt save version. Falling back to defaults.');
      }
    } else {
      console.log('[Save] No save data found. Using baseline application defaults.');
    }
  } catch (error) {
    console.error('[Save] Failed to initialize save data:', error);
  }

  // Arm the global background auto-save interval loop (Every 10 seconds)
  setInterval(() => {
    saveGameState(appState);
  }, 10000);
}

/**
 * Save game state to localStorage
 * * @param appState - The current application state to persist
 * @returns Promise that resolves when save is complete
 */
export async function saveGameState(appState: AppState): Promise<void> {
  try {
    const stateData = JSON.stringify({
      version: 1,
      timestamp: Date.now(),
      data: {
        currentTab: appState.currentTab,
        devMode: appState.devMode,
        navPosition: appState.navPosition,
        money: appState.money,
        mines: {
          activePlot: appState.mines?.activePlot,
          maxUnlockedPlot: appState.mines?.maxUnlockedPlot,
          plots: appState.mines?.plots,
          lastTick: appState.mines?.lastTick
        }
      },
    });

    localStorage.setItem('mcc_save', stateData);
    console.log('[Save] State auto-saved successfully');
  } catch (error) {
    console.error('[Save] Failed to save state:', error);
    throw error;
  }
}

/**
 * Reset save data (clear localStorage)
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