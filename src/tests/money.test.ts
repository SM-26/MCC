import { describe, beforeEach, test, expect } from 'vitest';
import { GameState } from '../core/types/state';
import { loadSave, saveGame } from '../save/save';

// Mock localStorage for testing with strict type alignment
const mockStorage = new Map<string, string>();

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string): string | null => mockStorage.get(key) ?? null,
    setItem: (key: string, value: string): void => { mockStorage.set(key, value); },
    removeItem: (key: string): void => { mockStorage.delete(key); },
    clear: (): void => mockStorage.clear(),
    get length(): number { return mockStorage.size; },
    key: (): string | null => null,
  },
  configurable: true,
  writable: true,
});

Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: (key: string) => mockStorage.get(key) || null,
    setItem: (key: string, value: string) => mockStorage.set(key, value),
    removeItem: (key: string) => mockStorage.delete(key),
    clear: () => mockStorage.clear(),
  },
  writable: true,
});

describe('Money Initialization', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  test('new save starts with $200', () => {
    // Simulate loading a fresh save (no localStorage)
    const state = loadSave();

    expect(state.money).toBe(200);
    expect(typeof state.money).toBe('number');
  });

  test('money persists after saving and reloading', () => {
    // Create initial state with $123 money
    const initialState: GameState = {
      plots: [],
      worldDiscovered: [],
      destinations: [],
      playerPlotId: 'plot-A-I-1',
      money: 123,
      worldGrid: [],
      engineeringIdeas: 0,
      resetCount: 0,
      version: 1,
      lastSaveTime: Date.now()
    };

    saveGame(initialState);

    // Load it back
    const loadedState = loadSave();

    expect(loadedState.money).toBe(123);
  });

  test('money defaults to $200 if not set in save', () => {
    // Create a save without money field
    const incompleteState: Partial<GameState> = {
      plots: [],
      worldDiscovered: [],
      destinations: [],
      playerPlotId: null,
      worldGrid: []
      // No money field!
    };

    saveGame(incompleteState as GameState);

    // Load it back - should default to $200
    const loadedState = loadSave();

    expect(loadedState.money).toBe(200);
  });

  test('money defaults to $200 if set to 0', () => {
    const zeroMoneyState: GameState = {
      plots: [],
      worldDiscovered: [],
      destinations: [],
      playerPlotId: 'plot-A-I-1', // Must be a string, not null
      money: 0, // Explicitly set to 0
      worldGrid: [],
      engineeringIdeas: 0,
      resetCount: 0,
      version: 1,
      lastSaveTime: Date.now()
    };

    saveGame(zeroMoneyState);

    const loadedState = loadSave();

    expect(loadedState.money).toBe(200);
  });

  test('money defaults to $200 if null', () => {
    const nullMoneyState: GameState = {
      plots: [],
      worldDiscovered: [],
      destinations: [],
      playerPlotId: 'plot-A-I-1', // Must be a string, not null
      money: null as any, // Explicitly set to null
      worldGrid: [],
      engineeringIdeas: 0,
      resetCount: 0,
      version: 1,
      lastSaveTime: Date.now()
    };

    saveGame(nullMoneyState);

    const loadedState = loadSave();

    expect(loadedState.money).toBe(200);
  });
});

describe('Money Consistency Across Views', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  test('money is consistent across all views after save/load', () => {
    const initialMoney = 250;

    // Create state with specific money amount
    const initialState: GameState = {
      plots: [],
      worldDiscovered: [],
      destinations: [],
      playerPlotId: 'plot-A-I-1',
      money: initialMoney,
      worldGrid: [],
      engineeringIdeas: 0,
      resetCount: 0,
      version: 1,
      lastSaveTime: Date.now()
    };

    // Save the state
    saveGame(initialState);

    // Simulate what happens in different views:

    // 1. Header view - reads directly from state
    const headerMoney = loadSave().money;

    // 2. Mines view - should read same money
    const minesMoney = loadSave().money;

    // 3. Station view - should read same money
    const stationMoney = loadSave().money;

    // All views should show the same money
    expect(headerMoney).toBe(initialMoney);
    expect(minesMoney).toBe(initialMoney);
    expect(stationMoney).toBe(initialMoney);

    // All three should be equal
    expect(headerMoney).toBe(minesMoney);
    expect(minesMoney).toBe(stationMoney);
  });

  test('money persists correctly when switching between views', () => {
    const initialMoney = 75;

    // Save with initial money
    saveGame({
      plots: [],
      worldDiscovered: [],
      destinations: [],
      playerPlotId: 'plot-A-I-1',
      money: initialMoney,
      worldGrid: [],
      engineeringIdeas: 0,
      resetCount: 0,
      version: 1,
      lastSaveTime: Date.now()
    });

    // Simulate switching views by loading state multiple times
    let currentMoney = loadSave().money;

    // Should be consistent across multiple loads
    for (let i = 0; i < 5; i++) {
      currentMoney = loadSave().money;
      expect(currentMoney).toBe(initialMoney);
    }
  });

  test('money updates persist correctly', () => {
    // Start with $50
    saveGame({
      plots: [],
      worldDiscovered: [],
      destinations: [],
      playerPlotId: 'plot-A-I-1',
      money: 50,
      worldGrid: [],
      engineeringIdeas: 0,
      resetCount: 0,
      version: 1,
      lastSaveTime: Date.now()
    });

    let currentMoney = loadSave().money;
    expect(currentMoney).toBe(50);

    // Simulate earning $30 from mining
    const updatedState = { ...loadSave(), money: 80 };
    saveGame(updatedState);

    currentMoney = loadSave().money;
    expect(currentMoney).toBe(80);

    // Should be consistent across views
    expect(loadSave().money).toBe(80);
  });
});
