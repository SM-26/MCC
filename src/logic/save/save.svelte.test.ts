// src/logic/save/save.svelte.test.ts

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TabId } from '../app/navigationTypes';
import type { PlotState } from '../mine/mineTypes';
import type { WorldCellId } from '../world/worldTypes';

// ── Shared fixture helpers ────────────────────────────────────────────────────

function makeHomePlot(): PlotState {
  return {
    currentAge: 'Mechanical',
    ageResources: { coal: 0, oil: 0, copper: 0, superalloy: 0 },
    mineshafts: [
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
    activeMineshaftIndex: 0,
    station: null,
  };
}

function makeHomeCell() {
  return {
    id: '0,0',
    name: 'Home',
    type: 'plot' as const,
    q: 0,
    r: 0,
    ring: 0,
    discovered: true,
  };
}

const makeInitialState = () => ({
  money: 100,
  world: {
    cells: [makeHomeCell()],
    plots: { '0,0': makeHomePlot() } as Record<WorldCellId, PlotState>,
    activePlotCellId: '0,0' as WorldCellId | null,
    inspectedCellId: null as WorldCellId | null,
  },
  engineering: {
    engineeringIdeas: 0,
    resetCount: 0,
    maxNorthExpansions: 3,
    maxUndergroundLevels: 1,
  },
  settings: {
    navbarPosition: 'top' as const,
    defaultView: 'world' as const,
    devMode: false,
    soundEnabled: true,
    notificationsEnabled: true,
    theme: 'dark' as const,
    worldSeed: 'seed-123',
  },
});

const initialState = makeInitialState();

// ── Mock objects ──────────────────────────────────────────────────────────────

const gameState = {
  current: {
    money: initialState.money,
    settings: structuredClone(initialState.settings),
  },
  setMoney: vi.fn((value: number) => {
    gameState.current.money = value;
  }),
  updateSettings: vi.fn((updates: Partial<typeof initialState.settings>) => {
    Object.assign(gameState.current.settings, updates);
  }),
};

const navigation = {
  current: {
    activeTab: 'world' as TabId,
    tabs: ['world', 'mine', 'station', 'engineering', 'settings'] as TabId[],
    showLabels: true,
    showEmojis: true,
    showActiveLabel: true,
  },
  replace: vi.fn((next: typeof navigation.current) => {
    Object.assign(navigation.current, next);
  }),
  setActiveTab: vi.fn((tab: TabId) => {
    navigation.current.activeTab = tab;
    return true;
  }),
  setTabs: vi.fn((tabs: TabId[]) => {
    navigation.current.tabs = [...tabs];
  }),
  setShowLabels: vi.fn((value: boolean) => {
    navigation.current.showLabels = value;
  }),
  setShowEmojis: vi.fn((value: boolean) => {
    navigation.current.showEmojis = value;
  }),
  setShowActiveLabel: vi.fn((value: boolean) => {
    navigation.current.showActiveLabel = value;
  }),
};

const worldStore = {
  current: structuredClone(initialState.world),
  replace: vi.fn((next: typeof initialState.world) => {
    worldStore.current = structuredClone(next);
  }),
  setActivePlotCellId: vi.fn((cellId: WorldCellId | null) => {
    worldStore.current.activePlotCellId = cellId;
  }),
};

const plotsStore = {
  _state: structuredClone(initialState.world.plots),
  snapshot: vi.fn(() => structuredClone(plotsStore._state)),
  replaceAll: vi.fn((next: Record<WorldCellId, PlotState>) => {
    plotsStore._state = structuredClone(next);
  }),
  get: vi.fn((cellId: WorldCellId) => plotsStore._state[cellId] ?? null),
  set: vi.fn(),
  addAgeResource: vi.fn((cellId: WorldCellId, type: string, amount: number) => {
    const plot = plotsStore._state[cellId];
    if (plot) ((plot.ageResources as unknown) as Record<string, number>)[type] += amount;
  }),
  setTile: vi.fn(),
};

const saveStore = {
  current: {
    lastSaveMetadata: null as null | { saveVersion: string },
    lastSavedAt: null as null | number,
    lastLoadedAt: null as null | number,
    lastError: null as string | null,
    storageKey: 'mcc_save',
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

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../../lib/logger', () => ({ log }));
vi.mock('../stateFactory', () => ({
  getInitialState: vi.fn(() => structuredClone(makeInitialState())),
  getInitialNavigationState: vi.fn(() => ({
    activeTab: 'world' as TabId,
    tabs: ['world', 'mine', 'station', 'engineeringIdeas', 'settings'] as TabId[],
    showLabels: true,
    showEmojis: true,
    showActiveLabel: true,
  })),
}));
vi.mock('../app/gameState.svelte', () => ({ gameState }));
vi.mock('../app/navigationStore.svelte', () => ({ navigation }));
vi.mock('../world/worldStore.svelte', () => ({ worldStore }));
vi.mock('../mine/plotsStore.svelte', () => ({ plotsStore }));
vi.mock('./saveStore.svelte', () => ({ saveStore }));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('save.svelte.ts', async () => {
  const saveModule = await import('./save.svelte');
  const { loadGame, manualSave, debouncedSave, resetProgress, getSaveSnapshot } = saveModule;

  beforeEach(() => {
    const fresh = makeInitialState();

    gameState.current.money = fresh.money;
    gameState.current.settings = structuredClone(fresh.settings);

    navigation.current.activeTab = 'world';
    navigation.current.tabs = ['world', 'mine', 'station', 'engineering', 'settings'];
    navigation.current.showLabels = true;
    navigation.current.showEmojis = true;
    navigation.current.showActiveLabel = true;

    worldStore.current = structuredClone(fresh.world);

    plotsStore._state = structuredClone(fresh.world.plots);

    gameState.setMoney.mockClear();
    gameState.updateSettings.mockClear();

    navigation.replace.mockClear();
    navigation.setActiveTab.mockClear();
    navigation.setTabs.mockClear();
    navigation.setShowLabels.mockClear();
    navigation.setShowEmojis.mockClear();
    navigation.setShowActiveLabel.mockClear();

    worldStore.replace.mockClear();
    worldStore.setActivePlotCellId.mockClear();

    plotsStore.snapshot.mockClear();
    plotsStore.replaceAll.mockClear();
    plotsStore.get.mockClear();
    plotsStore.addAgeResource.mockClear();

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
      value: { reload: vi.fn() },
      configurable: true,
    });
  });

  // ── getSaveSnapshot ───────────────────────────────────────────────────────

  it('getSaveSnapshot returns a serializable snapshot of current live state', () => {
    gameState.current.money = 432;
    navigation.current.activeTab = 'settings';
    gameState.current.settings.soundEnabled = false;
    worldStore.current.activePlotCellId = '0,0';

    // Mutate a plot via the mock store state directly
    plotsStore._state['0,0'] = {
      ...makeHomePlot(),
      currentAge: 'Steam',
    };

    const snapshot = getSaveSnapshot();

    expect(snapshot.money).toBe(432);
    expect(snapshot.navigation.activeTab).toBe('settings');
    expect(snapshot.settings.soundEnabled).toBe(false);
    expect(snapshot.world.activePlotCellId).toBe('0,0');
    expect(snapshot.world.plots['0,0']).toBeDefined();
    expect(snapshot.world.plots['0,0'].currentAge).toBe('Steam');
  });

  // ── manualSave ────────────────────────────────────────────────────────────

  it('manualSave writes the current snapshot immediately through saveStore', () => {
    gameState.current.money = 777;
    navigation.current.activeTab = 'settings';

    manualSave();

    expect(saveStore.saveToLocalStorage).toHaveBeenCalledTimes(1);

    const [game, options] = saveStore.saveToLocalStorage.mock.calls[0];

    expect(game.money).toBe(777);
    expect(options.navigation.activeTab).toBe('settings');
    expect(log.info).toHaveBeenCalledWith('save', 'Manual save triggered by user.');
  });

  // ── debouncedSave ─────────────────────────────────────────────────────────

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

  // ── loadGame ──────────────────────────────────────────────────────────────

  it('loadGame applies defaults and writes them when no save exists', () => {
    saveStore.loadFromLocalStorage.mockReturnValueOnce(null);
    saveStore.saveToLocalStorage.mockReturnValueOnce(true);

    loadGame();

    expect(saveStore.setStorageKey).toHaveBeenCalledWith('mcc_save');
    expect(gameState.setMoney).toHaveBeenCalledWith(100);
    expect(navigation.setActiveTab).toHaveBeenCalledWith('world');
    expect(worldStore.replace).toHaveBeenCalledTimes(1);
    expect(plotsStore.replaceAll).toHaveBeenCalledTimes(1);
    expect(saveStore.saveToLocalStorage).toHaveBeenCalledTimes(1);
  });

  it('loadGame applies a loaded persisted state', () => {
    const loadedPlot: PlotState = {
      currentAge: 'Steam',
      ageResources: { coal: 4, oil: 1, copper: 2, superalloy: 0 },
      mineshafts: [
        {
          mineDepths: [
            {
              depth: 0,
              rows: 1,
              cols: 1,
              tiles: [[{ type: 'coal', level: 1, hp: 1, maxHp: 1, value: 1, resourceType: 'coal' }]],
              miners: [],
            },
          ],
          selectedMiner: null,
          draggedMiner: null,
          lastTick: 0,
          activeDepthIndex: 0,
        },
      ],
      activeMineshaftIndex: 0,
      station: null,
    };

    const loaded = {
      money: 999,
      world: {
        cells: [makeHomeCell()],
        plots: { '0,0': loadedPlot } as Record<WorldCellId, PlotState>,
        activePlotCellId: '0,0' as WorldCellId | null,
        inspectedCellId: null as WorldCellId | null,
      },
      engineering: {
        engineeringIdeas: 10,
        resetCount: 2,
        maxNorthExpansions: 7,
        maxUndergroundLevels: 3,
      },
      settings: {
        navbarPosition: 'bottom' as const,
        defaultView: 'mine' as const,
        devMode: true,
        soundEnabled: false,
        notificationsEnabled: false,
        theme: 'light' as const,
        worldSeed: 'loaded-seed',
      },
      navigation: {
        activeTab: 'settings' as TabId,
        tabs: ['world', 'mine', 'station', 'engineering', 'settings'] as TabId[],
        showLabels: true,
        showEmojis: true,
        showActiveLabel: true,
      },
    };

    saveStore.current.lastSaveMetadata = { saveVersion: '1.0.0' };
    saveStore.loadFromLocalStorage.mockReturnValueOnce(loaded);

    loadGame();

    expect(gameState.setMoney).toHaveBeenCalledWith(999);
    expect(gameState.updateSettings).toHaveBeenCalledWith(loaded.settings);
    expect(navigation.setActiveTab).toHaveBeenCalledWith('settings');
    expect(worldStore.replace).toHaveBeenCalledWith(loaded.world);
    expect(plotsStore.replaceAll).toHaveBeenCalledWith(loaded.world.plots);
    expect(log.info).toHaveBeenCalledWith('load', 'Full game state loaded from localStorage (1.0.0).');
  });

  it('loadGame falls back to home cell when active plot is not built', () => {
    const unbuiltPlot: PlotState = {
      currentAge: 'Mechanical',
      ageResources: { coal: 0, oil: 0, copper: 0, superalloy: 0 },
      mineshafts: [
        {
          mineDepths: [], // no surface → isPlotBuilt returns false
          selectedMiner: null,
          draggedMiner: null,
          lastTick: 0,
          activeDepthIndex: 0,
        },
      ],
      activeMineshaftIndex: 0,
      station: null,
    };

    const loaded = {
      money: 50,
      world: {
        cells: [makeHomeCell()],
        plots: { '0,0': unbuiltPlot } as Record<WorldCellId, PlotState>,
        activePlotCellId: '0,0' as WorldCellId | null,
        inspectedCellId: null as WorldCellId | null,
      },
      engineering: { engineeringIdeas: 0, resetCount: 0, maxNorthExpansions: 1, maxUndergroundLevels: 0 },
      settings: {
        navbarPosition: 'top' as const,
        defaultView: 'world' as const,
        devMode: false,
        soundEnabled: true,
        notificationsEnabled: true,
        theme: 'dark' as const,
        worldSeed: 'seed',
      },
      navigation: {
        activeTab: 'world' as TabId,
        tabs: ['world', 'mine', 'station', 'engineering', 'settings'] as TabId[],
        showLabels: true,
        showEmojis: true,
        showActiveLabel: true,
      },
    };

    saveStore.current.lastSaveMetadata = { saveVersion: '1.0.0' };
    saveStore.loadFromLocalStorage.mockReturnValueOnce(loaded);

    // worldStore.replace will update worldStore.current before the guard runs
    worldStore.replace.mockImplementationOnce((next: typeof initialState.world) => {
      worldStore.current = structuredClone(next);
    });

    loadGame();

    // Guard fires: plot is not built → falls back to home ring-0 cell id
    expect(worldStore.setActivePlotCellId).toHaveBeenCalledWith('0,0');
  });

  it('loadGame does NOT call setActivePlotCellId when active plot passes the guard', () => {
    const loaded = {
      money: 75,
      world: {
        cells: [makeHomeCell()],
        plots: { '0,0': makeHomePlot() } as Record<WorldCellId, PlotState>,
        activePlotCellId: '0,0' as WorldCellId | null,
        inspectedCellId: null as WorldCellId | null,
      },
      engineering: { engineeringIdeas: 0, resetCount: 0, maxNorthExpansions: 1, maxUndergroundLevels: 0 },
      settings: {
        navbarPosition: 'top' as const,
        defaultView: 'world' as const,
        devMode: false,
        soundEnabled: true,
        notificationsEnabled: true,
        theme: 'dark' as const,
        worldSeed: 'seed',
      },
      navigation: {
        activeTab: 'world' as TabId,
        tabs: ['world', 'mine', 'station', 'engineering', 'settings'] as TabId[],
        showLabels: true,
        showEmojis: true,
        showActiveLabel: true,
      },
    };

    saveStore.current.lastSaveMetadata = { saveVersion: '1.0.0' };
    saveStore.loadFromLocalStorage.mockReturnValueOnce(loaded);

    // worldStore.replace needs to update worldStore.current for the guard
    worldStore.replace.mockImplementationOnce((next: typeof initialState.world) => {
      worldStore.current = structuredClone(next);
    });

    loadGame();

    expect(worldStore.setActivePlotCellId).not.toHaveBeenCalled();
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

  // ── manualSave error ──────────────────────────────────────────────────────

  it('manualSave logs an error when saveStore save fails', () => {
    saveStore.saveToLocalStorage.mockReturnValueOnce(false);
    saveStore.current.lastError = 'save failed';

    manualSave();

    expect(log.error).toHaveBeenCalledWith('save', 'Failed to manual save: Error: save failed');
  });

  // ── debouncedSave error ───────────────────────────────────────────────────

  it('debouncedSave logs an error when deferred save fails', () => {
    saveStore.saveToLocalStorage.mockReturnValueOnce(false);
    saveStore.current.lastError = 'debounced failed';

    debouncedSave();
    vi.advanceTimersByTime(500);

    expect(log.error).toHaveBeenCalledWith('save', 'Failed to save full game state: Error: debounced failed');
  });

  // ── resetProgress ─────────────────────────────────────────────────────────

  it('resetProgress clears save, reapplies defaults, rewrites defaults, and reloads', async () => {
    gameState.current.money = 999;
    navigation.current.activeTab = 'settings';

    await resetProgress();

    expect(saveStore.setStorageKey).toHaveBeenCalledWith('mcc_save');
    expect(saveStore.clearLocalStorageSave).toHaveBeenCalledTimes(1);
    expect(gameState.setMoney).toHaveBeenCalledWith(100);
    expect(navigation.setActiveTab).toHaveBeenCalledWith('world');
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

  // ── Round-trip test ───────────────────────────────────────────────────────

  it('round-trip: mutation via plotsStore survives a save/reload cycle', async () => {
    // Set up initial state with a built home plot and world context
    worldStore.current = {
      cells: [makeHomeCell()],
      plots: { '0,0': makeHomePlot() },
      activePlotCellId: '0,0',
      inspectedCellId: null,
    };
    plotsStore._state = { '0,0': makeHomePlot() };

    // RED → mutate the home plot (add coal)
    plotsStore.addAgeResource('0,0', 'coal', 5);
    expect(plotsStore._state['0,0'].ageResources.coal).toBe(5);

    // Persist via manualSave
    saveStore.saveToLocalStorage.mockReturnValueOnce(true);
    manualSave();

    expect(saveStore.saveToLocalStorage).toHaveBeenCalledTimes(1);
    const [savedGame, savedOptions] = saveStore.saveToLocalStorage.mock.calls[0];

    // The saved world.plots should carry the mutated coal count
    expect(savedGame.world.plots['0,0'].ageResources.coal).toBe(5);

    // Simulate a reload: package savedGame back into a PersistedGameState
    const savedState = {
      ...savedGame,
      navigation: savedOptions.navigation,
    };

    // Reset store state to simulate a fresh session
    plotsStore._state = { '0,0': makeHomePlot() }; // coal reset to 0
    plotsStore.replaceAll.mockClear();
    worldStore.replace.mockImplementationOnce((next: typeof initialState.world) => {
      worldStore.current = structuredClone(next);
    });

    saveStore.loadFromLocalStorage.mockReturnValueOnce(savedState);
    saveStore.current.lastSaveMetadata = { saveVersion: '1.0.0' };

    loadGame();

    // plotsStore.replaceAll should have been called with the mutated map
    expect(plotsStore.replaceAll).toHaveBeenCalledTimes(1);
    const restoredPlots = plotsStore.replaceAll.mock.calls[0][0];
    expect(restoredPlots['0,0'].ageResources.coal).toBe(5);

    // worldStore.current.activePlotCellId should be '0,0' (guard passed)
    expect(worldStore.current.activePlotCellId).toBe('0,0');
    // setActivePlotCellId should NOT have been called (guard passed)
    expect(worldStore.setActivePlotCellId).not.toHaveBeenCalled();
  });
});
