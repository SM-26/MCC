/**
 * Save/Load Logic for Mines & Choo-Choos
 *
 * Handles debounced autosave to localStorage and reset functionality.
 * All save events are logged via logger.ts for audit trail.
 */

import { gameState } from '../stores/index.svelte';
import { log } from '../lib/logger';

// Centralized Version Control
const SAVE_FILE_VERSION = '1.0.0';

// Debounce timer reference
let saveTimeoutId: ReturnType<typeof setTimeout> | null = null;

/**
 * Returns a fresh deep copy of the base game configuration.
 * Used for both structural merging during loads and complete data resets.
 */
function getInitialState() {
    return {
        money: 75,
        mines: {
            activePlot: 0,
            plots: [],
            selectedMiner: null,
            draggedMiner: null,
            lastTick: 0,
        },
        meta: {
            engineeringIdeas: 0,
            resetCount: 0,
            MaxnorthExpansions: 1,
            MaxundergroundLevels: 0,
        },
        settings: {
            navbarPosition: 'top' as const,
            devMode: false,
            soundEnabled: false,
            notificationsEnabled: true,
            appVersion: '0.0.0',
            commitHash: 'abc#123',
            theme: 'dark' as const,
            worldSeed: '123456',
        }
    };
}

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
                version: SAVE_FILE_VERSION,
                timestamp: Date.now(),
                data: getSaveSnapshot(),
            };

            localStorage.setItem('mcc_save', JSON.stringify(saveData));

            log.info(
                'debounced save',
                `Full game state saved to localStorage (${Object.keys(saveData.data).join(', ')})`,
            );
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
            version: SAVE_FILE_VERSION,
            timestamp: Date.now(),
            data: getSaveSnapshot(),
        };

        localStorage.setItem('mcc_save', JSON.stringify(saveData));
        log.info('Manual save', 'Manual save triggered by user');
    } catch (error) {
        log.error('save', `Failed to manual save: ${String(error)}`);
    }
}

/**
 * Load full game state from localStorage
 * Called on app initialization
 */
export function loadGame(): void {
    try {
        const saved = localStorage.getItem('mcc_save');

        if (!saved) {
            log.debug('load', 'No saved game found, using default state');
            // 1. Get our baseline defaults
            const defaults = getInitialState();

            // 2. Commit them to localStorage immediately
            const saveData = {
                version: SAVE_FILE_VERSION,
                timestamp: Date.now(),
                data: defaults,
            };
            localStorage.setItem('mcc_save', JSON.stringify(saveData));
            return;
        }

        const parsed = JSON.parse(saved);

        if (!parsed.version || !parsed.data) {
            log.error('load', `Invalid save file: missing version (${parsed?.version}) or data fields`);
            return;
        }

        // 1. Process migrations if versions mismatch
        const secureData = migrateSaveData(parsed);
        if (!secureData) return; // Exit if migration handled hard reload

        // 2. Fetch a fresh, clean default state instance
        const defaults = getInitialState();

        // 3. Deeply merge historical save with modern default structures
        const finalState = deepMerge(defaults, secureData);

        // 4. Update the reactive proxy state tree
        gameState.money = finalState.money;
        gameState.mines = finalState.mines;
        gameState.meta = finalState.meta;
        gameState.settings = finalState.settings;

        log.info(
            'load',
            `Full game state loaded from localStorage (version ${parsed.version}, timestamp ${parsed.timestamp})`,
        );
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
        const saveData = {
            version: SAVE_FILE_VERSION,
            timestamp: Date.now(),
            data: defaults,
        };
        localStorage.setItem('mcc_save', JSON.stringify(saveData));

        gameState.money = defaults.money;
        gameState.mines = defaults.mines;
        gameState.meta = defaults.meta;
        gameState.settings = defaults.settings;

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
        mines: $state.snapshot(gameState.mines),
        meta: $state.snapshot(gameState.meta),
        settings: $state.snapshot(gameState.settings)
    };
}

/**
 * Simple recursive deep merge to safely fill in missing nested properties 
 * when loading older save configurations.
 */
function deepMerge(target: any, source: any): any {
    if (!source) return target;
    for (const key of Object.keys(target)) {
        if (target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
            if (source[key]) {
                deepMerge(target[key], source[key]);
            }
        } else if (source[key] !== undefined) {
            target[key] = source[key];
        }
    }
    return target;
}

/**
 * Migrates old save file schemas to match the current game version.
 */
function migrateSaveData(parsed: any): any {
    if (parsed.version !== SAVE_FILE_VERSION) {
        log.warn('save', 'Old save version detected during pre-alpha. Wiping state to prevent crash.');
        localStorage.removeItem('mcc_save');
        window.location.reload();
        return null; // Return null so loading execution thread halts during refresh
    }
    return parsed.data;
}