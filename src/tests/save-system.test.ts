import { describe, beforeEach, test, expect } from 'vitest';
import { GameState, Plot, WorldCell, Destination, Miner, Tile } from '../../core/types/state';
import { loadSave, saveGame, createDefaultSave, createValidatedSave, migrateSave } from '../../save/save';

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

const SAVE_KEY = 'mcc_save';

describe('Save System - Full State Serialization', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  test('full game state serializes to valid JSON', () => {
    // Arrange: Create a complete game state with all fields
    const initialState: GameState = {
      money: 1500,
      playerPlotId: 'plot-A-I-1',
      plots: [
        {
          id: 'plot-A-I-1',
          northExpansions: 0,
          undergroundLevels: 2,
          softCleared: true,
          hardCleared: false,
          ageResources: { coal: 50, oil: 25, copper: 10, superAlloy: 2 },
          currentAge: 'diesel',
          availableAges: ['basic', 'steam', 'diesel'],
          stationBuilt: true,
          stationId: 'station-plot-A-I-1',
          tiles: [],
          miners: []
        }
      ],
      worldDiscovered: ['plot-A-I-1', 'city-B-II-2', 'factory-C-I-3'],
      worldGrid: [
        { id: 'plot-A-I-1', name: 'Plot A I 1', type: 'plot', q: 0, r: 0, discovered: true },
        { id: 'city-B-II-2', name: 'City B II 2', type: 'city', q: 1, r: -1, discovered: true },
      ],
      destinations: [
        { id: 'city-B-II-2', name: 'City B', type: 'city', distance: 15000, basePayout: 500, discovered: true },
        { id: 'factory-C-I-3', name: 'Factory C', type: 'factory', distance: 8000, basePayout: 200, discovered: true }
      ],
      engineeringIdeas: 5,
      resetCount: 2,
      version: 1,
      lastSaveTime: Date.now() - 3600000 // 1 hour ago
    };

    // Act: Save the state
    saveGame(initialState);

    // Assert: Load it back and verify all fields are preserved
    const loadedState = loadSave();
    
    expect(loadedState.money).toBe(1500);
    expect(loadedState.playerPlotId).toBe('plot-A-I-1');
    expect(loadedState.plots.length).toBe(1);
    expect(loadedState.plots[0].id).toBe('plot-A-I-1');
    expect(loadedState.worldDiscovered.length).toBe(3);
    expect(loadedState.worldGrid.length).toBe(2);
    expect(loadedState.destinations.length).toBe(2);
    expect(loadedState.engineeringIdeas).toBe(5);
    expect(loadedState.resetCount).toBe(2);
    expect(loadedState.version).toBe(1);
  });

  test('save includes _version and _savedAt metadata', () => {
    // Arrange: Create state
    const initialState: GameState = {
      money: 500,
      playerPlotId: 'plot-A-I-1',
      plots: [],
      worldDiscovered: ['plot-A-I-1'],
      worldGrid: [],
      destinations: [],
      engineeringIdeas: 0,
      resetCount: 0,
      version: 1,
      lastSaveTime: Date.now()
    };

    // Act: Save and verify metadata is added
    saveGame(initialState);
    const savedData = JSON.parse(localStorage.getItem(SAVE_KEY)!);

    // Assert: Metadata fields are present
    expect(savedData._version).toBe(1);
    expect(savedData._savedAt).toBeDefined();
    expect(typeof savedData._savedAt).toBe('number');
  });

  test('round-trip serialization preserves exact values', () => {
    // Arrange: Create state with specific values
    const originalState: GameState = {
      money: 12345.67,
      playerPlotId: 'plot-B-II-2',
      plots: [],
      worldDiscovered: ['plot-B-II-2'],
      worldGrid: [],
      destinations: [],
      engineeringIdeas: 15,
      resetCount: 3,
      version: 1,
      lastSaveTime: Date.now() - 1000
    };

    // Act: Save and reload
    saveGame(originalState);
    const loadedState = loadSave();

    // Assert: All numeric values preserved exactly
    expect(loadedState.money).toBe(12345.67);
    expect(loadedState.engineeringIdeas).toBe(15);
    expect(loadedState.resetCount).toBe(3);
  });

  test('save handles large money values correctly', () => {
    // Arrange: Create state with very large money
    const initialState: GameState = {
      money: 999999999999, // Nearly 1 trillion
      playerPlotId: 'plot-A-I-1',
      plots: [],
      worldDiscovered: ['plot-A-I-1'],
      worldGrid: [],
      destinations: [],
      engineeringIdeas: 0,
      resetCount: 0,
      version: 1,
      lastSaveTime: Date.now()
    };

    // Act: Save and reload
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: Large values preserved without precision loss
    expect(loadedState.money).toBe(999999999999);
  });

  test('save handles zero values correctly', () => {
    // Arrange: Create state with zero values
    const initialState: GameState = {
      money: 0,
      playerPlotId: 'plot-A-I-1',
      plots: [],
      worldDiscovered: [],
      worldGrid: [],
      destinations: [],
      engineeringIdeas: 0,
      resetCount: 0,
      version: 1,
      lastSaveTime: Date.now()
    };

    // Act: Save and reload
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: Zero values preserved (not converted to defaults)
    expect(loadedState.money).toBe(0);
    expect(loadedState.engineeringIdeas).toBe(0);
    expect(loadedState.resetCount).toBe(0);
  });
});

