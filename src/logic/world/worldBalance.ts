// src/logic/world/worldBalance.ts

import type { WorldCellType } from './worldTypes';

export interface RingConfig {
  pool: WorldCellType[];
  minCounts: Partial<Record<WorldCellType, number>>;
  maxCounts: Partial<Record<WorldCellType, number>>;
  nonEmptyCap: number;
  weights: Partial<Record<WorldCellType, number>>;
  factoryToCityRatio: number;
  firstAppearanceRing: Partial<Record<WorldCellType, number>>;
}

export const WORLD_BALANCE: Record<number, RingConfig> = {
  0: {
    pool: ['plot'],
    minCounts: { plot: 1 },
    maxCounts: { plot: 1 },
    nonEmptyCap: 1,
    weights: { plot: 1 },
    factoryToCityRatio: 0,
    firstAppearanceRing: { plot: 0 },
  },

  1: {
    pool: ['city', 'factory', 'empty'],
    minCounts: { city: 1, factory: 0, empty: 3 },
    maxCounts: { city: 3, factory: 3, empty: 6 },
    nonEmptyCap: 3,
    weights: { city: 1, factory: 1, empty: 0.5 },
    factoryToCityRatio: 1,
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
    factoryToCityRatio: 1.2,
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

export function getRingConfig(ring: number): RingConfig {
  if (ring === undefined || ring < 0) {
    return WORLD_BALANCE[0];
  }

  if (ring in WORLD_BALANCE) {
    return WORLD_BALANCE[ring];
  }

  return WORLD_BALANCE[5];
}

export function getRingTileCount(ring: number): number {
  if (ring === 0) {
    return 1;
  }
  return 6 * ring;
}

export function calculateFactoryCount(cityCount: number, factoryToCityRatio: number): number {
  return Math.round(cityCount * factoryToCityRatio);
}

export function getTileWeight(ringConfig: RingConfig, tileKind: WorldCellType): number {
  return ringConfig.weights[tileKind] ?? 1;
}

export function getTotalWeight(ringConfig: RingConfig): number {
  return ringConfig.pool.reduce((sum, tileKind) => {
    return sum + getTileWeight(ringConfig, tileKind);
  }, 0);
}

export function getNormalizedWeights(ringConfig: RingConfig): number[] {
  const total = getTotalWeight(ringConfig);
  return ringConfig.pool.map((tileKind) => {
    return getTileWeight(ringConfig, tileKind) / total;
  });
}

export function isTileKindAllowed(ringConfig: RingConfig, tileKind: WorldCellType): boolean {
  return ringConfig.pool.includes(tileKind);
}

export function wouldExceedNonEmptyCap(nonEmptyCap: number, currentNonEmpty: number): boolean {
  return currentNonEmpty >= nonEmptyCap;
}

export function getMinCount(ringConfig: RingConfig, tileKind: WorldCellType): number {
  return ringConfig.minCounts[tileKind] ?? 0;
}

export function getMaxCount(ringConfig: RingConfig, tileKind: WorldCellType): number {
  return ringConfig.maxCounts[tileKind] ?? Infinity;
}
