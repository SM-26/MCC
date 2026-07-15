// src/logic/mine/mineGen.ts

import seedrandom from 'seedrandom';
import { createEmptyAgeResources } from './mineTypes';
import type { MineDepthState as MineDepth, MineTile, MineTileType, PlotState } from './mineTypes';
import { TILE_DEFS } from './tileDefinitions';

export type ClearStatus = 'none' | 'soft' | 'hard';

const BASE_COLS = 5;
const BASE_ROWS = 5;
const DEPTHS_PER_BRACKET = 5;
const BLOCKERS_START_DEPTH = 2;

const RESOURCE_ORDER: MineTileType[] = ['rubble', 'coal', 'oil', 'copper', 'superalloy'];

const getBracketResourceShare = (depth: number): number => {
  const offset = depth % DEPTHS_PER_BRACKET;
  return Math.min(0.4 + offset * 0.1, 1);
};

export const MineGenConfig = {
  baseRows: BASE_ROWS,
  baseCols: BASE_COLS,
  depthsPerBracket: DEPTHS_PER_BRACKET,
  blockersStartDepth: BLOCKERS_START_DEPTH,
  blockerDensity: 0.1,
  resourceOrder: RESOURCE_ORDER,

  getDimensions: (_depth: number, northExpansionIndex: number) => {
    const cols = BASE_COLS;
    const rows = BASE_ROWS + Math.floor((northExpansionIndex + 1) / 2);
    return { rows, cols };
  },

  getResourceShare: (depth: number) => getBracketResourceShare(depth),
};

function createTile(type: MineTileType): MineTile {
  const def = TILE_DEFS[type];

  return {
    type,
    level: def.level,
    hp: def.baseHp,
    maxHp: def.baseHp,
    value: def.value,
    resourceType: def.resourceType,
  };
}

function getFillablePositions(rows: number, cols: number): Array<[number, number]> {
  const positions: Array<[number, number]> = [];

  for (let row = 0; row < rows - 1; row++) {
    for (let col = 0; col < cols; col++) {
      positions.push([row, col]);
    }
  }

  return positions;
}

function shuffleInPlace<T>(items: T[], rng: seedrandom.PRNG): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

export function getActiveResourcesForDepth(depth: number): MineTileType[] {
  const bracketIndex = Math.floor(depth / DEPTHS_PER_BRACKET);
  const resources = MineGenConfig.resourceOrder;

  if (bracketIndex < resources.length) {
    return [resources[bracketIndex]];
  }

  const pairPhaseIndex = bracketIndex - resources.length;
  const maxStart = Math.max(0, resources.length - 2);
  const startIndex = Math.min(pairPhaseIndex, maxStart);

  return resources.slice(startIndex, startIndex + 2);
}

function allocateResourceCounts(resources: MineTileType[], totalResourceTiles: number): Record<MineTileType, number> {
  const counts = Object.fromEntries(resources.map((resource) => [resource, 0])) as Record<MineTileType, number>;

  if (resources.length === 0 || totalResourceTiles <= 0) {
    return counts;
  }

  const baseCount = Math.floor(totalResourceTiles / resources.length);
  const remainder = totalResourceTiles % resources.length;

  resources.forEach((resource, index) => {
    counts[resource] = baseCount + (index < remainder ? 1 : 0);
  });

  return counts;
}

function getResourceTileCount(depth: number, fillableTileCount: number): number {
  const share = MineGenConfig.getResourceShare(depth);
  const rawCount = fillableTileCount * share;
  return Math.max(0, Math.min(fillableTileCount, Math.round(rawCount)));
}

function buildTilePool(depth: number, fillableTileCount: number): MineTileType[] {
  const activeResources = getActiveResourcesForDepth(depth);
  const resourceTileCount = getResourceTileCount(depth, fillableTileCount);
  const dirtTileCount = fillableTileCount - resourceTileCount;
  const resourceCounts = allocateResourceCounts(activeResources, resourceTileCount);

  const pool: MineTileType[] = [];

  for (let i = 0; i < dirtTileCount; i++) {
    pool.push('dirt');
  }

  for (const resource of activeResources) {
    for (let i = 0; i < resourceCounts[resource]; i++) {
      pool.push(resource);
    }
  }

  return pool;
}

function getOrthogonalNeighbors(row: number, col: number, rows: number, cols: number): Array<[number, number]> {
  const neighbors: Array<[number, number]> = [];
  const candidates: Array<[number, number]> = [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ];

  for (const [nextRow, nextCol] of candidates) {
    if (nextRow >= 0 && nextRow < rows && nextCol >= 0 && nextCol < cols) {
      neighbors.push([nextRow, nextCol]);
    }
  }

  return neighbors;
}

function getAllNeighbors(row: number, col: number, rows: number, cols: number): Array<[number, number]> {
  const neighbors: Array<[number, number]> = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
    for (let colOffset = -1; colOffset <= 1; colOffset++) {
      if (rowOffset === 0 && colOffset === 0) {
        continue;
      }

      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;

      if (nextRow >= 0 && nextRow < rows && nextCol >= 0 && nextCol < cols) {
        neighbors.push([nextRow, nextCol]);
      }
    }
  }

  return neighbors;
}

function isBlockedTile(tile: MineTile): boolean {
  return tile.type === 'blocker';
}

function getReachableTiles(tiles: MineTile[][], rows: number, cols: number): Set<string> {
  const visited = new Set<string>();
  const queue: Array<[number, number]> = [];

  for (let col = 0; col < cols; col++) {
    const startRow = rows - 1;

    if (!isBlockedTile(tiles[startRow][col])) {
      queue.push([startRow, col]);
      visited.add(`${startRow},${col}`);
    }
  }

  for (let index = 0; index < queue.length; index++) {
    const [row, col] = queue[index];

    for (const [nextRow, nextCol] of getOrthogonalNeighbors(row, col, rows, cols)) {
      const key = `${nextRow},${nextCol}`;

      if (!visited.has(key) && !isBlockedTile(tiles[nextRow][nextCol])) {
        visited.add(key);
        queue.push([nextRow, nextCol]);
      }
    }
  }

  return visited;
}

