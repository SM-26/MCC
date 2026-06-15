// src/logic/mine/mineGen.ts

import seedrandom from 'seedrandom';
import type { MineDepth, MineTile, MineTileType } from '../../types';
import { TILE_DEFS } from './tileDefinitions';

export type ClearStatus = 'none' | 'soft' | 'hard';

const BASE_COLS = 5;
const BASE_ROWS = 5;
const DEPTHS_PER_BRACKET = 5;
const BLOCKERS_START_DEPTH = 2;

const RESOURCE_ORDER: MineTileType[] = ['rubble', 'coal', 'oil', 'copper', 'superalloy'];

/**
 * Average non-dirt share for each offset within a 5-depth bracket.
 *
 * Example:
 * - depth 0 => offset 0 => 40%
 * - depth 1 => offset 1 => 50%
 * - depth 2 => offset 2 => 60%
 * - depth 3 => offset 3 => 70%
 * - depth 4 => offset 4 => 80%
 *
 * Dirt is whatever remains after allocating resource tiles.
 * Later tuning can change this formula without changing generator structure.
 */
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

  /**
   * Returns grid dimensions for a mine.
   *
   * Rules:
   * - Columns are fixed width for now.
   * - Rows grow with north expansion index.
   * - Bottom row is always reserved as an empty access corridor.
   */
  getDimensions: (_depth: number, northExpansionIndex: number) => {
    const cols = BASE_COLS;
    const rows = BASE_ROWS + Math.floor((northExpansionIndex + 1) / 2);
    return { rows, cols };
  },

  /**
   * Returns the average non-dirt share for the given depth's position inside its
   * current 5-depth bracket.
   */
  getResourceShare: (depth: number) => getBracketResourceShare(depth),
};

/**
 * Creates a new tile from a registered tile definition.
 */
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

/**
 * Returns all row/column positions above the bottom access row.
 */
function getFillablePositions(rows: number, cols: number): Array<[number, number]> {
  const positions: Array<[number, number]> = [];

  for (let row = 0; row < rows - 1; row++) {
    for (let col = 0; col < cols; col++) {
      positions.push([row, col]);
    }
  }

  return positions;
}

/**
 * Shuffles an array in place using the provided deterministic RNG.
 */
function shuffleInPlace<T>(items: T[], rng: seedrandom.PRNG): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

/**
 * Returns the active resource set for a depth.
 *
 * Progression rules:
 * - Depths are grouped into 5-level brackets.
 * - Early brackets use dirt + exactly 1 resource.
 * - After exhausting the single-resource phase, later brackets use dirt + 2
 *   contiguous resources.
 * - The resource order is controlled by MineGenConfig.resourceOrder.
 */
function getActiveResourcesForDepth(depth: number): MineTileType[] {
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

/**
 * Distributes an exact number of resource tiles across the active resources.
 *
 * Distribution is as even as possible, with any remainder assigned from left to
 * right in the active resource order.
 */
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

/**
 * Returns the total number of non-dirt tiles to place in the fillable area.
 *
 * Count-based generation is used instead of repeated weighted tile rolls so the
 * generator has stronger balancing guarantees and tighter tests.
 */
function getResourceTileCount(depth: number, fillableTileCount: number): number {
  const share = MineGenConfig.getResourceShare(depth);
  const rawCount = fillableTileCount * share;
  return Math.max(0, Math.min(fillableTileCount, Math.round(rawCount)));
}

/**
 * Creates a deterministic tile pool for all fillable cells above the bottom row.
 */
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

/**
 * Returns orthogonal neighbors inside the grid.
 */
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

/**
 * Returns 8-direction neighbors inside the grid.
 */
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

/**
 * Returns whether a tile blocks reachability checks.
 */
function isBlockedTile(tile: MineTile): boolean {
  return tile.type === 'blocker';
}

/**
 * Flood-fills reachable non-blocker tiles from the bottom access corridor.
 *
 * Reachability uses orthogonal movement:
 * - start from every non-blocker tile in the bottom row
 * - flood into all orthogonally adjacent non-blocker tiles
 */
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

/**
 * Returns whether every non-blocker tile above the bottom row is reachable from
 * the bottom access corridor.
 */
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

/**
 * Returns whether placing a blocker at the given tile would create an illegal
 * blocker chain.
 *
 * Chain validation uses 8-direction connectivity and preserves the current
 * DFS-path-based interpretation of "too long."
 */
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

/**
 * Performs a temporary blocker placement and validates the result against all
 * structural rules.
 */
function isPlacementValid(tiles: MineTile[][], row: number, col: number, rows: number, cols: number): boolean {
  const originalTile = tiles[row][col];
  tiles[row][col] = createTile('blocker');

  const createsLongChain = wouldCreateLongChain(tiles, row, col, rows, cols);
  const breaksReachability = !preservesReachability(tiles, rows, cols);

  tiles[row][col] = originalTile;

  return !createsLongChain && !breaksReachability;
}

/**
 * Attempts to place blockers while preserving all structural constraints.
 *
 * Blocker density is a soft target:
 * - the generator tries to place up to the configured density
 * - it may place fewer blockers if valid positions run out
 */
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
 * Generates a deterministic MineDepth based on world seed, depth, and north
 * expansion index.
 *
 * Generation pipeline:
 * - determine dimensions
 * - create an empty grid
 * - fill every non-bottom tile using exact count allocation
 * - keep bottom row empty as the access corridor
 * - optionally place blockers from depth 2 onward
 */
export function generatePlot(worldSeed: string, depth: number, northExpansionIndex: number): MineDepth {
  const rng = seedrandom(`${worldSeed}-${depth}-${northExpansionIndex}`);
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

/**
 * Aggregates all tile types present in a mine depth.
 */
export function getPlotStats(plot: MineDepth): Record<MineTileType, number> {
  const stats = Object.fromEntries(Object.keys(TILE_DEFS).map((key) => [key, 0])) as Record<MineTileType, number>;

  plot.tiles.flat().forEach((tile) => {
    stats[tile.type] += 1;
  });

  return stats;
}

/**
 * Determines whether a depth is not cleared, soft cleared, or hard cleared.
 *
 * Rules:
 * - hard: no dirt and no resources/rubble remain
 * - soft: resources/rubble are gone but dirt remains
 * - none: at least one resource/rubble remains
 */
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

/**
 * Returns clear progress as a percentage.
 *
 * Progress is based on the fillable area only:
 * - bottom-row access tiles are excluded
 * - blockers do not count against progress
 * - remaining dirt and remaining resources/rubble do count against progress
 */
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
