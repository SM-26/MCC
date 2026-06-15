// src/logic/world/worldBalance.ts

/**
 * Per-ring world generation balance configuration.
 *
 * Design doc balance knobs:
 * - Per-ring allowed tile pool
 * - Per-ring min/max counts by tile kind
 * - Per-ring cap on non-empty tiles
 * - Weighted ratios by tile kind
 * - Factory vs city ratio formula
 * - First-appearance ring for each tile kind
 * - Plot frequency by ring
 * - Blocker frequency by ring
 */

import type { WorldCellType } from './worldTypes';

/**
 * Configuration for a single ring's generation rules.
 */
export interface RingConfig {
  // Allowed tile kinds for this ring
  pool: WorldCellType[];

  // Minimum count of each tile kind (defaults to 0 if not specified)
  minCounts: Partial<Record<WorldCellType, number>>;

  // Maximum count of each tile kind (defaults to pool size if not specified)
  maxCounts: Partial<Record<WorldCellType, number>>;

  // Total cap on non-empty, non-fog tiles (includes plot/city/factory/blocker)
  nonEmptyCap: number;

  // Weight for each tile kind when picking (higher = more likely)
  weights: Partial<Record<WorldCellType, number>>;

  // Factory vs city ratio: how many factories per city (e.g., 1.5 = 3 factories for 2 cities)
  factoryToCityRatio: number;

  // First ring where this kind appears (sanity check, not enforced here)
  firstAppearanceRing: Partial<Record<WorldCellType, number>>;
}

/**
 * Balance configuration for all rings.
 *
 * Ring 0: Starting plot only
 * Ring 1: 1-3 special tiles (city/factory split)
 * Ring 2: Plot enters pool
 * Ring 3: Higher cap, better ratios
 * Ring 4: Blocker enters pool
 * Ring 5+: More blockers, better tiles, scaling
 */
export const WORLD_BALANCE: Record<number, RingConfig> = {
  0: {
    pool: ['plot'],
    minCounts: { plot: 1 },
    maxCounts: { plot: 1 },
    nonEmptyCap: 1,
    weights: { plot: 1 },
    factoryToCityRatio: 0, // No cities/factories in ring 0
    firstAppearanceRing: { plot: 0 },
  },

  1: {
    pool: ['city', 'factory', 'empty'],
    minCounts: { city: 1, factory: 0, empty: 3 },
    maxCounts: { city: 3, factory: 3, empty: 6 },
    nonEmptyCap: 3, // 1-3 special tiles (city/factory)
    weights: { city: 1, factory: 1, empty: 0.5 },
    factoryToCityRatio: 1, // Equal split by default
    firstAppearanceRing: { city: 1, factory: 1 },
  },

  2: {
    pool: ['city', 'factory', 'plot', 'empty'],
    minCounts: { city: 1, factory: 1, plot: 1, empty: 2 },
    maxCounts: { city: 3, factory: 3, plot: 2, empty: 8 },
    nonEmptyCap: 5,
    weights: { city: 1, factory: 1, plot: 0.5, empty: 0.5 },
    factoryToCityRatio: 1,
    firstAppearanceRing: { city: 1, factory: 1, plot: 2 },
  },

  3: {
    pool: ['city', 'factory', 'plot', 'empty'],
    minCounts: { city: 2, factory: 2, plot: 1, empty: 3 },
    maxCounts: { city: 5, factory: 5, plot: 3, empty: 12 },
    nonEmptyCap: 8,
    weights: { city: 1.2, factory: 1.2, plot: 0.6, empty: 0.3 },
    factoryToCityRatio: 1.2, // Slightly more factories
    firstAppearanceRing: { city: 1, factory: 1, plot: 2 },
  },

  4: {
    pool: ['city', 'factory', 'plot', 'empty', 'blocker'],
    minCounts: { city: 2, factory: 2, plot: 1, empty: 2, blocker: 1 },
    maxCounts: { city: 5, factory: 5, plot: 3, empty: 10, blocker: 4 },
    nonEmptyCap: 10,
    weights: { city: 1.2, factory: 1.2, plot: 0.6, empty: 0.2, blocker: 0.3 },
    factoryToCityRatio: 1.2,
    firstAppearanceRing: { city: 1, factory: 1, plot: 2, blocker: 4 },
  },

  5: {
    pool: ['city', 'factory', 'plot', 'empty', 'blocker'],
    minCounts: { city: 3, factory: 3, plot: 2, empty: 2, blocker: 2 },
    maxCounts: { city: 7, factory: 7, plot: 4, empty: 12, blocker: 6 },
    nonEmptyCap: 14,
    weights: { city: 1.4, factory: 1.4, plot: 0.8, empty: 0.1, blocker: 0.5 },
    factoryToCityRatio: 1.3,
    firstAppearanceRing: { city: 1, factory: 1, plot: 2, blocker: 4 },
  },
};

