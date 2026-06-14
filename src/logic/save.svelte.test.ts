import { beforeEach, describe, expect, it, vi } from 'vitest';

const makeInitialState = () => ({
  money: 100,
  world: {
    plots: [
      {
        plotName: 'Plot 0',
        northExpansions: [],
        activeNorthExpansionIndex: 0,
        ageResources: {
          coal: 0,
          oil: 0,
          copper: 0,
          superAlloy: 0,
        },
        currentAge: 'stone',
        station: null,
      },
    ],
    activePlotIndex: 0,
  },
  meta: {
    maxNorthExpansions: 3,
  },
  settings: {
    soundEnabled: true,
  },
});

const gameState = {
  money: 0,
  world: makeInitialState().world,
  meta: makeInitialState().meta,
  settings: makeInitialState().settings,
};

const navigation = {
  activeTab: 'world' as string,
};

const log = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.mock('../stores/index.svelte', () => ({
  gameState,
  navigation,
}));

vi.mock('../lib/logger', () => ({
  log,
}));

vi.mock('./stateFactory', () => ({
  getInitialState: vi.fn(() => makeInitialState()),
}));

vi.mock('../assets/git-info.txt?raw', () => ({
  default: 'abc123\n',
}));

const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn<(key: string) => string | null>((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: () => {
      store = {};
    },
    dump: () => store,
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});

Object.defineProperty(globalThis, 'window', {
  value: {
    location: {
      reload: vi.fn(),
    },
  },
  configurable: true,
});