describe('Save System - Default State Creation', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  test('createDefaultSave generates complete initial state', () => {
    // Act: Create default save
    const defaultState = createDefaultSave();

    // Assert: All required fields present with correct defaults
    expect(defaultState.money).toBe(200);
    expect(defaultState.playerPlotId).toBe('plot-A-I-1');
    expect(defaultState.plots.length).toBe(0);
    expect(defaultState.worldDiscovered.length).toBe(1);
    expect(defaultState.worldDiscovered[0]).toBe('plot-A-I-1');
    expect(defaultState.worldGrid.length).toBeGreaterThan(0); // Has world grid
    expect(defaultState.destinations.length).toBe(0);
    expect(defaultState.engineeringIdeas).toBe(0);
    expect(defaultState.resetCount).toBe(0);
    expect(defaultState.version).toBe(1);
    expect(defaultState.lastSaveTime).toBeDefined();
    expect(typeof defaultState.lastSaveTime).toBe('number');
  });

  test('default save includes generated world grid', () => {
    // Act: Create default save
    const defaultState = createDefaultSave();

    // Assert: World grid has expected structure
    expect(defaultState.worldGrid.length).toBe(19); // 3-ring hex grid
    expect(defaultState.worldGrid[0].id).toBe('plot-A-I-1');
    expect(defaultState.worldGrid[0].type).toBe('plot');
    expect(defaultState.worldGrid[0].discovered).toBe(true);
  });

  test('default save creates initial plot', () => {
    // Act: Create default save
    const defaultState = createDefaultSave();

    // Assert: Initial plot exists with correct structure
    const initialPlot = defaultState.worldGrid.find(cell => cell.id === 'plot-A-I-1');
    expect(initialPlot).toBeDefined();
    expect(initialPlot?.discovered).toBe(true);
  });
});

