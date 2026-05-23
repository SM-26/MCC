// src/mines/plot.ts - Mines Slice Implementation

import { Plot, Tile, Miner } from '../core/types/state';
import { initializeTiles, getResourceValue } from './tiles';
import { findBestMinerPlacement, placeMiner, updateMiner } from './miners';

/**
 * Initialize a plot with tiles at the specified depth
 */
export function initializePlotWithTiles(plot: Partial<Plot>, depth: number = 0): Plot {
  const tiles = initializeTiles(depth, 25);
  
  return {
    id: `plot-A-I-${depth}`,
    name: `Plot A I ${depth}`,
    northExpansions: 0,
    undergroundLevels: depth,
    softCleared: false,
    hardCleared: false,
    ageResources: { coal: 0, oil: 0, copper: 0, superAlloy: 0 },
    currentAge: 'basic',
    availableAges: ['basic'],
    stationBuilt: false,
    stationId: null,
    tiles,
    miners: []
  };
}

/**
 * Get all empty tiles in a plot (sorted by depth)
 */
export function getEmptyTiles(plot: Plot): number[] {
  const emptyIndices = plot.tiles
    .map((tile, index) => tile.type === 'empty' ? index : -1)
    .filter(index => index !== -1);
  
  // Sort by depth (deepest first)
  return emptyIndices.sort((a, b) => {
    const tileA = plot.tiles[a];
    const tileB = plot.tiles[b];
    return tileA.level - tileB.level;
  });
}

/**
 * Check if a plot is fully cleared (no rubble or ore left)
 */
export function isPlotCleared(plot: Plot): boolean {
  return !plot.tiles.some(tile => 
    tile.type === 'rubble' || 
    ['coal', 'oil', 'copper', 'super-alloy'].includes(tile.type)
  );
}

/**
 * Update all miners in a plot (tick game logic)
 */
export function updatePlotMiners(plot: Plot, dt: number): void {
  for (const miner of plot.miners) {
    updateMiner(miner, plot, dt);
  }
}

/**
 * Get resource count for a plot
 */
export function getResourceCount(plot: Plot, resourceType: string): number {
  return plot.tiles.reduce((count, tile) => {
    if (tile.type === resourceType) {
      return count + tile.value;
    }
    return count;
  }, 0);
}
