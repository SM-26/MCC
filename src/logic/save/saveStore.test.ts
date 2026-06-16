// src/logic/save/saveStore.test.ts

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState, SaveFile } from './saveTypes';
import { createSaveStore } from './saveStore.svelte';
import { createDefaultNavigationState } from '../app/navigationTypes';

const defaultNavigation = {
  activeTab: 'world' as const,
  tabs: ['world', 'mine', 'station', 'engineering', 'settings'] as const,
  showLabels: true,
  showEmojis: true,
  showActiveLabel: true,
};

function createMockGameState(): GameState {
  return {
    money: 75,
    world: {
      cells: [],
      plots: [
        {
          plotId: 'plot-0',
          cellId: 'cell-plot-0',
          discovered: true,
        },
      ],
      activePlotIndex: 0,
    },
    plots: [
      {
        plotId: 'plot-0',
        currentAge: 'Mechanical',
        ageResources: {
          coal: 0,
          oil: 0,
          copper: 0,
          superalloy: 0,
        },
        northExpansions: [
          {
            mineDepths: [
              {
                depth: 0,
                rows: 1,
                cols: 1,
                tiles: [
                  [
                    {
                      type: 'empty',
                      level: 1,
                      hp: 0,
                      maxHp: 0,
                      value: 0,
                      resourceType: 'none',
                    },
                  ],
                ],
                miners: [],
              },
            ],
            selectedMiner: null,
            draggedMiner: null,
            lastTick: 0,
            activeDepthIndex: 0,
          },
        ],
        activeNorthExpansionIndex: 0,
        station: null,
      },
    ],
    engineering: {
      engineeringIdeas: 0,
      resetCount: 0,
      maxNorthExpansions: 1,
      maxUndergroundLevels: 0,
    },
    settings: {
      navbarPosition: 'top',
      defaultView: 'world',
      devMode: false,
      soundEnabled: false,
      notificationsEnabled: true,
      theme: 'dark',
      worldSeed: '123456',
    },
  };
}

function createNavigation(overrides: Partial<typeof defaultNavigation> = {}) {
  return {
    ...defaultNavigation,
    ...overrides,
  };
}