describe('Save System - Validation and Normalization', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  test('createValidatedSave normalizes missing fields to defaults', () => {
    // Arrange: Create incomplete save data
    const incompleteSave: Partial<GameState> = {
      money: undefined, // Missing
      playerPlotId: 'plot-A-I-1',
      plots: [],
      worldDiscovered: undefined, // Missing
      worldGrid: [],
      destinations: undefined, // Missing
      engineeringIdeas: undefined, // Missing
      resetCount: undefined, // Missing
      version: 1,
      lastSaveTime: Date.now()
    };

    // Act: Validate and normalize
    const validatedState = createValidatedSave(incompleteSave as any);

    // Assert: Missing fields use correct defaults
    expect(validatedState.money).toBe(200); // Default money
    expect(validatedState.worldDiscovered.length).toBe(0);
    expect(validatedState.destinations.length).toBe(0);
    expect(validatedState.engineeringIdeas).toBe(0);
    expect(validatedState.resetCount).toBe(0);
  });

  test('createValidatedSave preserves existing values when present', () => {
    // Arrange: Create save with some fields
    const partialSave: Partial<GameState> = {
      money: 750,
      playerPlotId: 'plot-A-I-1',
      plots: [],
      worldDiscovered: ['city-X'],
      worldGrid: [],
      destinations: [],
      engineeringIdeas: 10,
      resetCount: 1,
      version: 1,
      lastSaveTime: Date.now() - 5000
    };

    // Act: Validate and normalize
    const validatedState = createValidatedSave(partialSave as any);

    // Assert: Existing values preserved
    expect(validatedState.money).toBe(750);
    expect(validatedState.worldDiscovered[0]).toBe('city-X');
    expect(validatedState.engineeringIdeas).toBe(10);
    expect(validatedState.resetCount).toBe(1);
  });

  test('createValidatedSave handles null values as missing', () => {
    // Arrange: Create save with null values
    const nullSave: Partial<GameState> = {
      money: null,
      playerPlotId: 'plot-A-I-1',
      plots: [],
      worldDiscovered: null,
      worldGrid: [],
      destinations: null,
      engineeringIdeas: null,
      resetCount: null,
      version: 1,
      lastSaveTime: Date.now()
    };

    // Act: Validate and normalize
    const validatedState = createValidatedSave(nullSave as any);

    // Assert: Null values treated as missing and use defaults
    expect(validatedState.money).toBe(200);
    expect(validatedState.engineeringIdeas).toBe(0);
    expect(validatedState.resetCount).toBe(0);
  });

  test('createValidatedSave handles zero money correctly', () => {
    // Arrange: Create save with zero money
    const zeroMoneySave: Partial<GameState> = {
      money: 0,
      playerPlotId: 'plot-A-I-1',
      plots: [],
      worldDiscovered: [],
      worldGrid: [],
      destinations: [],
      engineeringIdeas: 0,
      resetCount: 0,
      version: 1,
      lastSaveTime: Date.now()
    };

    // Act: Validate and normalize
    const validatedState = createValidatedSave(zeroMoneySave as any);

    // Assert: Zero money is preserved (not converted to default)
    expect(validatedState.money).toBe(0);
  });
});

describe('Save System - Error Handling', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  test('loadSave returns default state when no save exists', () => {
    // Act: Load non-existent save
    const loadedState = loadSave();

    // Assert: Returns default state
    expect(loadedState.money).toBe(200);
    expect(loadedState.playerPlotId).toBe('plot-A-I-1');
  });

  test('loadSave handles corrupted JSON gracefully', () => {
    // Arrange: Store corrupted data
    mockStorage.set(SAVE_KEY, 'this is not valid json {{{');

    // Act: Load corrupted save
    const loadedState = loadSave();

    // Assert: Falls back to default state
    expect(loadedState.money).toBe(200);
  });

  test('loadSave handles malformed JSON with missing required fields', () => {
    // Arrange: Store incomplete JSON
    mockStorage.set(SAVE_KEY, JSON.stringify({
      money: 500,
      // Missing other required fields
    }));

    // Act: Load incomplete save
    const loadedState = loadSave();

    // Assert: Falls back to default state (catches malformed JSON)
    expect(loadedState.money).toBe(200); // Default money from createDefaultSave
    expect(loadedState.playerPlotId).toBeDefined();
    expect(loadedState.plots).toBeDefined();
  });

  test('loadSave handles JSON with wrong version', () => {
    // Arrange: Store old version save
    mockStorage.set(SAVE_KEY, JSON.stringify({
      money: 300,
      playerPlotId: 'plot-A-I-1',
      plots: [],
      worldDiscovered: ['plot-A-I-1'],
      worldGrid: [],
      destinations: [],
      engineeringIdeas: 0,
      resetCount: 0,
      version: 0, // Old version (not _version)
      lastSaveTime: Date.now() - 86400000
    }));

    // Act: Load old version save
    const loadedState = loadSave();

    // Assert: Handles version mismatch gracefully (falls back to default since no _version field)
    expect(loadedState.money).toBe(200); // Default from createDefaultSave
    expect(loadedState.version).toBe(1); // Should be updated to current version
  });
});

