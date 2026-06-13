import seedrandom from 'seedrandom';
import type { MineDepth, MineTile, MineTileType } from '../types';
import { TILE_DEFS } from './tileDefinitions';

export type ClearStatus = 'none' | 'soft' | 'hard';

export const MineGenConfig = {
  /** Calculates the grid dimensions based on current mine depth and plot index. */
  getDimensions: (depth: number, plotIndex: number) => {
    const cols = 5 + Math.floor(depth / 20);
    const rowMap = [5, 6, 6, 7, 7, 8, 8, 8];
    const rows = rowMap[plotIndex] ?? 8 + Math.floor((plotIndex - 7) / 3);
    return { rows, cols };
  },

  resourceBreakpoints: [
    { minDepth: 0, maxDepth: 4, resources: ['dirt', 'rubble'] },
    { minDepth: 5, maxDepth: 9, resources: ['dirt', 'coal'] },
    { minDepth: 10, maxDepth: 14, resources: ['dirt', 'oil'] },
    { minDepth: 15, maxDepth: 19, resources: ['dirt', 'copper'] },
    { minDepth: 20, maxDepth: 24, resources: ['dirt', 'superalloy'] },
  ],

  /** Returns the relative spawn weight for a tile type based on progress within a depth bracket. */
  getTileWeight: (depth: number, tileType: string) => {
    const offset = depth % 5;

    if (tileType === 'dirt') {
      return 1.0 - offset * 0.1;
    }

    return 0.1 + offset * 0.1;
  },

  blockerDensity: 0.1,
};

/** Initializes a new tile with default properties. */
function generateTile(depth: number, rng: seedrandom.PRNG): MineTile {
  const isRubble = depth === 0 && rng() < 0.3;
  return createTile(isRubble ? 'rubble' : 'dirt');
}

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
 * Chooses a resource tile type for a given depth.
 */
function getResourceTileType(depth: number, rng: seedrandom.PRNG): MineTileType {
  const breakpoint =
    MineGenConfig.resourceBreakpoints.find((entry) => depth >= entry.minDepth && depth <= entry.maxDepth) ??
    MineGenConfig.resourceBreakpoints[MineGenConfig.resourceBreakpoints.length - 1];

  const weightedTypes = breakpoint.resources.map((resource) => ({
    type: resource as MineTileType,
    weight: MineGenConfig.getTileWeight(depth, resource),
  }));

  const totalWeight = weightedTypes.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng() * totalWeight;

  for (const entry of weightedTypes) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.type;
    }
  }

  return weightedTypes[weightedTypes.length - 1].type;
}

/**
 * Generates a deterministic MineDepth based on the provided seed, depth, and plot index.
 */