describe('save.svelte.ts', async () => {
  const saveModule = await import('./save.svelte');
  const { loadGame, manualSave, debouncedSave, resetProgress, getSaveSnapshot } = saveModule;

  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();

    log.debug.mockClear();
    log.info.mockClear();
    log.warn.mockClear();
    log.error.mockClear();

    vi.clearAllTimers();
    vi.useFakeTimers();

    const fresh = makeInitialState();
    gameState.money = fresh.money;
    gameState.world = structuredClone(fresh.world);
    gameState.meta = structuredClone(fresh.meta);
    gameState.settings = structuredClone(fresh.settings);
    navigation.activeTab = 'world';

    (window.location.reload as ReturnType<typeof vi.fn>).mockClear();
  });

  it('initializes defaults and writes a save when no save exists', () => {
    localStorageMock.getItem.mockReturnValueOnce(null);

    loadGame();

    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    expect(gameState.money).toBe(100);
    expect(navigation.activeTab).toBe('world');

    const written = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(written.meta.saveVersion).toBe('1.0.0');
    expect(written.meta.saveCommitHash).toBe('abc123');
    expect(written.data.money).toBe(100);
    expect(written.data.navigation.activeTab).toBe('world');
  });

  it('loads a valid current-version save and applies persisted values', () => {
    const validSave = {
      meta: {
        saveVersion: '1.0.0',
        saveCommitHash: 'older-hash',
        savedAt: 123,
      },
      data: {
        money: 999,
        world: {
          plots: [
            {
              plotName: 'Loaded Plot',
              northExpansions: [],
              activeNorthExpansionIndex: 0,
              ageResources: {
                coal: 4,
                oil: 1,
                copper: 2,
                superAlloy: 0,
              },
              currentAge: 'bronze',
              station: null,
            },
          ],
          activePlotIndex: 0,
        },
        meta: {
          maxNorthExpansions: 7,
        },
        settings: {
          soundEnabled: false,
        },
        navigation: {
          activeTab: 'settings',
        },
      },
    };

    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(validSave));

    loadGame();

    expect(gameState.money).toBe(999);
    expect(gameState.meta.maxNorthExpansions).toBe(7);
    expect(gameState.settings.soundEnabled).toBe(false);
    expect(gameState.world.plots[0].plotName).toBe('Loaded Plot');
    expect(navigation.activeTab).toBe('settings');
    expect(log.info).toHaveBeenCalledWith('load', 'Full game state loaded from localStorage (version 1.0.0)');
  });

  it('recovers to defaults when JSON is malformed', () => {
    localStorageMock.getItem.mockReturnValueOnce('{not-json');

    loadGame();

    expect(log.warn).toHaveBeenCalledWith('save', 'Save file contains invalid JSON. Resetting to defaults.');
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    expect(gameState.money).toBe(100);
    expect(navigation.activeTab).toBe('world');
  });

  it('recovers to defaults when save version mismatches', () => {
    const oldSave = {
      meta: {
        saveVersion: '0.9.0',
        saveCommitHash: 'old',
        savedAt: 111,
      },
      data: {
        ...makeInitialState(),
        navigation: { activeTab: 'world' },
      },
    };

    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(oldSave));

    loadGame();

    expect(log.warn).toHaveBeenCalledWith('save', 'Old save version detected during pre-alpha. Wiping state to prevent crash.');
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    expect(gameState.money).toBe(100);
    expect(navigation.activeTab).toBe('world');
  });

  it('recovers to defaults when root shape is invalid', () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(['bad-root']));

    loadGame();

    expect(log.warn).toHaveBeenCalledWith('save', 'Save file is not a valid object. Resetting to defaults.');
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
  });

  it('recovers to defaults when metadata is missing', () => {
    localStorageMock.getItem.mockReturnValueOnce(
      JSON.stringify({
        data: {
          ...makeInitialState(),
          navigation: { activeTab: 'world' },
        },
      }),
    );

    loadGame();

    expect(log.warn).toHaveBeenCalledWith('save', 'Save file missing metadata. Resetting to defaults.');
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
  });

  it('recovers to defaults when data payload is missing', () => {
    localStorageMock.getItem.mockReturnValueOnce(
      JSON.stringify({
        meta: {
          saveVersion: '1.0.0',
        },
      }),
    );

    loadGame();

    expect(log.warn).toHaveBeenCalledWith('save', 'Save file missing data payload. Resetting to defaults.');
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
  });

  it('recovers to defaults when navigation.activeTab is invalid', () => {
    localStorageMock.getItem.mockReturnValueOnce(
      JSON.stringify({
        meta: {
          saveVersion: '1.0.0',
          saveCommitHash: 'abc123',
          savedAt: 1,
        },
        data: {
          ...makeInitialState(),
          navigation: { activeTab: '' },
        },
      }),
    );

    loadGame();

    expect(log.warn).toHaveBeenCalledWith('save', 'Save file has invalid navigation state. Resetting to defaults.');
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    expect(navigation.activeTab).toBe('world');
  });

  it('deep-merges nested objects but replaces arrays from saved data', () => {
    const partialSave = {
      meta: {
        saveVersion: '1.0.0',
        saveCommitHash: 'abc123',
        savedAt: 5,
      },
      data: {
        world: {
          plots: [
            {
              plotName: 'Replacement Plot',
              northExpansions: [],
              activeNorthExpansionIndex: 0,
              ageResources: {
                coal: 99,
                oil: 0,
                copper: 0,
                superAlloy: 0,
              },
              currentAge: 'iron',
              station: null,
            },
          ],
        },
        settings: {
          soundEnabled: false,
        },
        navigation: {
          activeTab: 'world',
        },
      },
    };

    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(partialSave));

    loadGame();

    expect(gameState.settings.soundEnabled).toBe(false);
    expect(gameState.world.plots).toHaveLength(1);
    expect(gameState.world.plots[0].plotName).toBe('Replacement Plot');
    expect(gameState.world.plots[0].ageResources.coal).toBe(99);
  });

  it('drops unknown keys from saved data during merge', () => {
    const saveWithUnknownKeys = {
      meta: {
        saveVersion: '1.0.0',
        saveCommitHash: 'abc123',
        savedAt: 5,
      },
      data: {
        money: 321,
        settings: {
          soundEnabled: false,
          extraSetting: 'ignored',
        },
        strangeRootKey: 'ignored',
        navigation: {
          activeTab: 'world',
        },
      },
    };

    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(saveWithUnknownKeys));

    loadGame();

    expect(gameState.money).toBe(321);
    expect(gameState.settings.soundEnabled).toBe(false);
    expect((gameState.settings as Record<string, unknown>).extraSetting).toBeUndefined();
    expect((gameState as Record<string, unknown>).strangeRootKey).toBeUndefined();
  });

  it('manualSave writes the current snapshot immediately', () => {
    gameState.money = 777;
    navigation.activeTab = 'settings';

    manualSave();

    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);

    const written = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(written.data.money).toBe(777);
    expect(written.data.navigation.activeTab).toBe('settings');
    expect(log.info).toHaveBeenCalledWith('Manual save', 'Manual save triggered by user');
  });

  it('debouncedSave writes only once after the debounce interval', () => {
    gameState.money = 111;

    debouncedSave();
    gameState.money = 222;
    debouncedSave();

    expect(localStorageMock.setItem).not.toHaveBeenCalled();

    vi.advanceTimersByTime(499);
    expect(localStorageMock.setItem).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);

    const written = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(written.data.money).toBe(222);
  });

  it('getSaveSnapshot returns a serializable snapshot of current live state', () => {
    gameState.money = 432;
    navigation.activeTab = 'settings';

    const snapshot = getSaveSnapshot();

    expect(snapshot.money).toBe(432);
    expect(snapshot.navigation.activeTab).toBe('settings');
    expect(snapshot.world).toBeDefined();
    expect(snapshot.meta).toBeDefined();
    expect(snapshot.settings).toBeDefined();
  });

  it('resetProgress clears storage, rewrites defaults, updates live state, and reloads', async () => {
    gameState.money = 999;
    navigation.activeTab = 'settings';

    await resetProgress();

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('mcc_save');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('mcc_settings');
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    expect(gameState.money).toBe(100);
    expect(navigation.activeTab).toBe('world');
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });
});