describe('Save System - Version Migration', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  test('migrateSave adds missing fields for version upgrade', () => {
    // Arrange: Create old version save
    const oldVersionSave: Partial<GameState> = {
      money: 400,
      playerPlotId: 'plot-A-I-1',
      plots: [],
      worldDiscovered: ['plot-A-I-1'],
      worldGrid: [],
      destinations: [],
      engineeringIdeas: 3,
      resetCount: 1,
      version: 0, // Old version
      lastSaveTime: Date.now() - 86400000
    };

    // Act: Migrate to new version (pass the full object)
    const migrated = migrateSave(oldVersionSave, 1);

    // Assert: Migration adds missing metadata
    expect(migrated._version).toBe(1);
    expect(migrated.lastSaveTime).toBeDefined();
    expect(migrated.money).toBe(400); // Existing data preserved
  });

  test('migrateSave preserves all existing data during upgrade', () => {
    // Arrange: Create old version save with data
    const oldVersionSave: Partial<GameState> = {
      money: 1234,
      playerPlotId: 'plot-B-II-2',
      plots: [{ 
        id: 'plot-B-II-2', 
        northExpansions: 1,
        undergroundLevels: 0,
        softCleared: false,
        hardCleared: false,
        ageResources: { coal: 0, oil: 0, copper: 0, superAlloy: 0 },
        currentAge: 'basic',
        availableAges: ['basic'],
        stationBuilt: false,
        stationId: null,
        tiles: [],
        miners: []
      }],
      worldDiscovered: ['plot-B-II-2', 'city-C-III-3'],
      worldGrid: [],
      destinations: [{ id: 'city-C-III-3', name: 'City C', type: 'city', distance: 10000, basePayout: 500, discovered: true }],
      engineeringIdeas: 7,
      resetCount: 2,
      version: 0,
      lastSaveTime: Date.now() - 172800000
    };

    // Act: Migrate to new version (pass the full object)
    const migrated = migrateSave(oldVersionSave, 1);

    // Assert: All existing data preserved
    expect(migrated.money).toBe(1234);
    expect(migrated.playerPlotId).toBe('plot-B-II-2');
    expect(migrated.plots.length).toBe(1);
    expect(migrated.engineeringIdeas).toBe(7);
    expect(migrated.resetCount).toBe(2);
  });
});

