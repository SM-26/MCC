/**
 * Save/Load Logic for Mines & Choo-Choos
 *
 * Handles debounced autosave to localStorage and reset functionality.
 * All save events are logged via logger.ts for audit trail.
 */

import { gameState, navigation } from '../stores/index.svelte';
import { log } from '../lib/logger';
import type { GameState, SaveFile } from '../types';
import { getInitialState } from './stateFactory';
// import { generatePlot } from './mineGen';

import gitInfo from '../assets/git-info.txt?raw';
const [SAVE_COMMIT_HASH = ''] = gitInfo.trim().split('\n');

type PersistedGameState = GameState & {
  navigation: {
    activeTab: typeof navigation.activeTab;
  };
};

// Centralized Version Control
const SAVE_FILE_VERSION = '1.0.0';

// Debounce timer reference
let saveTimeoutId: ReturnType<typeof setTimeout> | null = null;

/**
 * Full game state save function (debounced)
 * Saves entire game state to localStorage after 500ms of inactivity
 */
export function debouncedSave(): void {
  if (saveTimeoutId) {
    clearTimeout(saveTimeoutId);
  }

  saveTimeoutId = setTimeout(() => {
    try {
      // OPTIMIZATION: Use snapshot to strip active proxies before building string
      const saveData = {
        meta: {
          saveVersion: SAVE_FILE_VERSION,
          saveCommitHash: SAVE_COMMIT_HASH,
          savedAt: Date.now(),
        },
        data: getSaveSnapshot(),
      };

      localStorage.setItem('mcc_save', JSON.stringify(saveData));

      log.debug('debounced save', `Full game state saved to localStorage (${Object.keys(saveData.data).join(', ')})`);
    } catch (error) {
      log.error('save', `Failed to save full game state: ${String(error)}`);
    }
  }, 500);
}

/**
 * Manual save function (immediate, no debounce)
 * Called when user clicks "Save Now" button
 */
export function manualSave(): void {
  try {
    const saveData = {
      meta: {
        saveVersion: SAVE_FILE_VERSION,
        saveCommitHash: SAVE_COMMIT_HASH,
        savedAt: Date.now(),
      },
      data: getSaveSnapshot(),
    };

    localStorage.setItem('mcc_save', JSON.stringify(saveData));
    log.info('Manual save', 'Manual save triggered by user');
  } catch (error) {
    log.error('save', `Failed to manual save: ${String(error)}`);
  }
}


function buildDefaultSaveFile(): SaveFile {
  const defaults = getInitialState();

  return {
    meta: {
      saveVersion: SAVE_FILE_VERSION,
      saveCommitHash: SAVE_COMMIT_HASH,
      savedAt: Date.now(),
    },
    data: {
      ...defaults,
      navigation: { activeTab: 'world' },
    },
  };
}

function applyGameState(state: GameState) {
  gameState.money = state.money;
  gameState.world = state.world;
  gameState.meta = state.meta;
  gameState.settings = state.settings;
}

function getSavedNavigationTab(parsed: SaveFile): typeof navigation.activeTab {
  return (
    (parsed as { data?: { navigation?: { activeTab?: typeof navigation.activeTab } } })?.data?.navigation
      ?.activeTab ?? 'world'
  );
}

function initializeDefaultSave() {
  const defaults = getInitialState();
  const saveData = buildDefaultSaveFile();

  localStorage.setItem('mcc_save', JSON.stringify(saveData));
  applyGameState(defaults);
  navigation.activeTab = 'world';
}

function applyLoadedSave(parsed: SaveFile, migratedData: PersistedGameState | Partial<PersistedGameState>) {
  const { navigation: _savedNavigation, ...gameData } = migratedData as Partial<PersistedGameState>;
  const mergedData = deepMerge(getInitialState(), gameData);

  applyGameState(mergedData);
  navigation.activeTab = getSavedNavigationTab(parsed);
}

/**
 * Load full game state from localStorage
 * Called on app initialization
 */
