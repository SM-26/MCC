/**
 * Save/Load Logic for Mines & Choo-Choos
 *
 * Handles local persistence of the game state in localStorage, including:
 * - debounced autosave
 * - manual save
 * - initial load
 * - invalid-save recovery
 * - reset to defaults
 *
 * Persistence policy:
 * - Save files are versioned.
 * - Version mismatches are wiped during pre-alpha.
 * - Save validation is structural plus a few critical field checks.
 * - Recovery writes are performed by orchestration functions, not validators.
 * - Arrays are replaced during merge; they are not merged item-by-item.
 * - Unknown keys from saved data are ignored when merging into defaults.
 */

import { gameState, navigation } from '../stores/index.svelte';
import { log } from '../lib/logger';
import type { GameState, SaveFile } from '../types';
import { getInitialState } from './stateFactory';
import gitInfo from '../assets/git-info.txt?raw';

const [SAVE_COMMIT_HASH = ''] = gitInfo.trim().split('\n');

type PersistedGameState = GameState & {
  navigation: {
    activeTab: typeof navigation.activeTab;
  };
};

type SaveValidationSuccess = {
  ok: true;
  data: Partial<PersistedGameState>;
};

type SaveValidationFailureReason = 'invalid-json' | 'invalid-root' | 'missing-meta' | 'missing-data' | 'version-mismatch' | 'invalid-navigation-tab';

type SaveValidationFailure = {
  ok: false;
  reason: SaveValidationFailureReason;
  logMessage: string;
};

type SaveValidationResult = SaveValidationSuccess | SaveValidationFailure;

// Centralized Version Control
const SAVE_FILE_VERSION = '1.0.0';

// Debounce timer reference
let saveTimeoutId: ReturnType<typeof setTimeout> | null = null;

/**
 * Builds a fully versioned save envelope from persisted game data.
 *
 * @param data Persisted game snapshot to wrap with save metadata.
 * @returns A save file ready to serialize into localStorage.
 */
function buildSaveFile(data: PersistedGameState): SaveFile {
  return {
    meta: {
      saveVersion: SAVE_FILE_VERSION,
      saveCommitHash: SAVE_COMMIT_HASH,
      savedAt: Date.now(),
    },
    data,
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
    navigation: {
      activeTab: 'world',
    },
  };
}

/**
 * Builds a default save file from fresh initial state.
 *
 * @returns A valid default save file for recovery or first-run initialization.
 */
function buildDefaultSaveFile(): SaveFile {
  return buildSaveFile(buildDefaultPersistedState());
}

/**
 * Writes a save file to localStorage.
 *
 * Side effects:
 * - mutates browser localStorage
 *
 * @param saveFile The save file to serialize and persist.
 */
function writeSaveFile(saveFile: SaveFile): void {
  localStorage.setItem('mcc_save', JSON.stringify(saveFile));
}

/**
 * Applies the live game-state fields from a complete GameState object.
 *
 * Side effects:
 * - mutates the exported gameState store
 *
 * @param state Full game state to assign into the live store.
 */
function applyGameState(state: GameState): void {
  gameState.money = state.money;
  gameState.world = state.world;
  gameState.meta = state.meta;
  gameState.settings = state.settings;
}

/**
 * Applies a navigation tab value to the live navigation store.
 *
 * Side effects:
 * - mutates the exported navigation store
 *
 * @param activeTab Active tab to assign.
 */
function applyNavigationState(activeTab: typeof navigation.activeTab): void {
  navigation.activeTab = activeTab;
}

/**
 * Applies a fully merged persisted state to the live stores.
 *
 * Side effects:
 * - mutates the exported gameState store
 * - mutates the exported navigation store
 *
 * @param state Fully resolved persisted state to assign into live state.
 */
function applyPersistedState(state: PersistedGameState): void {
  applyGameState(state);
  applyNavigationState(state.navigation.activeTab);
}

/**
 * Creates a raw, serializable snapshot of the current live state.
 *
 * This strips Svelte state proxies where needed so the result can be safely
 * stringified and persisted.
 *
 * @returns Serializable persisted state snapshot.
 */
