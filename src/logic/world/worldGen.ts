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

function distributeSpecialTiles(
  ringConfig: RingConfig,
  totalTiles: number,
  rng: SeededRng,
  state: GenState,
  ring: number,
): WorldCellType[] {
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
  };
}

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