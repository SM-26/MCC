// src/logic/world/worldGen.ts

import seedrandom from 'seedrandom';
import type { SeededRng } from './worldNames';
import { pickUniquePlotName, pickUniqueCityName, pickFactoryNameForResources, createNameState } from './worldNames';
import type { NameState } from './worldNames';

import { getRingConfig, getRingTileCount, getMinCount, getMaxCount, getNormalizedWeights } from './worldBalance';
import type { RingConfig } from './worldBalance';

import { getHexRing, makeHex, hexCoordToId } from './hex';
import type { WorldCell, WorldCellType, ResourceType, WorldState } from './worldTypes';

// ============================================================================
// Seeded RNG
// ============================================================================

export function makeSeededRng(worldSeed: string, resetCount: number): SeededRng {
  const seedString = `${worldSeed}-${resetCount}`;
  return seedrandom(seedString);
}

// ============================================================================
// World Generation State
// ============================================================================

interface GenState {
  nameState: NameState;
  generatedCells: WorldCell[];
  nonEmptyCount: number;
  tileCounts: Record<WorldCellType, number>;
}

function createGenState(): GenState {
  return {
    nameState: createNameState(),
    generatedCells: [],
    nonEmptyCount: 0,
    tileCounts: {
      empty: 0,
      plot: 0,
      city: 0,
      factory: 0,
      blocker: 0,
    },
  };
}

// ============================================================================
// Ring Generation
// ============================================================================

/**
 * Generate all tiles for a specific ring of the world.
 * 
 * Ring 0 = starting plot only (center tile)
 * Ring 1 = 6 tiles surrounding center (first frontier)
 * Ring N = 6*N tiles (hexagonal expansion outward)
 * 
 * Each ring starts as fog and is revealed when player explores it.
 * 
 * @param ring - Ring number (0 = center, 1 = first ring around center, etc.)
 * @param rng - Seeded random number generator for deterministic generation
 * @param state - Generation state tracking tile counts, names, and progress
 * @returns Array of WorldCell objects for this ring, in clockwise order from East
 * 
 * @example
 * // Ring 0 generates just the starting plot
 * const ring0 = generateRing(0, rng, state);
 * // ring0.length === 1, ring0[0].type === 'plot'
 * 
 * @example
 * // Ring 1 generates 6 tiles around center
 * const ring1 = generateRing(1, rng, state);
 * // ring1.length === 6, may contain city/factory/empty based on balance config
 */
function generateRing(ring: number, rng: SeededRng, state: GenState): WorldCell[] {
  const center = makeHex(0, 0);
  const ringCoords = ring === 0 ? [center] : getHexRing(center, ring);
  const ringConfig = getRingConfig(ring);
  const totalTiles = getRingTileCount(ring);

  const cells: WorldCell[] = ringCoords.map((coord) => ({
    id: hexCoordToId(coord),
    name: '',
    type: 'empty',
    q: coord.q,
    r: coord.r,
    ring,
    discovered: false,
  }));

  const specialTiles = distributeSpecialTiles(ringConfig, totalTiles, rng, state, ring);
  const positions = shuffleArray(ringCoords, rng);

  for (let i = 0; i < specialTiles.length && i < positions.length; i++) {
    const tileType = specialTiles[i];
    const coord = positions[i];
    const cellIndex = cells.findIndex((c) => c.q === coord.q && c.r === coord.r);

    if (cellIndex === -1) {
      continue;
    }

    const name = generateTileName(tileType, state.nameState, rng, ring);
    const cell = cells[cellIndex];
    cell.type = tileType;
    cell.name = name;
    cell.discovered = ring === 0 && tileType === 'plot';

    state.tileCounts[tileType]++;
    state.nonEmptyCount++;
  }

  return cells;
}

/**
 * Distribute special tiles (city, factory, plot, blocker) across the ring.
 * 
 * Follows ring balance config to ensure:
 * - Minimum required tiles of each type appear
 * - Maximum counts are respected per type
 * - Weighted random selection fills remaining slots
 * - Ring 0 always gets exactly one plot
 * 
 * @param ringConfig - Balance configuration for this ring
 * @param totalTiles - Total number of tiles in this ring (6*ring for ring > 0)
 * @param rng - Seeded RNG for deterministic selection
 * @param state - Generation state tracking tile counts
 * @param ring - Ring number (affects special-case logic for ring 0)
 * @returns Array of special tile types to place in this ring
 */
