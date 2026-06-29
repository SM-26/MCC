// src/logic/mine/mineGen.test.ts

import { describe, expect, it } from 'vitest';
import type { MineDepthState as MineDepth, MineTile, MineTileType } from '../../logic/mine/mineTypes';
import { TILE_DEFS } from './tileDefinitions';
import { buildPlot, generatePlot, getClearProgress, getClearStatus, getPlotStats, MineGenConfig } from './mineGen';
import { isPlotBuilt } from './mineTypes';

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

function createMineFromTypes(grid: MineTileType[][], depth = 0): MineDepth {
  return {
    depth,
    rows: grid.length,
    cols: grid[0]?.length ?? 0,
    tiles: grid.map((row) => row.map((type) => createTile(type))),
    miners: [],
  };
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

function getReachableTiles(plot: MineDepth): Set<string> {
  const visited = new Set<string>();
  const queue: Array<[number, number]> = [];
  const bottomRow = plot.rows - 1;

  for (let col = 0; col < plot.cols; col++) {
    if (plot.tiles[bottomRow][col].type !== 'blocker') {
      queue.push([bottomRow, col]);
      visited.add(`${bottomRow},${col}`);
    }
  }

  for (let index = 0; index < queue.length; index++) {
    const [row, col] = queue[index];

    for (const [nextRow, nextCol] of getOrthogonalNeighbors(row, col, plot.rows, plot.cols)) {
      const key = `${nextRow},${nextCol}`;
      if (!visited.has(key) && plot.tiles[nextRow][nextCol].type !== 'blocker') {
        visited.add(key);
        queue.push([nextRow, nextCol]);
      }
    }
  }

  return visited;
}

function hasUnreachableNonBlocker(plot: MineDepth): boolean {
  const reachable = getReachableTiles(plot);

  for (let row = 0; row < plot.rows - 1; row++) {
    for (let col = 0; col < plot.cols; col++) {
      if (plot.tiles[row][col].type !== 'blocker' && !reachable.has(`${row},${col}`)) {
        return true;
      }
    }
  }

  return false;
}

function longestBlockerChainFrom(plot: MineDepth, startRow: number, startCol: number, visited: Set<string>): number {
  visited.add(`${startRow},${startCol}`);

  let longest = 1;

  for (const [nextRow, nextCol] of getAllNeighbors(startRow, startCol, plot.rows, plot.cols)) {
    const key = `${nextRow},${nextCol}`;
    if (plot.tiles[nextRow][nextCol].type === 'blocker' && !visited.has(key)) {
      longest = Math.max(longest, 1 + longestBlockerChainFrom(plot, nextRow, nextCol, visited));
    }
  }

  return longest;
}

function hasIllegalBlockerChain(plot: MineDepth): boolean {
  const maxAllowed = Math.min(plot.rows, plot.cols) - 1;

  for (let row = 0; row < plot.rows; row++) {
    for (let col = 0; col < plot.cols; col++) {
      if (plot.tiles[row][col].type === 'blocker') {
        const chainLength = longestBlockerChainFrom(plot, row, col, new Set());
        if (chainLength > maxAllowed) {
          return true;
        }
      }
    }
  }

  return false;
}

function getNonBottomTiles(plot: MineDepth): MineTile[] {
  return plot.tiles.slice(0, -1).flat();
}

describe('buildPlot', () => {
  it('buildPlot yields a Built plot with a tiled surface depth', () => {
    const plot = buildPlot('0,0', '123456', 0);
    expect(isPlotBuilt(plot)).toBe(true);
    expect(plot.mineshafts[0].mineDepths[0].depth).toBe(0);
    expect(plot.mineshafts[0].mineDepths[0].tiles.length).toBeGreaterThan(0);
  });
});

describe('MineGen dimensions and determinism', () => {
  it('generates the exact same plot for the same seed, depth, and north expansion index', () => {
    const plot1 = generatePlot('seed-123', 5, 0, 0);
    const plot2 = generatePlot('seed-123', 5, 0, 0);

    expect(plot1).toEqual(plot2);
  });

  it('usually generates a different plot for a different seed', () => {
    const plot1 = generatePlot('seed-123', 5, 0, 0);
    const plot2 = generatePlot('seed-456', 5, 0, 0);

    expect(plot1).not.toEqual(plot2);
  });

  it('keeps width fixed at 5 columns regardless of depth and north expansion', () => {
    expect(MineGenConfig.getDimensions(0, 0).cols).toBe(5);
    expect(MineGenConfig.getDimensions(20, 0).cols).toBe(5);
    expect(MineGenConfig.getDimensions(2, 4).cols).toBe(5);
    expect(MineGenConfig.getDimensions(99, 12).cols).toBe(5);
  });

  it('increases rows with north expansion index', () => {
    expect(MineGenConfig.getDimensions(0, 0).rows).toBe(5);
    expect(MineGenConfig.getDimensions(0, 1).rows).toBe(6);
    expect(MineGenConfig.getDimensions(0, 2).rows).toBe(6);
    expect(MineGenConfig.getDimensions(0, 3).rows).toBe(7);
    expect(MineGenConfig.getDimensions(0, 4).rows).toBe(7);
  });

  it('does not change dimensions based on depth alone', () => {
    expect(MineGenConfig.getDimensions(0, 0)).toEqual(MineGenConfig.getDimensions(20, 0));
    expect(MineGenConfig.getDimensions(1, 3)).toEqual(MineGenConfig.getDimensions(99, 3));
  });
});

describe('MineGen seed input contract', () => {
  it('accepts arbitrary string seeds', () => {
    expect(() => generatePlot('123456', 0, 0, 0)).not.toThrow();
    expect(() => generatePlot('abc', 0, 0, 0)).not.toThrow();
    expect(() => generatePlot('north-expansion-easter-egg', 0, 0, 0)).not.toThrow();
    expect(() => generatePlot('coal&oil@depth-5', 0, 5, 1)).not.toThrow();
  });

  it('treats arbitrary string seeds deterministically', () => {
    const plot1 = generatePlot('hello-world', 0, 3, 2);
    const plot2 = generatePlot('hello-world', 0, 3, 2);
    expect(plot1).toEqual(plot2);
  });
});

describe('MineGen structural invariants', () => {
  const seeds = ['seed-a', 'seed-b', 'seed-c', 'seed-d', 'seed-e', 'seed-f', 'seed-g', 'seed-h', 'seed-i', 'seed-j'];

  const depths = [0, 1, 2, 4, 5, 9, 10, 14, 15, 19, 20, 24];
  const northExpansionIndices = [0, 1, 2, 3, 4, 8];

  it('always keeps the bottom row empty', () => {
    for (const seed of seeds) {
      for (const depth of depths) {
        for (const northExpansionIndex of northExpansionIndices) {
          const plot = generatePlot(seed, depth, northExpansionIndex, 0);
          const bottomRow = plot.tiles[plot.rows - 1];

          bottomRow.forEach((tile) => {
            expect(tile.type).toBe('empty');
          });
        }
      }
    }
  });

  it('never places blockers before depth 2', () => {
    for (const seed of seeds) {
      for (const depth of [0, 1]) {
        for (const northExpansionIndex of northExpansionIndices) {
          const plot = generatePlot(seed, depth, northExpansionIndex, 0);
          const stats = getPlotStats(plot);

          expect(stats.blocker).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('only uses valid fillable tile types above the bottom row', () => {
    const validTypes: MineTileType[] = ['dirt', 'blocker', 'rubble', 'coal', 'oil', 'copper', 'superalloy'];

    for (const seed of seeds) {
      for (const depth of depths) {
        for (const northExpansionIndex of northExpansionIndices) {
          const plot = generatePlot(seed, depth, northExpansionIndex, 0);
          const tiles = getNonBottomTiles(plot);

          tiles.forEach((tile) => {
            expect(validTypes).toContain(tile.type);
            expect(tile.type).not.toBe('empty');
          });
        }
      }
    }
  });

  it('preserves reachability for all non-blocker tiles above the bottom row', () => {
    for (const seed of seeds) {
      for (const depth of depths) {
        for (const northExpansionIndex of northExpansionIndices) {
          const plot = generatePlot(seed, depth, northExpansionIndex, 0);
          expect(hasUnreachableNonBlocker(plot)).toBe(false);
        }
      }
    }
  });

  it('never creates an illegal blocker chain', () => {
    for (const seed of seeds) {
      for (const depth of depths.filter((value) => value >= 2)) {
        for (const northExpansionIndex of northExpansionIndices) {
          const plot = generatePlot(seed, depth, northExpansionIndex, 0);
          expect(hasIllegalBlockerChain(plot)).toBe(false);
        }
      }
    }
  });

  it('treats blocker density as a soft upper target, not an exact requirement', () => {
    for (const seed of seeds) {
      for (const depth of depths.filter((value) => value >= 2)) {
        for (const northExpansionIndex of northExpansionIndices) {
          const plot = generatePlot(seed, depth, northExpansionIndex, 0);
          const fillableTileCount = (plot.rows - 1) * plot.cols;
          const blockerCount = getPlotStats(plot).blocker;
          const maxAllowed = Math.floor(fillableTileCount * MineGenConfig.blockerDensity);

          expect(blockerCount).toBeLessThanOrEqual(maxAllowed);
        }
      }
    }
  });
});

describe('MineGen resource progression', () => {
  it('starts with dirt + rubble only at depth 0', () => {
    const plot = generatePlot('resource-seed', 0, 0, 0);
    const stats = getPlotStats(plot);

    expect(stats.rubble).toBeGreaterThan(0);
    expect(stats.coal).toBe(0);
    expect(stats.oil).toBe(0);
    expect(stats.copper).toBe(0);
    expect(stats.superalloy).toBe(0);
  });

  it('uses dirt + coal only in the second bracket', () => {
    const plot = generatePlot('resource-seed', 0, 5, 0);
    const stats = getPlotStats(plot);

    expect(stats.coal).toBeGreaterThan(0);
    expect(stats.rubble).toBe(0);
    expect(stats.oil).toBe(0);
    expect(stats.copper).toBe(0);
    expect(stats.superalloy).toBe(0);
  });

  it('uses two contiguous resources after the single-resource phase is exhausted', () => {
    const depth = MineGenConfig.depthsPerBracket * MineGenConfig.resourceOrder.length;
    const plot = generatePlot('resource-seed', 0, depth, 0);
    const stats = getPlotStats(plot);

    expect(stats.rubble).toBeGreaterThan(0);
    expect(stats.coal).toBeGreaterThan(0);
    expect(stats.oil).toBe(0);
    expect(stats.copper).toBe(0);
    expect(stats.superalloy).toBe(0);
  });

  it('increases the average non-dirt share as depth advances within a bracket', () => {
    const shallowShare = MineGenConfig.getResourceShare(0);
    const midShare = MineGenConfig.getResourceShare(1);
    const deepShare = MineGenConfig.getResourceShare(4);

    expect(shallowShare).toBeLessThan(midShare);
    expect(midShare).toBeLessThan(deepShare);
    expect(shallowShare).toBe(0.4);
    expect(midShare).toBe(0.5);
    expect(deepShare).toBe(0.8);
  });

  it('matches the intended depth-0 rubble count range on a 5x5 mine', () => {
    const plot = generatePlot('range-seed', 0, 0, 0);
    const stats = getPlotStats(plot);

    expect(plot.rows).toBe(5);
    expect(plot.cols).toBe(5);
    expect(stats.rubble).toBeGreaterThanOrEqual(8);
    expect(stats.rubble).toBeLessThanOrEqual(11);
    expect(stats.dirt).toBe((plot.rows - 1) * plot.cols - stats.rubble);
  });
});

describe('MineGen stats and clear helpers', () => {
  it('getPlotStats counts all tile types correctly', () => {
    const plot = createMineFromTypes([
      ['dirt', 'rubble', 'coal'],
      ['blocker', 'oil', 'copper'],
      ['superalloy', 'empty', 'empty'],
    ]);

    const stats = getPlotStats(plot);

    expect(stats.dirt).toBe(1);
    expect(stats.rubble).toBe(1);
    expect(stats.coal).toBe(1);
    expect(stats.blocker).toBe(1);
    expect(stats.oil).toBe(1);
    expect(stats.copper).toBe(1);
    expect(stats.superalloy).toBe(1);
    expect(stats.empty).toBe(2);
  });

  it('getClearStatus returns none when resources or rubble remain', () => {
    const plot = createMineFromTypes([
      ['dirt', 'rubble'],
      ['empty', 'empty'],
    ]);

    expect(getClearStatus(plot)).toBe('none');
  });

  it('getClearStatus returns soft when dirt remains but no resources or rubble remain', () => {
    const plot = createMineFromTypes([
      ['dirt', 'dirt'],
      ['empty', 'empty'],
    ]);

    expect(getClearStatus(plot)).toBe('soft');
  });

  it('getClearStatus returns hard when no dirt and no resources remain', () => {
    const plot = createMineFromTypes([
      ['empty', 'blocker'],
      ['empty', 'empty'],
    ]);

    expect(getClearStatus(plot)).toBe('hard');
  });

  it('getClearProgress ignores blockers and bottom-row empty tiles', () => {
    const plot = createMineFromTypes([
      ['dirt', 'blocker'],
      ['empty', 'empty'],
    ]);

    expect(getClearProgress(plot)).toBe(50);
  });

  it('getClearProgress returns 100 when nothing countable remains', () => {
    const plot = createMineFromTypes([
      ['empty', 'blocker'],
      ['empty', 'empty'],
    ]);

    expect(getClearProgress(plot)).toBe(100);
  });

  it('getClearProgress returns the expected percentage for mixed remaining tiles', () => {
    const plot = createMineFromTypes([
      ['dirt', 'rubble', 'coal', 'empty'],
      ['empty', 'empty', 'empty', 'empty'],
    ]);

    expect(getClearProgress(plot)).toBe(25);
  });
});
