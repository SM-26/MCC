// src/logic/save/save.svelte.test.ts

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TabId } from '../app/navigationTypes';

const makeInitialState = () => ({
  money: 100,
  world: {
    cells: [],
    plots: [
      {
        plotId: 'plot-0',
        cellId: 'cell-0',
        plotName: 'Plot 0',
        discovered: true,
      },
    ],
    activePlotIndex: 0,
  },
  plots: [
    {
      plotId: 'plot-0',
      plotName: 'Plot 0',
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
                    type: 'dirt',
                    level: 1,
                    hp: 1,
                    maxHp: 1,
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
    maxNorthExpansions: 3,
    maxUndergroundLevels: 1,
  },
  settings: {
    navbarPosition: 'top',
    defaultView: 'world',
    devMode: false,
    soundEnabled: true,
    notificationsEnabled: true,
    theme: 'dark',
    worldSeed: 'seed-123',
  },
});

const initialState = makeInitialState();

const gameState = {
  current: {
    money: initialState.money,
    activeTab: 'world' as TabId,
    settings: structuredClone(initialState.settings),
  },
  setMoney: vi.fn((value: number) => {
    gameState.current.money = value;
  }),
  updateSettings: vi.fn((updates: Partial<typeof initialState.settings>) => {
    Object.assign(gameState.current.settings, updates);
  }),
  setActiveTab: vi.fn((tab: typeof gameState.current.activeTab) => {
    gameState.current.activeTab = tab;
    return true;
  }),
};

const worldStore = {
  current: structuredClone(initialState.world),
  replace: vi.fn((next: typeof initialState.world) => {
    worldStore.current = structuredClone(next);
  }),
};

const mineStore = {
  current: structuredClone(initialState.plots[0]),
  replace: vi.fn((next: (typeof initialState.plots)[0]) => {
    mineStore.current = structuredClone(next);
  }),
  reset: vi.fn(() => {
    mineStore.current = structuredClone(makeInitialState().plots[0]);
  }),
};

const engineeringStore = {
  current: structuredClone(initialState.engineering),
  replace: vi.fn((next: typeof initialState.engineering) => {
    engineeringStore.current = structuredClone(next);
  }),
};

const saveStore = {
  current: {
    lastSaveMetadata: null as null | { saveVersion: string },
    lastError: null as string | null,
  },
  setStorageKey: vi.fn(),
  loadFromLocalStorage: vi.fn(),
  saveToLocalStorage: vi.fn(),
  clearLocalStorageSave: vi.fn(),
};

const log = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.mock('../../lib/logger', () => ({
  log,
}));

vi.mock('../stateFactory', () => ({
  getInitialState: vi.fn(() => structuredClone(makeInitialState())),
  getInitialNavigationState: vi.fn(() => ({ activeTab: 'world' })),
}));

vi.mock('../app/gameState.svelte', () => ({
  gameState,
}));

vi.mock('../world/worldStore.svelte', () => ({
  worldStore,
}));

vi.mock('../mine/mineStore.svelte', () => ({
  mineStore,
}));

vi.mock('../engineering/engineeringStore.svelte', () => ({
  engineeringStore,
}));

vi.mock('./saveStore.svelte', () => ({
  saveStore,
}));

describe('save.svelte.ts', async () => {
  const saveModule = await import('./save.svelte');
  const { loadGame, manualSave, debouncedSave, resetProgress, getSaveSnapshot } = saveModule;

  beforeEach(() => {
    const fresh = makeInitialState();

    gameState.current.money = fresh.money;
    gameState.current.activeTab = 'world';
    gameState.current.settings = structuredClone(fresh.settings);

    worldStore.current = structuredClone(fresh.world);
    mineStore.current = structuredClone(fresh.plots[0]);
    engineeringStore.current = structuredClone(fresh.engineering);

    gameState.setMoney.mockClear();
    gameState.updateSettings.mockClear();
    gameState.setActiveTab.mockClear();

    worldStore.replace.mockClear();
    mineStore.replace.mockClear();
    mineStore.reset.mockClear();
    engineeringStore.replace.mockClear();

    saveStore.setStorageKey.mockClear();
    saveStore.loadFromLocalStorage.mockClear();
    saveStore.saveToLocalStorage.mockClear();
    saveStore.clearLocalStorageSave.mockClear();

    saveStore.current.lastSaveMetadata = null;
    saveStore.current.lastError = null;

    saveStore.loadFromLocalStorage.mockReturnValue(null);
    saveStore.saveToLocalStorage.mockReturnValue(true);
    saveStore.clearLocalStorageSave.mockReturnValue(true);

    log.debug.mockClear();
    log.info.mockClear();
    log.warn.mockClear();
    log.error.mockClear();

    vi.clearAllTimers();
    vi.useFakeTimers();

    Object.defineProperty(window, 'location', {
      value: {
        reload: vi.fn(),
      },
      configurable: true,
    });
  });

  it('getSaveSnapshot returns a serializable snapshot of current live state', () => {
    gameState.current.money = 432;
    gameState.current.activeTab = 'settings';
    gameState.current.settings.soundEnabled = false;
    worldStore.current.activePlotIndex = 2;
    engineeringStore.current.maxNorthExpansions = 7;
    mineStore.current.plotName = 'Snapshot Plot';

    const snapshot = getSaveSnapshot();

    expect(snapshot.money).toBe(432);
    expect(snapshot.navigation.activeTab).toBe('settings');
    expect(snapshot.settings.soundEnabled).toBe(false);
    expect(snapshot.world.activePlotIndex).toBe(2);
    expect(snapshot.engineering.maxNorthExpansions).toBe(7);
    expect(snapshot.plots).toHaveLength(1);
    expect(snapshot.plots[0].plotName).toBe('Snapshot Plot');
  });

  it('manualSave writes the current snapshot immediately through saveStore', () => {
    gameState.current.money = 777;
    gameState.current.activeTab = 'settings';

    manualSave();

    expect(saveStore.saveToLocalStorage).toHaveBeenCalledTimes(1);

    const [game, options] = saveStore.saveToLocalStorage.mock.calls[0];

    expect(game.money).toBe(777);
    expect(options.navigation.activeTab).toBe('settings');
    expect(log.info).toHaveBeenCalledWith('save', 'Manual save triggered by user.');
  });

  it('debouncedSave writes only once after the debounce interval', () => {
    gameState.current.money = 111;

    debouncedSave();

    gameState.current.money = 222;
    debouncedSave();

    expect(saveStore.saveToLocalStorage).not.toHaveBeenCalled();

    vi.advanceTimersByTime(499);
    expect(saveStore.saveToLocalStorage).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(saveStore.saveToLocalStorage).toHaveBeenCalledTimes(1);

    const [game] = saveStore.saveToLocalStorage.mock.calls[0];
    expect(game.money).toBe(222);
  });

  it('loadGame applies defaults and writes them when no save exists', () => {
    saveStore.loadFromLocalStorage.mockReturnValueOnce(null);
    saveStore.saveToLocalStorage.mockReturnValueOnce(true);

    loadGame();

    expect(saveStore.setStorageKey).toHaveBeenCalledWith('mcc_save');
    expect(gameState.setMoney).toHaveBeenCalledWith(100);
    expect(gameState.setActiveTab).toHaveBeenCalledWith('world');
    expect(worldStore.replace).toHaveBeenCalledTimes(1);
    expect(engineeringStore.replace).toHaveBeenCalledTimes(1);
    expect(mineStore.replace).toHaveBeenCalledTimes(1);
    expect(saveStore.saveToLocalStorage).toHaveBeenCalledTimes(1);
  });

  it('loadGame applies a loaded persisted state', () => {
    const loaded = {
      money: 999,
      world: {
        cells: [],
        plots: [
          {
            plotId: 'plot-loaded',
            cellId: 'cell-loaded',
            plotName: 'Loaded World Plot',
            discovered: true,
          },
        ],
        activePlotIndex: 0,
      },
      plots: [
        {
          plotId: 'plot-loaded',
          plotName: 'Loaded Mine Plot',
          currentAge: 'Mechanical',
          ageResources: {
            coal: 4,
            oil: 1,
            copper: 2,
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
                        type: 'coal',
                        level: 1,
                        hp: 1,
                        maxHp: 1,
                        value: 1,
                        resourceType: 'coal',
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
        engineeringIdeas: 10,
        resetCount: 2,
        maxNorthExpansions: 7,
        maxUndergroundLevels: 3,
      },
      settings: {
        navbarPosition: 'bottom',
        defaultView: 'mine',
        devMode: true,
        soundEnabled: false,
        notificationsEnabled: false,
        theme: 'light',
        worldSeed: 'loaded-seed',
      },
      navigation: {
        activeTab: 'settings',
      },
    };

    saveStore.current.lastSaveMetadata = { saveVersion: '1.0.0' };
    saveStore.loadFromLocalStorage.mockReturnValueOnce(loaded);

    loadGame();

    expect(gameState.setMoney).toHaveBeenCalledWith(999);
    expect(gameState.updateSettings).toHaveBeenCalledWith(loaded.settings);
    expect(gameState.setActiveTab).toHaveBeenCalledWith('settings');
    expect(worldStore.replace).toHaveBeenCalledWith(loaded.world);
    expect(engineeringStore.replace).toHaveBeenCalledWith(loaded.engineering);
    expect(mineStore.replace).toHaveBeenCalledWith(loaded.plots[0]);
    expect(log.info).toHaveBeenCalledWith('load', 'Full game state loaded from localStorage (1.0.0).');
  });

  it('loadGame logs a warning when default save write fails after missing save', () => {
    saveStore.loadFromLocalStorage.mockReturnValueOnce(null);
    saveStore.saveToLocalStorage.mockReturnValueOnce(false);
    saveStore.current.lastError = 'write failed';

    loadGame();

    expect(log.warn).toHaveBeenCalledWith('save', 'write failed');
  });

  it('loadGame logs an error when loading throws', () => {
    saveStore.loadFromLocalStorage.mockImplementationOnce(() => {
      throw new Error('boom');
    });

    loadGame();

    expect(log.error).toHaveBeenCalledWith('load', 'Failed to load game state: Error: boom');
  });

  it('manualSave logs an error when saveStore save fails', () => {
    saveStore.saveToLocalStorage.mockReturnValueOnce(false);
    saveStore.current.lastError = 'save failed';

    manualSave();

    expect(log.error).toHaveBeenCalledWith('save', 'Failed to manual save: Error: save failed');
  });

  it('debouncedSave logs an error when deferred save fails', () => {
    saveStore.saveToLocalStorage.mockReturnValueOnce(false);
    saveStore.current.lastError = 'debounced failed';

    debouncedSave();
    vi.advanceTimersByTime(500);

    expect(log.error).toHaveBeenCalledWith('save', 'Failed to save full game state: Error: debounced failed');
  });

  it('resetProgress clears save, reapplies defaults, rewrites defaults, and reloads', async () => {
    gameState.current.money = 999;
    gameState.current.activeTab = 'settings';

    await resetProgress();

    expect(saveStore.setStorageKey).toHaveBeenCalledWith('mcc_save');
    expect(saveStore.clearLocalStorageSave).toHaveBeenCalledTimes(1);
    expect(gameState.setMoney).toHaveBeenCalledWith(100);
    expect(gameState.setActiveTab).toHaveBeenCalledWith('world');
    expect(saveStore.saveToLocalStorage).toHaveBeenCalledTimes(1);
    expect(window.location.reload).toHaveBeenCalledTimes(1);
    expect(log.info).toHaveBeenCalledWith('save', 'Progress reset successfully');
  });

  it('resetProgress throws when clearing the local save fails', async () => {
    saveStore.clearLocalStorageSave.mockReturnValueOnce(false);
    saveStore.current.lastError = 'clear failed';

    await expect(resetProgress()).rejects.toThrow('clear failed');

    expect(log.error).toHaveBeenCalledWith('save', 'Failed to reset progress: Error: clear failed');
  });

  it('resetProgress throws when rewriting the default save fails', async () => {
    saveStore.clearLocalStorageSave.mockReturnValueOnce(true);
    saveStore.saveToLocalStorage.mockReturnValueOnce(false);
    saveStore.current.lastError = 'rewrite failed';

    await expect(resetProgress()).rejects.toThrow('rewrite failed');

    expect(log.error).toHaveBeenCalledWith('save', 'Failed to reset progress: Error: rewrite failed');
  });
});
