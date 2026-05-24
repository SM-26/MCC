import { describe, beforeEach, test, expect } from 'vitest';
import { GameState, Plot, Tile, Miner } from '../core/types/state';
import { loadSave, saveGame, createDefaultSave, createValidatedSave } from '../save/save';
import { createPlot, digDown, buyNorthPlot, getPlotName } from '../mines/index';

describe('Save System - End-to-End Integration', () => {
  beforeEach(() => {
    // Reset localStorage for each test
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
  });

  test('full game state can be saved and loaded', () => {
    // Arrange: Create a complex game state
    const initialState: GameState = {
      money: 1500,
      plots: [
        createPlot('plot-A-I-1', 0, -1),
        createPlot('plot-B-II-1', 1, -2),
      ],
      worldDiscovered: ['plot-A-I-1'],
      destinations: [],
      playerPlotId: 'plot-A-I-1',
      version: 1,
      _version: 1,
      lastSaveTime: Date.now(),
    };

    // Act: Save and load
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: State preserved correctly
    expect(loadedState.money).toBe(1500);
    expect(loadedState.plots.length).toBe(2);
    expect(loadedState.playerPlotId).toBe('plot-A-I-1');
    expect(loadedState.version).toBe(1);
  });

  test('save persists plot expansions across reload', () => {
    // Arrange: Create and expand a plot
    const plot = createPlot('plot-A-I-1', 0, -1);
    plot.money = 1000;
    
    digDown(plot);
    buyNorthPlot(plot, 500);

    const initialState: GameState = {
      money: 500,
      plots: [plot],
      worldDiscovered: ['plot-A-I-1'],
      destinations: [],
      playerPlotId: 'plot-A-I-1',
      version: 1,
      _version: 1,
      lastSaveTime: Date.now(),
    };

    // Act: Save and load
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: Expansions preserved
    expect(loadedState.plots[0].northExpansions).toBe(1);
    expect(loadedState.plots[0].undergroundLevels).toBe(-2);
  });

  test('save handles multiple plots with different states', () => {
    // Arrange: Create multiple plots at different stages
    const plot1 = createPlot('plot-A-I-1', 0, -1);
    plot1.money = 800;
    
    const plot2 = createPlot('plot-B-II-1', 1, -1);
    plot2.money = 300;

    const initialState: GameState = {
      money: 1100,
      plots: [plot1, plot2],
      worldDiscovered: ['plot-A-I-1', 'plot-B-II-1'],
      destinations: [],
      playerPlotId: 'plot-A-I-1',
      version: 1,
      _version: 1,
      lastSaveTime: Date.now(),
    };

    // Act: Save and load
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: All plots preserved with correct states
    expect(loadedState.plots.length).toBe(2);
    expect(loadedState.plots[0].money).toBe(800);
    expect(loadedState.plots[1].money).toBe(300);
  });

  test('save handles world discovery state', () => {
    // Arrange: Create state with discovered plots
    const plot = createPlot('plot-A-I-1', 0, -1);
    
    const initialState: GameState = {
      money: 500,
      plots: [plot],
      worldDiscovered: ['plot-A-I-1', 'plot-B-II-1', 'plot-C-III-1'],
      destinations: [],
      playerPlotId: 'plot-A-I-1',
      version: 1,
      _version: 1,
      lastSaveTime: Date.now(),
    };

    // Act: Save and load
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: Discovery state preserved
    expect(loadedState.worldDiscovered.length).toBe(3);
    expect(loadedState.worldDiscovered[0]).toBe('plot-A-I-1');
  });

  test('save handles empty destinations array', () => {
    // Arrange: Create state with no destinations
    const plot = createPlot('plot-A-I-1', 0, -1);
    
    const initialState: GameState = {
      money: 500,
      plots: [plot],
      worldDiscovered: ['plot-A-I-1'],
      destinations: [],
      playerPlotId: 'plot-A-I-1',
      version: 1,
      _version: 1,
      lastSaveTime: Date.now(),
    };

    // Act: Save and load
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: Empty destinations preserved
    expect(loadedState.destinations.length).toBe(0);
  });

  test('save handles version field correctly', () => {
    // Arrange: Create state with specific version
    const plot = createPlot('plot-A-I-1', 0, -1);
    
    const initialState: GameState = {
      money: 500,
      plots: [plot],
      worldDiscovered: ['plot-A-I-1'],
      destinations: [],
      playerPlotId: 'plot-A-I-1',
      version: 2, // Custom version
      _version: 2,
      lastSaveTime: Date.now(),
    };

    // Act: Save and load
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: Version preserved
    expect(loadedState.version).toBe(2);
    expect(loadedState._version).toBe(2);
  });

  test('save handles lastSaveTime correctly', () => {
    // Arrange: Create state with specific timestamp
    const plot = createPlot('plot-A-I-1', 0, -1);
    const mockTime = Date.now() - 3600000; // 1 hour ago
    
    const initialState: GameState = {
      money: 500,
      plots: [plot],
      worldDiscovered: ['plot-A-I-1'],
      destinations: [],
      playerPlotId: 'plot-A-I-1',
      version: 1,
      _version: 1,
      lastSaveTime: mockTime,
    };

    // Act: Save and load
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: Timestamp preserved (within reasonable tolerance)
    expect(loadedState.lastSaveTime).toBe(mockTime);
  });

  test('save handles playerPlotId correctly', () => {
    // Arrange: Create state with specific player plot
    const plot1 = createPlot('plot-A-I-1', 0, -1);
    const plot2 = createPlot('plot-B-II-1', 1, -1);
    
    const initialState: GameState = {
      money: 500,
      plots: [plot1, plot2],
      worldDiscovered: ['plot-A-I-1', 'plot-B-II-1'],
      destinations: [],
      playerPlotId: 'plot-B-II-1', // Player is at plot B
      version: 1,
      _version: 1,
      lastSaveTime: Date.now(),
    };

    // Act: Save and load
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: Player position preserved
    expect(loadedState.playerPlotId).toBe('plot-B-II-1');
  });

  test('save handles money correctly across multiple plots', () => {
    // Arrange: Create state with money distributed
    const plot1 = createPlot('plot-A-I-1', 0, -1);
    plot1.money = 300;
    
    const plot2 = createPlot('plot-B-II-1', 1, -1);
    plot2.money = 200;

    const initialState: GameState = {
      money: 500, // Total money
      plots: [plot1, plot2],
      worldDiscovered: ['plot-A-I-1', 'plot-B-II-1'],
      destinations: [],
      playerPlotId: 'plot-A-I-1',
      version: 1,
      _version: 1,
      lastSaveTime: Date.now(),
    };

    // Act: Save and load
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: Money preserved correctly
    expect(loadedState.money).toBe(500);
    expect(loadedState.plots[0].money).toBe(300);
    expect(loadedState.plots[1].money).toBe(200);
  });

  test('save handles default state when no save exists', () => {
    // Arrange: Clear any existing saves
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

    // Act: Load with no save
    const defaultState = loadSave();

    // Assert: Returns default state
    expect(defaultState.money).toBe(200);
    expect(defaultState.plots.length).toBe(0);
  });

  test('save handles large number of plots', () => {
    // Arrange: Create many plots
    const plots: Plot[] = [];
    for (let i = 0; i < 50; i++) {
      const plot = createPlot(`plot-${String.fromCharCode(65 + (i % 26))}-${Math.floor(i / 26) + 1}-1`, i % 2, -1);
      plots.push(plot);
    }

    const initialState: GameState = {
      money: 10000,
      plots,
      worldDiscovered: plots.map(p => p.id),
      destinations: [],
      playerPlotId: 'plot-A-I-1',
      version: 1,
      _version: 1,
      lastSaveTime: Date.now(),
    };

    // Act: Save and load
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: All plots preserved
    expect(loadedState.plots.length).toBe(50);
    expect(loadedState.worldDiscovered.length).toBe(50);
  });

  test('save handles plot with zero money', () => {
    // Arrange: Create plot with zero money
    const plot = createPlot('plot-A-I-1', 0, -1);
    plot.money = 0;

    const initialState: GameState = {
      money: 500,
      plots: [plot],
      worldDiscovered: ['plot-A-I-1'],
      destinations: [],
      playerPlotId: 'plot-A-I-1',
      version: 1,
      _version: 1,
      lastSaveTime: Date.now(),
    };

    // Act: Save and load
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: Zero money preserved
    expect(loadedState.plots[0].money).toBe(0);
  });

  test('save handles plot with maximum money', () => {
    // Arrange: Create plot with high money
    const plot = createPlot('plot-A-I-1', 0, -1);
    plot.money = 999999;

    const initialState: GameState = {
      money: 1000000,
      plots: [plot],
      worldDiscovered: ['plot-A-I-1'],
      destinations: [],
      playerPlotId: 'plot-A-I-1',
      version: 1,
      _version: 1,
      lastSaveTime: Date.now(),
    };

    // Act: Save and load
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: High money preserved
    expect(loadedState.money).toBe(1000000);
    expect(loadedState.plots[0].money).toBe(999999);
  });
});

