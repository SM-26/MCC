// src/save/save.ts

import { GameState } from '../core/types/state';

const SAVE_KEY = 'mcc_save';
const CURRENT_VERSION = 1;

export interface SaveData extends GameState {
  _version: number;
  _savedAt: number;
}

export function loadSave(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createDefaultSave();
    
    const saved: SaveData = JSON.parse(raw);
    
    // Version check and migration
    if (saved._version !== CURRENT_VERSION) {
      console.warn(`Save version mismatch: ${saved._version} vs ${CURRENT_VERSION}`);
      // Migration logic here
    }
    
    return createValidatedSave(saved);
  } catch (error) {
    console.error('Failed to load save:', error);
    return createDefaultSave();
  }
}

export function saveGame(state: GameState): void {
  const saveData: SaveData = {
    ...state,
    _version: CURRENT_VERSION,
    _savedAt: Date.now()
  };
  
  localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
}

export function createDefaultSave(): GameState {
  // Generate initial world grid (3-ring hex grid)
  const worldGrid = generateInitialWorldGrid();
  
  return {
    money: 200,
    playerPlotId: 'plot-A-I-1',
    plots: [],
    worldDiscovered: ['plot-A-I-1'],
    worldGrid,
    destinations: [],
    engineeringIdeas: 0,
    resetCount: 0,
    version: CURRENT_VERSION,
    lastSaveTime: Date.now()
  };
}

export function createValidatedSave(saved: SaveData): GameState {
  // Validate and normalize state
  const normalized = {
    money: saved.money ?? 200, // Default to $200 if undefined or null only (preserve 0)
    plots: saved.plots || [],
    worldDiscovered: saved.worldDiscovered || [],
    destinations: saved.destinations || [],
    playerPlotId: saved.playerPlotId,
    engineeringIdeas: Number(saved.engineeringIdeas || 0),
    resetCount: Number(saved.resetCount || 0),
    version: saved.version ?? CURRENT_VERSION,
    lastSaveTime: saved.lastSaveTime ?? Date.now(),
    worldGrid: saved.worldGrid,
    // Only include worldDiscovered if it exists (for backwards compatibility)
    ...(saved.worldDiscovered && { worldDiscovered: saved.worldDiscovered })
  };

  // Ensure player plot exists (only if plots array is empty, not if it has one plot)
  if (normalized.plots.length === 0 && !normalized.playerPlotId) {
    normalized.plots.push(createInitialPlot());
  }

  return normalized;
}

export function migrateSave(oldSave: Partial<GameState>, newVersion: number): SaveData {
  // Migration logic for version upgrades
  const migrated = structuredClone({} as any) as Partial<SaveData>;

  if (oldSave.version === 0 && newVersion === 1) {
    // Add missing fields with defaults
    migrated._version = newVersion;
    migrated.lastSaveTime = Date.now();
    // Copy over existing data that should be preserved
    migrated.money = oldSave.money ?? 200;
    migrated.playerPlotId = oldSave.playerPlotId ?? 'plot-A-I-1';
    migrated.plots = oldSave.plots || [];
    migrated.worldDiscovered = oldSave.worldDiscovered || [];
    migrated.destinations = oldSave.destinations || [];
    migrated.engineeringIdeas = Number(oldSave.engineeringIdeas ?? 0);
    migrated.resetCount = Number(oldSave.resetCount ?? 0);
    migrated.version = newVersion;
  }

  return migrated as SaveData;
}

// World grid generation (3-ring hex grid, 19 hexes total)
function generateInitialWorldGrid(): WorldCell[] {
  const cells: WorldCell[] = [];
  
  // Center plot (ring 0)
  cells.push(createHexCell('plot-A-I-1', 'Plot A I 1', 'plot', 0, 0));
  
  // Ring 1 (6 hexes)
  for (let i = 0; i < 6; i++) {
    const q = getRing1Coord(i);
    const r = getRing1CoordNext(i);
    const type = i === 3 ? 'city' : i === 0 ? 'factory' : 'fog';
    cells.push(createHexCell(
      `${type}-${i}`,
      type === 'plot' ? '' : `${type.charAt(0).toUpperCase()}${type.slice(1)} ${i + 1}`,
      type,
      q, r
    ));
  }
  
  // Ring 2 (12 hexes) - all fog for now
  for (let i = 0; i < 12; i++) {
    const q = getRing2Coord(i);
    const r = getRing2CoordNext(i);
    cells.push(createHexCell(
      `fog-${i + 6}`,
      '',
      'fog',
      q, r
    ));
  }
  
  return cells;
}

function createRing1Coords(): [number, number][] {
  return [
    [1, -1], [-1, -1], [-2, 0], [-1, 1], [0, 1], [1, 0]
  ];
}

function getRing1Coord(i: number): number {
  const coords = createRing1Coords();
  return coords[i % 6][0];
}

function getRing1CoordNext(i: number): number {
  const coords = createRing1Coords();
  return coords[(i + 1) % 6][1];
}

function getRing2Coords(): [number, number][][] {
  // Simplified ring 2 coordinates for hex grid
  return [
    [[0, -2], [1, -2], [2, -1], [2, 0], [1, 1], [0, 1], [-1, 0], [-2, -1], [-2, 0], [-1, 1], [0, 2], [1, 2]]
  ][0];
}

function getRing2Coord(i: number): number {
  const coords = getRing2Coords();
  return coords[i % 12][0];
}

function getRing2CoordNext(i: number): number {
  const coords = getRing2Coords();
  return coords[(i + 1) % 12][1];
}

function createHexCell(id: string, name: string, type: string, q: number, r: number): WorldCell {
  return {
    id,
    name,
    type,
    q,
    r,
    discovered: type === 'plot'
  };
}

// Initial plot creation
function createInitialPlot(): Plot {
  return {
    id: 'plot-A-I-1',
    northExpansions: 0,
    undergroundLevels: 0,
    softCleared: false,
    hardCleared: false,
    ageResources: { coal: 0, oil: 0, copper: 0, superAlloy: 0 },
    currentAge: 'basic',
    availableAges: ['basic'],
    stationBuilt: false,
    stationId: null,
    tiles: [], // Will be initialized when plot is dug
    miners: []
  };
}