function distributeSpecialTiles(ringConfig: RingConfig, totalTiles: number, rng: SeededRng, state: GenState, ring: number): WorldCellType[] {
  const specialTiles: WorldCellType[] = [];
  const targetNonEmpty = Math.min(ringConfig.nonEmptyCap, totalTiles);

  for (const tileType of ringConfig.pool) {
    const min = getMinCount(ringConfig, tileType);
    for (let i = 0; i < min; i++) {
      specialTiles.push(tileType);
      state.tileCounts[tileType]++;
    }
  }

  while (specialTiles.length < targetNonEmpty) {
    const tileType = pickWeightedTileKind(ringConfig, rng, state);
    if (!tileType) {
      break;
    }

    const max = getMaxCount(ringConfig, tileType);
    if (state.tileCounts[tileType] >= max) {
      break;
    }

    specialTiles.push(tileType);
    state.tileCounts[tileType]++;
  }

  if (ring === 0 && specialTiles.length === 0) {
    specialTiles.push('plot');
  }

  return specialTiles.slice(0, totalTiles);
}

/**
 * Pick a tile kind using weighted random selection.
 * 
 * Uses normalized weights from ring config to determine probability of each type.
 * Respects maximum count limits per tile type.
 * Falls back to any available tile type if weighted selection exhausts all options.
 * 
 * @param ringConfig - Balance configuration with weights and pool
 * @param rng - Seeded RNG for random selection
 * @param state - Generation state tracking current tile counts
 * @returns Tile kind to place, or null if no valid options remain
 */
function pickWeightedTileKind(ringConfig: RingConfig, rng: SeededRng, state: GenState): WorldCellType | null {
  const normalizedWeights = getNormalizedWeights(ringConfig);
  const rngValue = rng();

  let cumulative = 0;
  for (let i = 0; i < ringConfig.pool.length; i++) {
    cumulative += normalizedWeights[i];
    if (rngValue < cumulative) {
      const tileType = ringConfig.pool[i];
      const max = getMaxCount(ringConfig, tileType);
      if (state.tileCounts[tileType] < max) {
        return tileType;
      }
    }
  }

  for (const tileType of ringConfig.pool) {
    const max = getMaxCount(ringConfig, tileType);
    if (state.tileCounts[tileType] < max) {
      return tileType;
    }
  }

  return null;
}

/**
 * Generate a name for a tile based on its type.
 * 
 * Naming rules:
 * - Plot names: Real cities (unique per run, except ring 0 which can be "Prague")
 * - City names: Fictional places (unique per run)
 * - Factory names: Punny industrial names (can repeat, keyed by resource type)
 * - Blocker names: Flavor text (River, Lake, Mountain - can repeat)
 * 
 * @param tileType - Type of tile being named
 * @param nameState - State tracking used names to ensure uniqueness
 * @param rng - Seeded RNG for deterministic selection from available names
 * @param ring - Ring number (affects plot naming - ring 0 excludes "Prague" from pool)
 * @returns Generated name for the tile
 */
function generateTileName(tileType: WorldCellType, nameState: NameState, rng: SeededRng, ring: number): string {
  switch (tileType) {
    case 'plot':
      return pickUniquePlotName(nameState, rng, ring === 0 ? [] : ['Prague']) ?? 'Unknown';
    case 'city':
      return pickUniqueCityName(nameState, rng) ?? 'Unknown';
    case 'factory': {
      const resources: ResourceType[] = ['Oil', 'Coal', 'Copper', 'SuperAlloy'];
      const resource = resources[Math.floor(rng() * resources.length)];
      return pickFactoryNameForResources([resource], rng);
    }
    case 'blocker': {
      const flavors = ['River', 'Lake', 'Mountain'];
      return flavors[Math.floor(rng() * flavors.length)];
    }
    default:
      return '';
  }
}