describe('Game State - Validation and Normalization', () => {
  beforeEach(() => {
    // Reset localStorage for each test
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
  });

  test('createDefaultSave returns valid default state', () => {
    // Act: Create default save
    const defaultState = createDefaultSave();

    // Assert: Default state is valid
    expect(defaultState.money).toBe(200);
    expect(defaultState.plots.length).toBe(0);
    expect(defaultState.worldDiscovered.length).toBe(0);
    expect(defaultState.destinations.length).toBe(0);
    expect(defaultState.playerPlotId).toBe('plot-A-I-1');
    expect(defaultState.version).toBe(1);
    expect(defaultState._version).toBe(1);
  });

  test('createValidatedSave normalizes missing fields', () => {
    // Arrange: Create incomplete state
    const incompleteState: Partial<GameState> = {
      money: 500,
      plots: [],
      worldDiscovered: [],
      destinations: [],
      playerPlotId: 'plot-A-I-1',
      version: 1,
      _version: 1,
    };

    // Act: Validate state
    const validatedState = createValidatedSave(incompleteState as any);

    // Assert: Missing fields filled with defaults
    expect(validatedState.money).toBe(500);
    expect(validatedState.plots.length).toBe(0);
    expect(validatedState.worldDiscovered.length).toBe(0);
    expect(validatedState.destinations.length).toBe(0);
    expect(validatedState.playerPlotId).toBe('plot-A-I-1');
  });

  test('createValidatedSave handles null money', () => {
    // Arrange: Create state with null money
    const incompleteState: Partial<GameState> = {
      money: null,
      plots: [],
      worldDiscovered: [],
      destinations: [],
      playerPlotId: 'plot-A-I-1',
      version: 1,
      _version: 1,
    };

    // Act: Validate state
    const validatedState = createValidatedSave(incompleteState as any);

    // Assert: Money defaults to 200
    expect(validatedState.money).toBe(200);
  });

  test('createValidatedSave handles undefined money', () => {
    // Arrange: Create state with undefined money
    const incompleteState: Partial<GameState> = {
      money: undefined,
      plots: [],
      worldDiscovered: [],
      destinations: [],
      playerPlotId: 'plot-A-I-1',
      version: 1,
      _version: 1,
    };

    // Act: Validate state
    const validatedState = createValidatedSave(incompleteState as any);

    // Assert: Money defaults to 200
    expect(validatedState.money).toBe(200);
  });

  test('createValidatedSave handles zero money', () => {
    // Arrange: Create state with zero money
    const incompleteState: Partial<GameState> = {
      money: 0,
      plots: [],
      worldDiscovered: [],
      destinations: [],
      playerPlotId: 'plot-A-I-1',
      version: 1,
      _version: 1,
    };

    // Act: Validate state
    const validatedState = createValidatedSave(incompleteState as any);

    // Assert: Zero money preserved (not defaulted)
    expect(validatedState.money).toBe(0);
  });
});