export function getSaveSnapshot(): PersistedGameState {
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
 * Persists the current live state immediately.
 *
 * Side effects:
 * - reads from gameState and navigation
 * - writes to localStorage
 * - logs success or failure
 */
function saveNow(logContext: 'debounced save' | 'Manual save'): void {
  const saveData = buildSaveFile(getSaveSnapshot());

  writeSaveFile(saveData);

  if (logContext === 'debounced save') {
    log.debug('debounced save', `Full game state saved to localStorage (${Object.keys(saveData.data).join(', ')})`);
  } else {
    log.info('Manual save', 'Manual save triggered by user');
  }
}

/**
 * Full game state save function (debounced).
 *
 * Saves the full current state to localStorage after 500ms of inactivity.
 *
 * Side effects:
 * - clears and recreates an internal timeout
 * - eventually writes to localStorage
 * - logs save success or failure
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
 *
 * Side effects:
 * - writes to localStorage
 * - logs save success or failure
 */
export function manualSave(): void {
  try {
    saveNow('Manual save');
  } catch (error) {
    log.error('save', `Failed to manual save: ${String(error)}`);
  }
}

/**
 * Reads the raw save string from localStorage.
 *
 * @returns The raw save JSON string, or null if no save exists.
 */
function readRawSave(): string | null {
  return localStorage.getItem('mcc_save');
}

/**
 * Parses a raw save string into an unknown value.
 *
 * @param raw Raw JSON text from localStorage.
 * @returns Parsed unknown value.
 * @throws If JSON parsing fails.
 */
function parseRawSave(raw: string): unknown {
  return JSON.parse(raw);
}

/**
 * Returns whether a value is a plain record-like object.
 *
 * @param value Value to inspect.
 * @returns True if the value is a non-null non-array object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Returns whether a candidate active tab is structurally valid.
 *
 * Validation is intentionally light-weight for now and only checks that the
 * value is a non-empty string.
 *
 * @param value Candidate tab value.
 * @returns True if the tab is acceptable for persisted recovery.
 */
function isValidActiveTab(value: unknown): value is typeof navigation.activeTab {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Validates parsed save data and returns a recovery-friendly verdict.
 *
 * This function does not write to localStorage. It only inspects the parsed
 * value and reports whether load should proceed or recover to defaults.
 *
 * Validation policy in this pass:
 * - root must be an object
 * - meta must exist and be an object
 * - data must exist and be an object
 * - save version must match exactly
 * - navigation.activeTab, if present, must be a valid non-empty string
 *
 * @param parsed Parsed unknown value from storage.
 * @returns A success result with partial persisted data, or a failure verdict.
 */
function validateSaveData(parsed: unknown): SaveValidationResult {
  if (!isRecord(parsed)) {
    return {
      ok: false,
      reason: 'invalid-root',
      logMessage: 'Save file is not a valid object. Resetting to defaults.',
    };
  }

  if (!('meta' in parsed) || !isRecord(parsed.meta)) {
    return {
      ok: false,
      reason: 'missing-meta',
      logMessage: 'Save file missing metadata. Resetting to defaults.',
    };
  }

  if (!('data' in parsed) || !isRecord(parsed.data)) {
    return {
      ok: false,
      reason: 'missing-data',
      logMessage: 'Save file missing data payload. Resetting to defaults.',
    };
  }

  if (parsed.meta.saveVersion !== SAVE_FILE_VERSION) {
    return {
      ok: false,
      reason: 'version-mismatch',
      logMessage: 'Old save version detected during pre-alpha. Wiping state to prevent crash.',
    };
  }

  const navigationCandidate = parsed.data.navigation;
  if (navigationCandidate !== undefined && (!isRecord(navigationCandidate) || !isValidActiveTab(navigationCandidate.activeTab))) {
    return {
      ok: false,
      reason: 'invalid-navigation-tab',
      logMessage: 'Save file has invalid navigation state. Resetting to defaults.',
    };
  }

  return {
    ok: true,
    data: parsed.data as Partial<PersistedGameState>,
  };
}

/**
 * Extracts a parsed SaveFile object after validation has already succeeded.
 *
 * This helper exists to keep orchestration code simple after validation has
 * confirmed the expected structure.
 *
 * @param parsed Parsed unknown value that already passed validateSaveData.
 * @returns Parsed save file with trusted top-level shape.
 */
function asValidatedSaveFile(parsed: unknown): SaveFile {
  return parsed as SaveFile;
}

/**
 * Replaces invalid or missing persisted data with a fresh default save.
 *
 * Side effects:
 * - writes defaults to localStorage
 *
 * @returns Fresh default persisted state.
 */
function recoverWithDefaultSave(): PersistedGameState {
  const defaultSave = buildDefaultSaveFile();
  writeSaveFile(defaultSave);
  return defaultSave.data;
}

/**
 * Initializes first-run state when no save exists yet.
 *
 * Side effects:
 * - writes defaults to localStorage
 * - mutates gameState
 * - mutates navigation
 */
function initializeDefaultSave(): void {
  const defaultState = recoverWithDefaultSave();
  applyPersistedState(defaultState);
}

/**
 * Deeply merges source values into a fresh target defaults object.
 *
 * Merge policy:
 * - Only keys already present on the target are considered.
 * - Plain objects merge recursively.
 * - Arrays are replaced wholesale, not merged by index.
 * - Source values of undefined do not overwrite target values.
 * - Unknown source keys are ignored.
 *
 * Mutation policy:
 * - This function mutates the provided target object in place.
 * - Callers should pass a fresh object when they want an isolated result.
 *
 * @param target Fresh defaults object that will be mutated and returned.
 * @param source Partial persisted override data.
 * @returns The mutated target containing merged values.
 */
function deepMergeIntoDefaults<T>(target: T, source: Partial<T> | undefined): T {
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
      continue;
    }

    if (isRecord(targetValue) && isRecord(sourceValue)) {
      deepMergeIntoDefaults(targetValue as Record<string, unknown>, sourceValue as Partial<Record<string, unknown>>);
      continue;
    }

    if (sourceValue !== undefined) {
      target[key] = sourceValue as T[keyof T];
    }
  }

  return target;
}