export function loadGame(): void {
  try {
    const saved = localStorage.getItem('mcc_save');

    if (!saved) {
      initializeDefaultSave();
      return;
    }

    const parsed = JSON.parse(saved) as SaveFile;
    const migratedData = normalizeSaveData(parsed);

    if (!migratedData) {
      return;
    }

    applyLoadedSave(parsed, migratedData);

    log.info('load', `Full game state loaded from localStorage (version ${parsed.meta.saveVersion})`);
  } catch (error) {
    log.error('load', `Failed to load game state: ${String(error)}`);
  }
}

/**
 * Reset progress with confirmation
 * Called after user confirms reset dialog
 */
export async function resetProgress(): Promise<void> {
  try {
    log.warn('save', 'Reset progress initiated - clearing all data');

    if (saveTimeoutId) {
      clearTimeout(saveTimeoutId);
    }

    localStorage.removeItem('mcc_save');
    localStorage.removeItem('mcc_settings');

    const defaults = getInitialState();

    // Force write clean defaults immediately to clear disk races
    const saveData: SaveFile = {
      meta: {
        saveVersion: SAVE_FILE_VERSION,
        saveCommitHash: SAVE_COMMIT_HASH,
        savedAt: Date.now(),
      },
      data: {
        ...defaults,
        navigation: { activeTab: 'world' },
      },
    };
    localStorage.setItem('mcc_save', JSON.stringify(saveData));

    gameState.money = defaults.money;
    gameState.world = defaults.world;
    gameState.meta = defaults.meta;
    gameState.settings = defaults.settings;
    navigation.activeTab = 'world';

    log.info('save', 'Progress reset successfully');
    window.location.reload();
  } catch (error) {
    log.error('save', `Failed to reset progress: ${String(error)}`);
    throw error;
  }
}

/**
 * Safely extracts raw, unproxied data snapshots for saving or cross-process parsing.
 */
export function getSaveSnapshot() {
  return {
    money: gameState.money,
    world: $state.snapshot(gameState.world),
    meta: $state.snapshot(gameState.meta),
    settings: $state.snapshot(gameState.settings),
    navigation: {
      activeTab: navigation.activeTab,
    },
  };
}

/**
 * Simple recursive deep merge to safely fill in missing nested properties
 * when loading older save configurations.
 */
function deepMerge<T>(target: T, source: Partial<T> | undefined): T {
  if (!source) {
    return target;
  }

  for (const key of Object.keys(target as object) as Array<keyof T>) {
    const targetValue = target[key];
    const sourceValue = source[key];

    if (Array.isArray(targetValue)) {
      if (Array.isArray(sourceValue)) {
        target[key] = sourceValue as T[keyof T];
      }
    } else if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
      deepMerge(targetValue as Record<string, unknown>, sourceValue as Partial<Record<string, unknown>>);
    } else if (sourceValue !== undefined) {
      target[key] = sourceValue as T[keyof T];
    }
  }

  return target;
}
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Migrates old save file schemas to match the current game version.
 */
function normalizeSaveData(parsed: unknown): Partial<PersistedGameState> | null {
  const defaults = getInitialState();

  const writeDefaults = (): PersistedGameState => {
    const saveData: SaveFile = {
      meta: {
        saveVersion: SAVE_FILE_VERSION,
        saveCommitHash: SAVE_COMMIT_HASH,
        savedAt: Date.now(),
      },
      data: {
        ...defaults,
        navigation: { activeTab: 'world' },
      },
    };

    localStorage.setItem('mcc_save', JSON.stringify(saveData));
    return saveData.data;
  };
  if (!isRecord(parsed)) {
    log.warn('save', 'Save file is not a valid object. Resetting to defaults.');
    return writeDefaults();
  }

  if (!('meta' in parsed) || !isRecord(parsed.meta)) {
    log.warn('save', 'Save file missing metadata. Resetting to defaults.');
    return writeDefaults();
  }

  if (!('data' in parsed) || !isRecord(parsed.data)) {
    log.warn('save', 'Save file missing data payload. Resetting to defaults.');
    return writeDefaults();
  }

  if (parsed.meta.saveVersion !== SAVE_FILE_VERSION) {
    log.warn('save', 'Old save version detected during pre-alpha. Wiping state to prevent crash.');
    return writeDefaults();
  }

  return parsed.data as Partial<PersistedGameState>;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