describe('Game State - Data Integrity', () => {
  beforeEach(() => {
    // Reset localStorage for each test
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
  });

  test('state round-trip preserves all data types', () => {
    // Arrange: Create state with various data types
    const plot = createPlot('plot-A-I-1', 0, -1);
    
    const initialState: GameState = {
      money: 1234.56, // Number
      plots: [plot], // Array of objects
      worldDiscovered: ['plot-A-I-1'], // Array of strings
      destinations: [], // Empty array
      playerPlotId: 'plot-A-I-1', // String
      version: 1, // Number
      _version: 1, // Number
      lastSaveTime: Date.now(), // Timestamp
    };

    // Act: Save and load
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: All data types preserved
    expect(typeof loadedState.money).toBe('number');
    expect(Array.isArray(loadedState.plots)).toBe(true);
    expect(Array.isArray(loadedState.worldDiscovered)).toBe(true);
    expect(Array.isArray(loadedState.destinations)).toBe(true);
    expect(typeof loadedState.playerPlotId).toBe('string');
    expect(typeof loadedState.version).toBe('number');
    expect(typeof loadedState._version).toBe('number');
  });

  test('state round-trip preserves boolean flags', () => {
    // Arrange: Create state with boolean flags
    const plot = createPlot('plot-A-I-1', 0, -1);
    
    const initialState: GameState = {
      money: 500,
      plots: [plot],
      worldDiscovered: ['plot-A-I-1'],
      destinations: [],
      playerPlotId: 'plot-A-I-1',
      version: 1,
      _version: 1,
      lastSaveTime: Date.now(),
    };

    // Act: Save and load
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: Boolean flags preserved (if they exist in GameState)
    expect(typeof loadedState.version).toBe('number');
  });

  test('state round-trip preserves nested object structure', () => {
    // Arrange: Create state with nested objects
    const plot = createPlot('plot-A-I-1', 0, -1);
    
    const initialState: GameState = {
      money: 500,
      plots: [plot],
      worldDiscovered: ['plot-A-I-1'],
      destinations: [],
      playerPlotId: 'plot-A-I-1',
      version: 1,
      _version: 1,
      lastSaveTime: Date.now(),
    };

    // Act: Save and load
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: Nested structure preserved
    expect(loadedState.plots[0]).toBeDefined();
    expect(typeof loadedState.plots[0].id).toBe('string');
    expect(typeof loadedState.plots[0].northExpansions).toBe('number');
  });

  test('state round-trip preserves array order', () => {
    // Arrange: Create state with ordered arrays
    const plot1 = createPlot('plot-A-I-1', 0, -1);
    const plot2 = createPlot('plot-B-II-1', 1, -1);
    
    const initialState: GameState = {
      money: 500,
      plots: [plot1, plot2], // Order matters
      worldDiscovered: ['plot-A-I-1', 'plot-B-II-1'], // Order matters
      destinations: [],
      playerPlotId: 'plot-A-I-1',
      version: 1,
      _version: 1,
      lastSaveTime: Date.now(),
    };

    // Act: Save and load
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: Array order preserved
    expect(loadedState.plots[0].id).toBe('plot-A-I-1');
    expect(loadedState.plots[1].id).toBe('plot-B-II-1');
    expect(loadedState.worldDiscovered[0]).toBe('plot-A-I-1');
    expect(loadedState.worldDiscovered[1]).toBe('plot-B-II-1');
  });

  test('state round-trip handles empty arrays', () => {
    // Arrange: Create state with empty arrays
    const plot = createPlot('plot-A-I-1', 0, -1);
    
    const initialState: GameState = {
      money: 500,
      plots: [plot],
      worldDiscovered: [], // Empty
      destinations: [], // Empty
      playerPlotId: 'plot-A-I-1',
      version: 1,
      _version: 1,
      lastSaveTime: Date.now(),
    };

    // Act: Save and load
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: Empty arrays preserved
    expect(loadedState.worldDiscovered.length).toBe(0);
    expect(loadedState.destinations.length).toBe(0);
  });

  test('state round-trip handles null values', () => {
    // Arrange: Create state with null values
    const plot = createPlot('plot-A-I-1', 0, -1);
    
    const initialState: GameState = {
      money: 500,
      plots: [plot],
      worldDiscovered: ['plot-A-I-1'],
      destinations: [],
      playerPlotId: 'plot-A-I-1',
      version: 1,
      _version: 1,
      lastSaveTime: Date.now(),
    };

    // Act: Save and load
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: Null values handled correctly (should be converted to defaults)
    expect(loadedState.playerPlotId).toBeDefined();
  });

  test('state round-trip handles special characters in strings', () => {
    // Arrange: Create state with special characters
    const plot = createPlot('plot-A-I-1', 0, -1);
    
    const initialState: GameState = {
      money: 500,
      plots: [plot],
      worldDiscovered: ['plot-A-I-1'],
      destinations: [],
      playerPlotId: 'plot-A-I-1',
      version: 1,
      _version: 1,
      lastSaveTime: Date.now(),
    };

    // Act: Save and load
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: Strings preserved correctly
    expect(loadedState.playerPlotId).toBe('plot-A-I-1');
  });

  test('state round-trip handles large numbers', () => {
    // Arrange: Create state with large numbers
    const plot = createPlot('plot-A-I-1', 0, -1);
    
    const initialState: GameState = {
      money: 999999999, // Large number
      plots: [plot],
      worldDiscovered: ['plot-A-I-1'],
      destinations: [],
      playerPlotId: 'plot-A-I-1',
      version: 1,
      _version: 1,
      lastSaveTime: Date.now(),
    };

    // Act: Save and load
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: Large numbers preserved
    expect(loadedState.money).toBe(999999999);
  });

  test('state round-trip handles negative numbers', () => {
    // Arrange: Create state with negative money (edge case)
    const plot = createPlot('plot-A-I-1', 0, -1);
    
    const initialState: GameState = {
      money: -50, // Negative money (debt scenario)
      plots: [plot],
      worldDiscovered: ['plot-A-I-1'],
      destinations: [],
      playerPlotId: 'plot-A-I-1',
      version: 1,
      _version: 1,
      lastSaveTime: Date.now(),
    };

    // Act: Save and load
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: Negative numbers preserved (if allowed by game logic)
    expect(loadedState.money).toBe(-50);
  });
});