/**
 * Merges validated persisted data into a fresh default persisted state.
 *
 * This applies the project merge policy:
 * - objects merge recursively
 * - arrays replace
 * - unknown keys drop
 *
 * @param persistedData Validated partial persisted data from storage.
 * @returns Fully resolved persisted state ready for application to live stores.
 */
function mergePersistedState(persistedData: Partial<PersistedGameState>): PersistedGameState {
  return deepMergeIntoDefaults(buildDefaultPersistedState(), persistedData);
}

/**
 * Loads a validated save into the live stores.
 *
 * Side effects:
 * - mutates gameState
 * - mutates navigation
 *
 * @param persistedData Validated partial persisted data from storage.
 */
function applyLoadedSave(persistedData: Partial<PersistedGameState>): void {
  const mergedData = mergePersistedState(persistedData);
  applyPersistedState(mergedData);
}

/**
 * Load full game state from localStorage.
 *
 * Called on app initialization.
 *
 * Behavior:
 * - if no save exists, writes defaults and applies them
 * - if JSON is malformed, recovers to defaults
 * - if save shape is invalid, recovers to defaults
 * - if save version mismatches, recovers to defaults
 * - if save is valid, merges it into fresh defaults and applies the result
 *
 * Side effects:
 * - reads from localStorage
 * - may write defaults to localStorage during recovery
 * - mutates gameState
 * - mutates navigation
 * - logs success, warnings, and failures
 */
export function loadGame(): void {
  try {
    const rawSave = readRawSave();

    if (!rawSave) {
      initializeDefaultSave();
      return;
    }

    let parsed: unknown;

    try {
      parsed = parseRawSave(rawSave);
    } catch {
      log.warn('save', 'Save file contains invalid JSON. Resetting to defaults.');
      const recoveredState = recoverWithDefaultSave();
      applyPersistedState(recoveredState);
      return;
    }

    const validation = validateSaveData(parsed);

    if (!validation.ok) {
      log.warn('save', validation.logMessage);
      const recoveredState = recoverWithDefaultSave();
      applyPersistedState(recoveredState);
      return;
    }

    const validatedSaveFile = asValidatedSaveFile(parsed);
    applyLoadedSave(validation.data);

    log.info('load', `Full game state loaded from localStorage (version ${validatedSaveFile.meta.saveVersion})`);
  } catch (error) {
    log.error('load', `Failed to load game state: ${String(error)}`);
  }
}

/**
 * Reset progress with confirmation.
 *
 * Called after user confirms the reset dialog.
 *
 * Reset policy:
 * - cancel pending autosave
 * - clear persisted save keys
 * - immediately write a fresh default save
 * - apply defaults to live stores
 * - reload the page
 *
 * Side effects:
 * - clears timeout state
 * - removes and writes localStorage keys
 * - mutates gameState
 * - mutates navigation
 * - reloads the page
 *
 * @throws Rethrows any unexpected reset failure after logging it.
 */
export async function resetProgress(): Promise<void> {
  try {
    log.warn('save', 'Reset progress initiated - clearing all data');

    if (saveTimeoutId) {
      clearTimeout(saveTimeoutId);
      saveTimeoutId = null;
    }

    localStorage.removeItem('mcc_save');
    localStorage.removeItem('mcc_settings');

    const defaultState = recoverWithDefaultSave();
    applyPersistedState(defaultState);

    log.info('save', 'Progress reset successfully');
    window.location.reload();
  } catch (error) {
    log.error('save', `Failed to reset progress: ${String(error)}`);
    throw error;
  }
}