describe('saveStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('initial state', () => {
    it('starts with the expected defaults', () => {
      const store = createSaveStore();

      expect(store.current).toEqual({
        lastSaveMetadata: null,
        lastLoadedAt: null,
        lastSavedAt: null,
        lastError: null,
        storageKey: 'mccV2-save',
      });
    });
  });

  describe('basic state actions', () => {
    it('can clear the last error', () => {
      const store = createSaveStore();
      store.current.lastError = 'Something failed';

      store.clearError();

      expect(store.current.lastError).toBeNull();
    });

    it('can change the storage key', () => {
      const store = createSaveStore();

      store.setStorageKey('custom-save-key');

      expect(store.current.storageKey).toBe('custom-save-key');
    });
  });

  describe('buildPersistedGameState', () => {
    it('adds default navigation to a cloned game state', () => {
      const store = createSaveStore();
      const gameState = createMockGameState();

      const persisted = store.buildPersistedGameState(gameState);

      expect(persisted).toEqual({
        ...gameState,
        navigation: defaultNavigation,
      });

      expect(persisted).not.toBe(gameState);
      expect(persisted.world).not.toBe(gameState.world);
      expect(persisted.plots).not.toBe(gameState.plots);
      expect(persisted.settings).not.toBe(gameState.settings);
    });

    it('applies navigation overrides', () => {
      const store = createSaveStore();
      const gameState = createMockGameState();

      const persisted = store.buildPersistedGameState(gameState, {
        activeTab: 'station',
      });

      expect(persisted.navigation).toEqual({
        ...defaultNavigation,
        activeTab: 'station',
      });
    });

    it('does not mutate the source game state', () => {
      const store = createSaveStore();
      const gameState = createMockGameState();

      const persisted = store.buildPersistedGameState(gameState);
      persisted.money = 999;
      persisted.settings.worldSeed = 'changed';
      persisted.plots[0].currentAge = 'Steam';

      expect(gameState.money).toBe(75);
      expect(gameState.settings.worldSeed).toBe('123456');
      expect(gameState.plots[0].currentAge).toBe('Mechanical');
    });
  });

  describe('buildSaveFile', () => {
    it('builds a save file with default metadata', () => {
      const store = createSaveStore();
      const gameState = createMockGameState();

      vi.spyOn(Date, 'now').mockReturnValue(123456789);

      const saveFile = store.buildSaveFile(gameState);

      expect(saveFile.meta).toEqual({
        saveVersion: '0.0.0',
        saveCommitHash: 'dev',
        savedAt: 123456789,
      });

      expect(saveFile.data.navigation).toEqual(defaultNavigation);
    });

    it('builds a save file with metadata overrides', () => {
      const store = createSaveStore();
      const gameState = createMockGameState();

      const saveFile = store.buildSaveFile(gameState, {
        navigation: { activeTab: 'engineering' },
        saveVersion: '1.2.3',
        saveCommitHash: 'abc123',
        savedAt: 999,
      });

      expect(saveFile.meta).toEqual({
        saveVersion: '1.2.3',
        saveCommitHash: 'abc123',
        savedAt: 999,
      });

      expect(saveFile.data.navigation).toEqual({
        ...defaultNavigation,
        activeTab: 'engineering',
      });
    });
  });

  describe('serializeSaveFile and parseSaveFile', () => {
    it('serializes a save file to JSON', () => {
      const store = createSaveStore();

      const saveFile: SaveFile = {
        meta: {
          saveVersion: '1.0.0',
          saveCommitHash: 'commit',
          savedAt: 123,
        },
        data: {
          ...createMockGameState(),
          navigation: defaultNavigation,
        },
      };

      const json = store.serializeSaveFile(saveFile);
      const parsed = JSON.parse(json);

      expect(parsed).toEqual(saveFile);
    });

    it('parses valid save file JSON', () => {
      const store = createSaveStore();

      const saveFile: SaveFile = {
        meta: {
          saveVersion: '1.0.0',
          saveCommitHash: 'commit',
          savedAt: 123,
        },
        data: {
          ...createMockGameState(),
          navigation: createNavigation({ activeTab: 'mine' }),
        },
      };

      const parsed = store.parseSaveFile(JSON.stringify(saveFile));

      expect(parsed).toEqual(saveFile);
      expect(store.current.lastError).toBeNull();
    });

    it('returns null and stores an error for invalid JSON', () => {
      const store = createSaveStore();

      const parsed = store.parseSaveFile('{bad json');

      expect(parsed).toBeNull();
      expect(store.current.lastError).toBe('Failed to parse save file JSON.');
    });
  });

  describe('loadFromSaveFile', () => {
    it('loads a cloned persisted game state and updates metadata fields', () => {
      const store = createSaveStore();

      const saveFile: SaveFile = {
        meta: {
          saveVersion: '2.0.0',
          saveCommitHash: 'hash',
          savedAt: 555,
        },
        data: {
          ...createMockGameState(),
          navigation: createNavigation({ activeTab: 'station' }),
        },
      };

      vi.spyOn(Date, 'now').mockReturnValue(777);

      const loaded = store.loadFromSaveFile(saveFile);

      expect(loaded).toEqual(saveFile.data);
      expect(loaded).not.toBe(saveFile.data);
      expect(store.current.lastSaveMetadata).toEqual(saveFile.meta);
      expect(store.current.lastLoadedAt).toBe(777);
      expect(store.current.lastError).toBeNull();
    });

    it('does not share nested references with the source save file', () => {
      const store = createSaveStore();

      const saveFile: SaveFile = {
        meta: {
          saveVersion: '2.0.0',
          saveCommitHash: 'hash',
          savedAt: 555,
        },
        data: {
          ...createMockGameState(),
          navigation: defaultNavigation,
        },
      };

      const loaded = store.loadFromSaveFile(saveFile);
      loaded.settings.worldSeed = 'changed';
      loaded.plots[0].currentAge = 'Steam';

      expect(saveFile.data.settings.worldSeed).toBe('123456');
      expect(saveFile.data.plots[0].currentAge).toBe('Mechanical');
    });
  });

  describe('exportToJson and importFromJson', () => {
    it('exports JSON and updates save metadata state', () => {
      const store = createSaveStore();
      const gameState = createMockGameState();

      vi.spyOn(Date, 'now').mockReturnValue(1000);

      const json = store.exportToJson(gameState, {
        navigation: { activeTab: 'engineering' },
        saveVersion: '3.0.0',
        saveCommitHash: 'hash-3',
      });

      const parsed = JSON.parse(json);

      expect(parsed.meta).toEqual({
        saveVersion: '3.0.0',
        saveCommitHash: 'hash-3',
        savedAt: 1000,
      });
      expect(parsed.data.navigation).toEqual({
        ...defaultNavigation,
        activeTab: 'engineering',
      });

      expect(store.current.lastSaveMetadata).toEqual(parsed.meta);
      expect(store.current.lastSavedAt).toBe(1000);
      expect(store.current.lastError).toBeNull();
    });

    it('imports valid JSON into a persisted game state', () => {
      const store = createSaveStore();

      const source: SaveFile = {
        meta: {
          saveVersion: '1.1.0',
          saveCommitHash: 'hash-import',
          savedAt: 111,
        },
        data: {
          ...createMockGameState(),
          navigation: createNavigation({ activeTab: 'mine' }),
        },
      };

      vi.spyOn(Date, 'now').mockReturnValue(222);

      const imported = store.importFromJson(JSON.stringify(source));

      expect(imported).toEqual(source.data);
      expect(store.current.lastSaveMetadata).toEqual(source.meta);
      expect(store.current.lastLoadedAt).toBe(222);
      expect(store.current.lastError).toBeNull();
    });

    it('returns null when importing invalid JSON', () => {
      const store = createSaveStore();

      const imported = store.importFromJson('not json');

      expect(imported).toBeNull();
      expect(store.current.lastError).toBe('Failed to parse save file JSON.');
    });
  });

  describe('localStorage integration', () => {
    it('saves JSON to localStorage using the current storage key', () => {
      const store = createSaveStore();
      const gameState = createMockGameState();

      store.setStorageKey('test-save-key');
      vi.spyOn(Date, 'now').mockReturnValue(333);

      const ok = store.saveToLocalStorage(gameState, {
        navigation: { activeTab: 'settings' },
      });

      expect(ok).toBe(true);

      const raw = localStorage.getItem('test-save-key');
      expect(raw).not.toBeNull();

      const parsed = JSON.parse(raw!);
      expect(parsed.data.navigation).toEqual({
        ...defaultNavigation,
        activeTab: 'settings',
      });
      expect(store.current.lastSavedAt).toBe(333);
      expect(store.current.lastError).toBeNull();
    });

    it('loads persisted state from localStorage', () => {
      const store = createSaveStore();

      const saveFile: SaveFile = {
        meta: {
          saveVersion: '1.0.0',
          saveCommitHash: 'hash-local',
          savedAt: 444,
        },
        data: {
          ...createMockGameState(),
          navigation: createNavigation({ activeTab: 'station' }),
        },
      };

      store.setStorageKey('test-load-key');
      localStorage.setItem('test-load-key', JSON.stringify(saveFile));

      vi.spyOn(Date, 'now').mockReturnValue(555);

      const loaded = store.loadFromLocalStorage();

      expect(loaded).toEqual(saveFile.data);
      expect(store.current.lastSaveMetadata).toEqual(saveFile.meta);
      expect(store.current.lastLoadedAt).toBe(555);
      expect(store.current.lastError).toBeNull();
    });

    it('returns null when no localStorage save exists', () => {
      const store = createSaveStore();
      store.setStorageKey('missing-key');

      const loaded = store.loadFromLocalStorage();

      expect(loaded).toBeNull();
    });

    it('clears the localStorage save', () => {
      const store = createSaveStore();
      store.setStorageKey('clear-key');
      localStorage.setItem('clear-key', '{"ok":true}');

      const ok = store.clearLocalStorageSave();

      expect(ok).toBe(true);
      expect(localStorage.getItem('clear-key')).toBeNull();
      expect(store.current.lastError).toBeNull();
    });

    it('stores the thrown error message when localStorage save fails', () => {
      const store = createSaveStore();
      const gameState = createMockGameState();

      const setItemSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Quota exceeded');
      });

      const ok = store.saveToLocalStorage(gameState);

      expect(ok).toBe(false);
      expect(store.current.lastError).toBe('Quota exceeded');

      setItemSpy.mockRestore();
    });

    it('stores the thrown error message when localStorage load fails', () => {
      const store = createSaveStore();

      const getItemSpy = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
        throw new Error('Read failed');
      });

      const loaded = store.loadFromLocalStorage();

      expect(loaded).toBeNull();
      expect(store.current.lastError).toBe('Read failed');

      getItemSpy.mockRestore();
    });

    it('stores the thrown error message when localStorage clear fails', () => {
      const store = createSaveStore();

      const removeItemSpy = vi.spyOn(window.localStorage, 'removeItem').mockImplementation(() => {
        throw new Error('Remove failed');
      });

      const ok = store.clearLocalStorageSave();

      expect(ok).toBe(false);
      expect(store.current.lastError).toBe('Remove failed');

      removeItemSpy.mockRestore();
    });
  });

  describe('downloadSaveFile', () => {
    it('creates a blob URL, clicks an anchor, and revokes the URL', () => {
      const store = createSaveStore();
      const gameState = createMockGameState();

      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      const clickSpy = vi.fn();

      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
        if (tagName === 'a') {
          return {
            href: '',
            download: '',
            click: clickSpy,
          } as unknown as HTMLAnchorElement;
        }

        return originalCreateElement(tagName);
      }) as typeof document.createElement);

      const ok = store.downloadSaveFile(gameState, {
        filename: 'my-save.json',
      });

      expect(ok).toBe(true);
      expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test-url');
      expect(store.current.lastError).toBeNull();

      createElementSpy.mockRestore();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('stores the thrown error message when download fails', () => {
      const store = createSaveStore();
      const gameState = createMockGameState();

      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
        throw new Error('Blob failed');
      });

      const ok = store.downloadSaveFile(gameState);

      expect(ok).toBe(false);
      expect(store.current.lastError).toBe('Blob failed');

      createObjectURLSpy.mockRestore();
    });
  });
});