/**
 * Get configuration for a given ring number.
 *
 * For rings >= 5, uses ring 5 config as baseline (can be extended).
 *
 * @param ring - The ring number (0 = center)
 * @returns The RingConfig for that ring
 */
export function getRingConfig(ring: number): RingConfig {
  if (ring === undefined || ring < 0) {
    return WORLD_BALANCE[0];
  }

  if (ring in WORLD_BALANCE) {
    return WORLD_BALANCE[ring];
  }

  // Fallback to ring 5 for rings > 5 (infinite world support)
  return WORLD_BALANCE[5];
}

/**
 * Calculate the number of tiles in a ring.
 *
 * Ring 0: 1 tile (center)
 * Ring n > 0: 6 * n tiles
 *
 * @param ring - The ring number
 * @returns Number of tiles in that ring
 */
export function getRingTileCount(ring: number): number {
  if (ring === 0) {
    return 1;
  }
  return 6 * ring;
}

/**
 * Calculate expected factory count from city count using the ratio formula.
 *
 * @param cityCount - Number of cities
 * @param factoryToCityRatio - Ratio (e.g., 1.5 = 3 factories for 2 cities)
 * @returns Expected factory count (rounded)
 */
export function calculateFactoryCount(cityCount: number, factoryToCityRatio: number): number {
  return Math.round(cityCount * factoryToCityRatio);
}

/**
 * Get the weight for a tile kind in a given ring config.
 *
 * @param ringConfig - The ring configuration
 * @param tileKind - The tile kind to get weight for
 * @returns The weight (default 1 if not specified)
 */
export function getTileWeight(ringConfig: RingConfig, tileKind: WorldCellType): number {
  return ringConfig.weights[tileKind] ?? 1;
}

/**
 * Calculate total weight for all tile kinds in a pool.
 *
 * @param ringConfig - The ring configuration
 * @returns Total weight sum
 */
export function getTotalWeight(ringConfig: RingConfig): number {
  return ringConfig.pool.reduce((sum, tileKind) => {
    return sum + getTileWeight(ringConfig, tileKind);
  }, 0);
}

/**
 * Get the normalization factor for weighted picking.
 *
 * @param ringConfig - The ring configuration
 * @returns Array of normalized probabilities for each tile in pool
 */
export function getNormalizedWeights(ringConfig: RingConfig): number[] {
  const total = getTotalWeight(ringConfig);
  return ringConfig.pool.map((tileKind) => {
    return getTileWeight(ringConfig, tileKind) / total;
  });
}

/**
 * Check if a tile kind is allowed in a given ring.
 *
 * @param ringConfig - The ring configuration
 * @param tileKind - The tile kind to check
 * @returns True if the tile kind is in the pool
 */
export function isTileKindAllowed(ringConfig: RingConfig, tileKind: WorldCellType): boolean {
  return ringConfig.pool.includes(tileKind);
}

/**
 * Check if adding a tile would exceed the non-empty cap.
 *
 * @param nonEmptyCap - The maximum non-empty tiles allowed
 * @param currentNonEmpty - Current count of non-empty tiles
 * @returns True if adding another would exceed cap
 */
export function wouldExceedNonEmptyCap(nonEmptyCap: number, currentNonEmpty: number): boolean {
  return currentNonEmpty >= nonEmptyCap;
}

/**
 * Get the minimum required count for a tile kind.
 *
 * @param ringConfig - The ring configuration
 * @param tileKind - The tile kind to check
 * @returns Minimum count (default 0)
 */
export function getMinCount(ringConfig: RingConfig, tileKind: WorldCellType): number {
  return ringConfig.minCounts[tileKind] ?? 0;
}

/**
 * Get the maximum allowed count for a tile kind.
 *
 * @param ringConfig - The ring configuration
 * @param tileKind - The tile kind to check
 * @returns Maximum count (default: no limit)
 */
export function getMaxCount(ringConfig: RingConfig, tileKind: WorldCellType): number {
  return ringConfig.maxCounts[tileKind] ?? Infinity;
}