function preservesReachability(tiles: MineTile[][], rows: number, cols: number): boolean {
  const reachable = getReachableTiles(tiles, rows, cols);

  for (let row = 0; row < rows - 1; row++) {
    for (let col = 0; col < cols; col++) {
      if (!isBlockedTile(tiles[row][col]) && !reachable.has(`${row},${col}`)) {
        return false;
      }
    }
  }

  return true;
}

function wouldCreateLongChain(tiles: MineTile[][], row: number, col: number, rows: number, cols: number): boolean {
  const maxLength = Math.min(rows, cols) - 1;

  const dfs = (currentRow: number, currentCol: number, visited: Set<string>): number => {
    visited.add(`${currentRow},${currentCol}`);

    let longest = 1;

    for (const [nextRow, nextCol] of getAllNeighbors(currentRow, currentCol, rows, cols)) {
      const key = `${nextRow},${nextCol}`;

      if (tiles[nextRow][nextCol].type === 'blocker' && !visited.has(key)) {
        longest = Math.max(longest, 1 + dfs(nextRow, nextCol, visited));
      }
    }

    return longest;
  };

  return dfs(row, col, new Set()) > maxLength;
}

function isPlacementValid(tiles: MineTile[][], row: number, col: number, rows: number, cols: number): boolean {
  const originalTile = tiles[row][col];
  tiles[row][col] = createTile('blocker');

  const createsLongChain = wouldCreateLongChain(tiles, row, col, rows, cols);
  const breaksReachability = !preservesReachability(tiles, rows, cols);

  tiles[row][col] = originalTile;

  return !createsLongChain && !breaksReachability;
}

function applyBlockers(tiles: MineTile[][], rows: number, cols: number, rng: seedrandom.PRNG): void {
  const fillablePositions = getFillablePositions(rows, cols);
  const maxBlockers = Math.floor(fillablePositions.length * MineGenConfig.blockerDensity);

  shuffleInPlace(fillablePositions, rng);

  let placed = 0;

  for (const [row, col] of fillablePositions) {
    if (placed >= maxBlockers) {
      break;
    }

    if (tiles[row][col].type === 'dirt' && isPlacementValid(tiles, row, col, rows, cols)) {
      tiles[row][col] = createTile('blocker');
      placed++;
    }
  }
}

/**
 * Generate deterministic MineDepth based on world seed, reset count, depth, and north expansion.
 */
export function generatePlot(worldSeed: string, resetCount: number, depth: number, northExpansionIndex: number): MineDepth {
  // Include resetCount in the seed string (matching worldGen pattern)
  const rng = seedrandom(`${worldSeed}-${resetCount}-${depth}-${northExpansionIndex}`);
  const { rows, cols } = MineGenConfig.getDimensions(depth, northExpansionIndex);

  const tiles: MineTile[][] = Array.from({ length: rows }, (_, row) => Array.from({ length: cols }, () => createTile(row === rows - 1 ? 'empty' : 'dirt')));

  const fillablePositions = getFillablePositions(rows, cols);
  const tilePool = buildTilePool(depth, fillablePositions.length);

  shuffleInPlace(tilePool, rng);

  fillablePositions.forEach(([row, col], index) => {
    tiles[row][col] = createTile(tilePool[index]);
  });

  if (depth >= MineGenConfig.blockersStartDepth) {
    applyBlockers(tiles, rows, cols, rng);
  }

  return {
    depth,
    rows,
    cols,
    tiles,
    miners: [],
  };
}

export function buildPlot(cellId: string, seed: string, resetCount: number): PlotState {
  const surface = generatePlot(seed, resetCount, 0, 0);
  return {
    currentAge: 'Mechanical',
    ageResources: createEmptyAgeResources(),
    mineshafts: [{ mineDepths: [surface], selectedMiner: null, draggedMiner: null, lastTick: 0, activeDepthIndex: 0 }],
    activeMineshaftIndex: 0,
    station: null,
  };
}

export function getPlotStats(plot: MineDepth): Record<MineTileType, number> {
  const stats = Object.fromEntries(Object.keys(TILE_DEFS).map((key) => [key, 0])) as Record<MineTileType, number>;

  plot.tiles.flat().forEach((tile) => {
    stats[tile.type] += 1;
  });

  return stats;
}

export function getClearStatus(plot: MineDepth): ClearStatus {
  const stats = getPlotStats(plot);

  const resourceCount = (stats.rubble || 0) + (stats.coal || 0) + (stats.oil || 0) + (stats.copper || 0) + (stats.superalloy || 0);
  const dirtCount = stats.dirt || 0;

  if (resourceCount === 0 && dirtCount === 0) {
    return 'hard';
  }

  if (resourceCount === 0) {
    return 'soft';
  }

  return 'none';
}

export function getClearProgress(plot: MineDepth): number {
  const stats = getPlotStats(plot);
  const totalFillableTiles = (plot.rows - 1) * plot.cols;

  const clutter = (stats.dirt || 0) + (stats.rubble || 0);
  const resources = (stats.coal || 0) + (stats.oil || 0) + (stats.copper || 0) + (stats.superalloy || 0);
  const remaining = clutter + resources;

  if (totalFillableTiles <= 0 || remaining <= 0) {
    return 100;
  }

  return Math.floor(((totalFillableTiles - remaining) / totalFillableTiles) * 100);
}