/**
 * Shuffle array in-place using seeded RNG.
 * 
 * Fisher-Yates shuffle algorithm for deterministic randomization.
 * 
 * @param array - Array to shuffle (modified in place)
 * @param rng - Seeded RNG for deterministic shuffling
 */
function shuffleArray<T>(array: T[], rng: SeededRng): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ============================================================================
// Main Generation Function
// ============================================================================

/**
 * Generate a complete world state with multiple rings.
 * 
 * Creates an infinite-in-theory axial hex map that begins as fog and is revealed
 * by player exploration. The generator is deterministic from seed + reset count.
 * 
 * Generation flow:
 * 1. Create seeded RNG from worldSeed and resetCount
 * 2. Generate ring 0 (starting plot at center)
 * 3. Generate rings 1 to ringsToGenerate (fog frontier)
 * 4. Return WorldState with all cells
 * 
 * @param worldSeed - String seed for deterministic generation (e.g., "123456")
 * @param resetCount - Number of times world has been reset (affects seed combination)
 * @param ringsToGenerate - How many rings to generate (0 = just center, 1 = center + first ring, etc.)
 * @returns WorldState with cells for generated rings
 * 
 * @example
 * // Generate center + first ring (7 tiles total: 1 plot + 6 fog)
 * const world = generateWorld('123456', 0, 1);
 * // world.cells.length === 7
 * // world.cells[0].type === 'plot' (starting location)
 * 
 * @example
 * // Generate just center (1 tile - starting plot only)
 * const singleTileWorld = generateWorld('123456', 0, 0);
 * // singleTileWorld.cells.length === 1
 */
export function generateWorld(worldSeed: string, resetCount: number, ringsToGenerate: number = 1): WorldState {
  const rng = makeSeededRng(worldSeed, resetCount);
  const state = createGenState();

  for (let ring = 0; ring <= ringsToGenerate; ring++) {
    const ringCells = generateRing(ring, rng, state);
    state.generatedCells.push(...ringCells);
  }

  return {
    cells: state.generatedCells,
    plots: [],
    activePlotIndex: 0,
    selectedCellId: null,
  };
}

/**
 * Reveal a fog tile by determining what it becomes when explored.
 * 
 * Called when player arrives at a fog tile (e.g., sends train there).
 * The tile is revealed into one of the allowed types for its ring,
 * following the ring's balance configuration and name pools.
 * 
 * @param cell - The fog cell to reveal (must have discovered=false)
 * @param worldSeed - World seed for deterministic revelation
 * @param resetCount - Reset count for deterministic revelation
 * @returns New WorldCell with revealed type, name, and properties
 * 
 * @example
 * // Reveal a fog tile at ring 1
 * const fogCell = { q: 1, r: 0, ring: 1, discovered: false, ... };
 * const revealed = revealFogTile(fogCell, '123456', 0);
 * // revealed.type could be 'city', 'factory', 'plot', or 'empty'
 * // revealed.discovered === true
 */
export function revealFogTile(cell: WorldCell, worldSeed: string, resetCount: number): WorldCell {
  const rng = makeSeededRng(worldSeed, resetCount);
  const ringConfig = getRingConfig(cell.ring);
  const revealed: WorldCell = { ...cell };

  const normalizedWeights = getNormalizedWeights(ringConfig);
  const rngValue = rng();

  let cumulative = 0;
  let chosenType: WorldCellType = 'empty';

  for (let i = 0; i < ringConfig.pool.length; i++) {
    cumulative += normalizedWeights[i];
    if (rngValue < cumulative) {
      chosenType = ringConfig.pool[i];
      break;
    }
  }

  revealed.type = chosenType;
  revealed.discovered = true;

  if (chosenType !== 'empty') {
    const nameState = createNameState();
    revealed.name = generateTileName(chosenType, nameState, rng, cell.ring);

    if (chosenType === 'city' || chosenType === 'factory') {
      revealed.capacity = Math.floor(10 + rng() * 40);
    }

    if (chosenType === 'factory') {
      const resources: ResourceType[] = ['Oil', 'Coal', 'Copper', 'SuperAlloy'];
      revealed.acceptedResources = [resources[Math.floor(rng() * resources.length)]];
    }
  }

  return revealed;
}
