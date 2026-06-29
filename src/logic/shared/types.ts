// src/logic/shared/types.ts

/**
 * Shared type definitions used across world and mine domains.
 * 
 * This file prevents type drift by providing a single source of truth
 * for types that are used in multiple domains.
 */

// ============================================================================
// World Domain Types (Exported from worldTypes)
// ============================================================================

/**
 * A tile on the world map.
 * 
 * Can be fog (unrevealed), empty, plot, city, factory, or blocker.
 */
export type {
    WorldCell,
    WorldCellType,
    Destination,
    DestinationId,
    DestinationType,
    WorldState,
    Route,
} from '../world/worldTypes';

/**
 * Hex coordinate math utilities.
 */
export {
    getHexNeighbors,
    getHexRing,
    hexCoordToId,
} from '../world/hex';

// ============================================================================
// Mine Domain Types (Exported from mineTypes)
// ============================================================================

/**
 * A tile within a mine grid.
 * 
 * Can be empty, dirt, rubble, or a resource (coal, oil, copper, superalloy).
 */
export type {
    MineTile,
    MineTileType,
    AgeResources,
    PlotState,
    Mineshaft,
    MineDepthState,
    Miner,
} from '../mine/mineTypes';

/**
 * Mine generation configuration.
 */
export { MineGenConfig } from '../mine/mineGen';

/**
 * Tile definitions for mine tiles.
 */
export { TILE_DEFS } from '../mine/tileDefinitions';

// ============================================================================
// Shared Utilities
// ============================================================================

/**
 * Seeded random number generator function type.
 */
export type SeededRng = () => number;

/**
 * Create a seeded RNG from a seed string.
 */
export async function makeSeededRng(seedString: string): Promise<SeededRng> {
    const seedrandom = (await import('seedrandom')).default;
    return seedrandom(seedString);
}

/**
 * Shuffle an array in-place using the provided RNG.
 * 
 * Uses Fisher-Yates shuffle algorithm for uniform randomness.
 */
export function shuffleArray<T>(array: T[], rng: SeededRng): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Clamp a value to be within min and max bounds.
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * Create a default empty object for AgeResources.
 */
export function createEmptyAgeResources(): import('../mine/mineTypes').AgeResources {
    return {
        coal: 0,
        oil: 0,
        copper: 0,
        superalloy: 0,
    };
}
