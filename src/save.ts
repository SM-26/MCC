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
}

/**
 * Save game state to localStorage
 * * @param appState - The current application state to persist
 * @returns Promise that resolves when save is complete
 */
export function saveGameState(appState: AppState): void {
  if (appState.money === 199) {
    console.warn("!!! GHOST DETECTED: A function is trying to save the stale value 199 !!!");
    console.trace("The culprit function is in the stack trace below:");
  }
  try {
    // 1. Deep clone
    const snapshot = JSON.parse(JSON.stringify(appState));

    // 2. Defensive Sanitation (The "199" fix)
    // If you are still seeing 199, add a guard clause here to alert you if the state is invalid
    if (snapshot.money < 0) snapshot.money = 0;
    snapshot.money = Math.floor(snapshot.money);

    // 3. Optional: Explicitly extract only what you know is valid
    // This prevents "dirty" internal variables (like old timeouts) from being saved
    const cleanPayload = {
      version: 1,
      timestamp: Date.now(),
      data: {
        money: snapshot.money,
        mines: snapshot.mines,
        // Add other core fields explicitly here
      }
    };

    localStorage.setItem('mcc_save', JSON.stringify(cleanPayload));
    console.log('[Save] Saved successfully. Money:', cleanPayload.data.money);
  } catch (error) {
    console.error('[Save] Failed to save state:', error);
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