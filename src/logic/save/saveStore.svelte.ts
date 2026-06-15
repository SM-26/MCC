// src/logic/save/saveStore.svelte.ts

import type {
    GameState,
    PersistedGameState,
    SaveFile,
    SaveMetadata,
    SavedNavigation,
} from './saveTypes';

function createDefaultMetadata(): SaveMetadata {
    return {
        saveVersion: '0.0.0',
        saveCommitHash: 'dev',
        savedAt: 0,
    };
}

function createDefaultSavedNavigation(): SavedNavigation {
    return {
        activeTab: 'world',
    };
}

function cloneGameState(gameState: GameState): GameState {
    return structuredClone(gameState);
}

function clonePersistedGameState(gameState: PersistedGameState): PersistedGameState {
    return structuredClone(gameState);
}

function safeParseSaveFile(json: string): SaveFile | null {
    try {
        return JSON.parse(json) as SaveFile;
    } catch {
        return null;
    }
}

export function createSaveStore() {
    const state = $state<{
        lastSaveMetadata: SaveMetadata | null;
        lastLoadedAt: number | null;
        lastSavedAt: number | null;
        lastError: string | null;
        storageKey: string;
    }>({
        lastSaveMetadata: null,
        lastLoadedAt: null,
        lastSavedAt: null,
        lastError: null,
        storageKey: 'mccV2-save',
    });

    return {
        get current() {
            return state;
        },

        clearError() {
            state.lastError = null;
        },

        setStorageKey(storageKey: string) {
            state.storageKey = storageKey;
        },

        buildPersistedGameState(
            gameState: GameState,
            navigation?: Partial<SavedNavigation>,
        ): PersistedGameState {
            return {
                ...cloneGameState(gameState),
                navigation: {
                    ...createDefaultSavedNavigation(),
                    ...navigation,
                },
            };
        },

        buildSaveFile(
            gameState: GameState,
            options?: {
                navigation?: Partial<SavedNavigation>;
                saveVersion?: string;
                saveCommitHash?: string;
                savedAt?: number;
            },
        ): SaveFile {
            const savedAt = options?.savedAt ?? Date.now();

            return {
                meta: {
                    saveVersion: options?.saveVersion ?? '0.0.0',
                    saveCommitHash: options?.saveCommitHash ?? 'dev',
                    savedAt,
                },
                data: this.buildPersistedGameState(gameState, options?.navigation),
            };
        },

        serializeSaveFile(saveFile: SaveFile): string {
            return JSON.stringify(saveFile, null, 2);
        },

        parseSaveFile(json: string): SaveFile | null {
            const parsed = safeParseSaveFile(json);

            if (!parsed) {
                state.lastError = 'Failed to parse save file JSON.';
                return null;
            }

            state.lastError = null;
            return parsed;
        },

        loadFromSaveFile(saveFile: SaveFile): PersistedGameState {
            state.lastSaveMetadata = saveFile.meta;
            state.lastLoadedAt = Date.now();
            state.lastError = null;

            return clonePersistedGameState(saveFile.data);
        },

        exportToJson(
            gameState: GameState,
            options?: {
                navigation?: Partial<SavedNavigation>;
                saveVersion?: string;
                saveCommitHash?: string;
            },
        ): string {
            const saveFile = this.buildSaveFile(gameState, options);
            state.lastSaveMetadata = saveFile.meta;
            state.lastSavedAt = saveFile.meta.savedAt;
            state.lastError = null;

            return this.serializeSaveFile(saveFile);
        },

        importFromJson(json: string): PersistedGameState | null {
            const saveFile = this.parseSaveFile(json);
            if (!saveFile) return null;

            return this.loadFromSaveFile(saveFile);
        },

        saveToLocalStorage(
            gameState: GameState,
            options?: {
                navigation?: Partial<SavedNavigation>;
                saveVersion?: string;
                saveCommitHash?: string;
            },
        ): boolean {
            if (typeof window === 'undefined') {
                state.lastError = 'localStorage is not available outside the browser.';
                return false;
            }

            try {
                const json = this.exportToJson(gameState, options);
                window.localStorage.setItem(state.storageKey, json);
                return true;
            } catch (error) {
                state.lastError =
                    error instanceof Error ? error.message : 'Failed to save to localStorage.';
                return false;
            }
        },

        loadFromLocalStorage(): PersistedGameState | null {
            if (typeof window === 'undefined') {
                state.lastError = 'localStorage is not available outside the browser.';
                return null;
            }

            try {
                const json = window.localStorage.getItem(state.storageKey);
                if (!json) return null;

                return this.importFromJson(json);
            } catch (error) {
                state.lastError =
                    error instanceof Error ? error.message : 'Failed to load from localStorage.';
                return null;
            }
        },

        clearLocalStorageSave(): boolean {
            if (typeof window === 'undefined') {
                state.lastError = 'localStorage is not available outside the browser.';
                return false;
            }

            try {
                window.localStorage.removeItem(state.storageKey);
                state.lastError = null;
                return true;
            } catch (error) {
                state.lastError =
                    error instanceof Error ? error.message : 'Failed to clear local save.';
                return false;
            }
        },

        downloadSaveFile(
            gameState: GameState,
            options?: {
                navigation?: Partial<SavedNavigation>;
                saveVersion?: string;
                saveCommitHash?: string;
                filename?: string;
            },
        ): boolean {
            if (typeof window === 'undefined') {
                state.lastError = 'File download is only available in the browser.';
                return false;
            }

            try {
                const json = this.exportToJson(gameState, options);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement('a');

                anchor.href = url;
                anchor.download = options?.filename ?? 'save.json';
                anchor.click();

                URL.revokeObjectURL(url);
                state.lastError = null;
                return true;
            } catch (error) {
                state.lastError =
                    error instanceof Error ? error.message : 'Failed to download save file.';
                return false;
            }
        },
    };
}

export const saveStore = createSaveStore();