describe('Save System - Data Integrity', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  test('all GameState fields persist correctly through save/load cycle', () => {
    // Arrange: Create complete state with all field types
    const initialState: GameState = {
      money: 5000,
      playerPlotId: 'plot-A-I-1',
      plots: [
        {
          id: 'plot-A-I-1',
          northExpansions: 2,
          undergroundLevels: 3,
          softCleared: true,
          hardCleared: false,
          ageResources: { coal: 100, oil: 50, copper: 25, superAlloy: 5 },
          currentAge: 'electric',
          availableAges: ['basic', 'steam', 'diesel', 'electric'],
          stationBuilt: true,
          stationId: 'station-plot-A-I-1',
          tiles: [],
          miners: []
        }
      ],
      worldDiscovered: ['plot-A-I-1', 'city-B-II-2', 'factory-C-I-3', 'city-D-IV-4'],
      worldGrid: [
        { id: 'plot-A-I-1', name: 'Plot A I 1', type: 'plot', q: 0, r: 0, discovered: true },
        { id: 'city-B-II-2', name: 'City B', type: 'city', q: 1, r: -1, discovered: true },
        { id: 'factory-C-I-3', name: 'Factory C', type: 'factory', q: -1, r: -1, discovered: true },
        { id: 'city-D-IV-4', name: 'City D', type: 'city', q: 2, r: -2, discovered: true }
      ],
      destinations: [
        { id: 'city-B-II-2', name: 'City B', type: 'city', distance: 15000, basePayout: 500, discovered: true },
        { id: 'factory-C-I-3', name: 'Factory C', type: 'factory', distance: 8000, basePayout: 200, discovered: true },
        { id: 'city-D-IV-4', name: 'City D', type: 'city', distance: 25000, basePayout: 750, discovered: true }
      ],
      engineeringIdeas: 12,
      resetCount: 3,
      version: 1,
      lastSaveTime: Date.now() - 3600000
    };

    // Act: Save and reload
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: All fields preserved with correct types
    expect(loadedState.money).toBe(5000);
    expect(loadedState.playerPlotId).toBe('plot-A-I-1');
    expect(loadedState.plots.length).toBe(1);
    expect(loadedState.plots[0].northExpansions).toBe(2);
    expect(loadedState.plots[0].undergroundLevels).toBe(3);
    expect(loadedState.plots[0].softCleared).toBe(true);
    expect(loadedState.plots[0].hardCleared).toBe(false);
    expect(loadedState.plots[0].ageResources.coal).toBe(100);
    expect(loadedState.plots[0].ageResources.oil).toBe(50);
    expect(loadedState.plots[0].ageResources.copper).toBe(25);
    expect(loadedState.plots[0].ageResources.superAlloy).toBe(5);
    expect(loadedState.plots[0].currentAge).toBe('electric');
    expect(loadedState.plots[0].availableAges.length).toBe(4);
    expect(loadedState.plots[0].stationBuilt).toBe(true);
    expect(loadedState.plots[0].stationId).toBe('station-plot-A-I-1');
    expect(loadedState.worldDiscovered.length).toBe(4);
    expect(loadedState.worldGrid.length).toBe(4);
    expect(loadedState.destinations.length).toBe(3);
    expect(loadedState.engineeringIdeas).toBe(12);
    expect(loadedState.resetCount).toBe(3);
    expect(loadedState.version).toBe(1);
  });

  test('world grid cells maintain correct structure', () => {
    // Arrange: Create state with world grid
    const initialState: GameState = {
      money: 500,
      playerPlotId: 'plot-A-I-1',
      plots: [],
      worldDiscovered: ['plot-A-I-1'],
      worldGrid: [
        { id: 'plot-A-I-1', name: 'Plot A I 1', type: 'plot', q: 0, r: 0, discovered: true },
        { id: 'city-B-II-2', name: 'City B', type: 'city', q: 1, r: -1, discovered: true },
        { id: 'fog-X', name: '', type: 'fog', q: 2, r: -2, discovered: false }
      ],
      destinations: [],
      engineeringIdeas: 0,
      resetCount: 0,
      version: 1,
      lastSaveTime: Date.now()
    };

    // Act: Save and reload
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: World grid cells maintain structure
    expect(loadedState.worldGrid[0].id).toBe('plot-A-I-1');
    expect(loadedState.worldGrid[0].type).toBe('plot');
    expect(loadedState.worldGrid[0].discovered).toBe(true);
    expect(loadedState.worldGrid[2].type).toBe('fog');
    expect(loadedState.worldGrid[2].discovered).toBe(false);
  });

  test('destinations maintain correct type information', () => {
    // Arrange: Create state with destinations
    const initialState: GameState = {
      money: 500,
      playerPlotId: 'plot-A-I-1',
      plots: [],
      worldDiscovered: [],
      worldGrid: [],
      destinations: [
        { id: 'city-X', name: 'City X', type: 'city', distance: 10000, basePayout: 300, discovered: true },
        { id: 'factory-Y', name: 'Factory Y', type: 'factory', distance: 5000, basePayout: 150, discovered: true }
      ],
      engineeringIdeas: 0,
      resetCount: 0,
      version: 1,
      lastSaveTime: Date.now()
    };

    // Act: Save and reload
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: Destination types preserved
    expect(loadedState.destinations[0].type).toBe('city');
    expect(loadedState.destinations[1].type).toBe('factory');
    expect(loadedState.destinations[0].distance).toBe(10000);
    expect(loadedState.destinations[1].basePayout).toBe(150);
  });
});