export function generatePlot(worldSeed: string, depth: number, plotIndex: number): MineDepth {
  const rng = seedrandom(`${worldSeed}-${depth}-${plotIndex}`);
  const { rows, cols } = MineGenConfig.getDimensions(depth, plotIndex);

  const tiles: MineTile[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => createTile('empty')));

  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols; c++) {
      tiles[r][c] = generateTile(depth, rng);
    }
  }

  const resourcePasses = Math.max(1, Math.floor((rows * cols) / 8));

  for (let i = 0; i < resourcePasses; i++) {
    const r = Math.floor(rng() * (rows - 1));
    const c = Math.floor(rng() * cols);

    if (tiles[r][c].type === 'dirt' || tiles[r][c].type === 'rubble') {
      tiles[r][c] = createTile(getResourceTileType(depth, rng));
    }
  }

  if (depth >= 2) {
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

/** Populates the mine with blockers while respecting structural constraints. */
function applyBlockers(tiles: MineTile[][], rows: number, cols: number, rng: seedrandom.PRNG) {
  const maxBlockers = Math.floor(rows * cols * MineGenConfig.blockerDensity);
  let placed = 0;
  let attempts = 0;
  const maxAttempts = rows * cols * 10;

  while (placed < maxBlockers && attempts < maxAttempts) {
    attempts++;

    const r = Math.floor(rng() * (rows - 1));
    const c = Math.floor(rng() * cols);

    if (tiles[r][c].type !== 'blocker' && isPlacementValid(tiles, r, c, rows, cols)) {
      tiles[r][c] = createTile('blocker');
      placed++;
    }
  }
}

/** Performs a trial placement to validate blocker integrity and reachability. */
function isPlacementValid(tiles: MineTile[][], r: number, c: number, rows: number, cols: number): boolean {
  const originalTile = tiles[r][c];
  tiles[r][c] = createTile('blocker');

  const isChainTooLong = wouldCreateLongChain(tiles, r, c, rows, cols);
  const isPocketCreated = wouldCreatePocket(tiles, r, c, rows, cols);

  tiles[r][c] = originalTile;

  return !isChainTooLong && !isPocketCreated;
}

/** Uses DFS to check if a blocker placement creates a chain exceeding allowed length. */
function wouldCreateLongChain(tiles: MineTile[][], r: number, c: number, rows: number, cols: number): boolean {
  const maxLength = Math.min(rows, cols) - 1;

  const dfs = (currR: number, currC: number, visited: Set<string>): number => {
    visited.add(`${currR},${currC}`);

    let max = 1;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) {
          continue;
        }

        const nr = currR + dr;
        const nc = currC + dc;

        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && tiles[nr][nc].type === 'blocker' && !visited.has(`${nr},${nc}`)) {
          max = Math.max(max, 1 + dfs(nr, nc, visited));
        }
      }
    }

    return max;
  };

  return dfs(r, c, new Set()) > maxLength;
}

/** Scans neighbors of a new blocker to ensure no 1x1 holes are created. */
function wouldCreatePocket(tiles: MineTile[][], r: number, c: number, rows: number, cols: number): boolean {
  const neighbors: Array<[number, number]> = [
    [r - 1, c],
    [r + 1, c],
    [r, c - 1],
    [r, c + 1],
  ];

  for (const [nr, nc] of neighbors) {
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && tiles[nr][nc].type !== 'blocker') {
      let walls = 0;

      const adjacent: Array<[number, number]> = [
        [nr - 1, nc],
        [nr + 1, nc],
        [nr, nc - 1],
        [nr, nc + 1],
      ];

      adjacent.forEach(([nnr, nnc]) => {
        if (nnr < 0 || nnr >= rows || nnc < 0 || nnc >= cols || tiles[nnr][nnc].type === 'blocker') {
          walls++;
        }
      });

      if (walls >= 3) {
        return true;
      }
    }
  }

  return false;
}

/** Aggregates all tile types present in a mine depth for analysis. */
export function getPlotStats(plot: MineDepth): Record<MineTileType, number> {
  const stats = Object.fromEntries(Object.keys(TILE_DEFS).map((key) => [key, 0])) as Record<MineTileType, number>;

  plot.tiles.flat().forEach((tile) => {
    stats[tile.type] += 1;
  });

  return stats;
}

/** Determines if a depth is none, soft cleared, or hard cleared. */
export function getClearStatus(plot: MineDepth): ClearStatus {
  const stats = getPlotStats(plot);

  const resourceCount = (stats.coal || 0) + (stats.oil || 0) + (stats.copper || 0) + (stats['superalloy'] || 0) + (stats.rubble || 0);

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
  const totalTiles = (plot.rows - 1) * plot.cols;

  const clutter = (stats.dirt || 0) + (stats.rubble || 0);
  const resources = (stats.coal || 0) + (stats.oil || 0) + (stats.copper || 0) + (stats['superalloy'] || 0);

  const remaining = clutter + resources;

  if (totalTiles <= 0 || remaining <= 0) {
    return 100;
  }

  return Math.floor(((totalTiles - remaining) / totalTiles) * 100);
}