describe('Save System - Edge Cases', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  test('save handles empty arrays correctly', () => {
    // Arrange: Create state with empty arrays
    const initialState: GameState = {
      money: 500,
      playerPlotId: 'plot-A-I-1',
      plots: [],
      worldDiscovered: [],
      worldGrid: [],
      destinations: [],
      engineeringIdeas: 0,
      resetCount: 0,
      version: 1,
      lastSaveTime: Date.now()
    };

    // Act: Save and reload
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: Empty arrays preserved
    expect(loadedState.plots).toEqual([]);
    expect(loadedState.worldDiscovered).toEqual([]);
    expect(loadedState.destinations).toEqual([]);
  });

  test('save handles very large array sizes', () => {
    // Arrange: Create state with many plots
    const manyPlots: Plot[] = [];
    for (let i = 0; i < 100; i++) {
      manyPlots.push({
        id: `plot-${String.fromCharCode(65 + Math.floor(i / 9))}-${Math.floor(i / 3)}-${(i % 3) + 1}`,
        northExpansions: 0,
        undergroundLevels: 0,
        softCleared: false,
        hardCleared: false,
        ageResources: { coal: 0, oil: 0, copper: 0, superAlloy: 0 },
        currentAge: 'basic',
        availableAges: ['basic'],
        stationBuilt: false,
        stationId: null,
        tiles: [],
        miners: []
      });
    }

    const initialState: GameState = {
      money: 1000,
      playerPlotId: manyPlots[0].id,
      plots: manyPlots,
      worldDiscovered: manyPlots.map(p => p.id),
      worldGrid: [],
      destinations: [],
      engineeringIdeas: 0,
      resetCount: 0,
      version: 1,
      lastSaveTime: Date.now()
    };

    // Act: Save and reload
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: Large arrays preserved
    expect(loadedState.plots.length).toBe(100);
    expect(loadedState.worldDiscovered.length).toBe(100);
  });

  test('save handles negative underground levels', () => {
    // Arrange: Create plot with negative underground levels
    const initialState: GameState = {
      money: 500,
      playerPlotId: 'plot-A-I-1',
      plots: [
        {
          id: 'plot-A-I-1',
          northExpansions: 0,
          undergroundLevels: -3, // Negative level
          softCleared: true,
          hardCleared: false,
          ageResources: { coal: 50, oil: 25, copper: 10, superAlloy: 2 },
          currentAge: 'diesel',
          availableAges: ['basic', 'steam', 'diesel'],
          stationBuilt: true,
          stationId: 'station-plot-A-I-1',
          tiles: [],
          miners: []
        }
      ],
      worldDiscovered: ['plot-A-I-1'],
      worldGrid: [],
      destinations: [],
      engineeringIdeas: 0,
      resetCount: 0,
      version: 1,
      lastSaveTime: Date.now()
    };

    // Act: Save and reload
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: Negative levels preserved
    expect(loadedState.plots[0].undergroundLevels).toBe(-3);
  });

  test('save handles boolean flags correctly', () => {
    // Arrange: Create state with various boolean values
    const initialState: GameState = {
      money: 500,
      playerPlotId: 'plot-A-I-1',
      plots: [
        {
          id: 'plot-A-I-1',
          northExpansions: 0,
          undergroundLevels: 0,
          softCleared: true,
          hardCleared: false,
          ageResources: { coal: 0, oil: 0, copper: 0, superAlloy: 0 },
          currentAge: 'basic',
          availableAges: ['basic'],
          stationBuilt: true,
          stationId: null,
          tiles: [],
          miners: []
        }
      ],
      worldDiscovered: ['plot-A-I-1'],
      worldGrid: [],
      destinations: [],
      engineeringIdeas: 0,
      resetCount: 0,
      version: 1,
      lastSaveTime: Date.now()
    };

    // Act: Save and reload
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: Boolean flags preserved
    expect(loadedState.plots[0].softCleared).toBe(true);
    expect(loadedState.plots[0].hardCleared).toBe(false);
    expect(loadedState.plots[0].stationBuilt).toBe(true);
  });
});

describe('Save System - Integration with Money Tests', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  test('save system works correctly with money persistence tests', () => {
    // Arrange: Create state with specific money
    const initialState: GameState = {
      money: 250,
      playerPlotId: 'plot-A-I-1',
      plots: [],
      worldDiscovered: [],
      worldGrid: [],
      destinations: [],
      engineeringIdeas: 0,
      resetCount: 0,
      version: 1,
      lastSaveTime: Date.now()
    };

    // Act: Save and reload
    saveGame(initialState);
    const loadedState = loadSave();

    // Assert: Money persists correctly (integration with money tests)
    expect(loadedState.money).toBe(250);
  });

  test('money updates persist correctly through save system', () => {
    // Arrange: Start with $50
    saveGame({
      money: 50,
      playerPlotId: 'plot-A-I-1',
      plots: [],
      worldDiscovered: [],
      worldGrid: [],
      destinations: [],
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
