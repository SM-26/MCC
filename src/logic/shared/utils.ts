// src/logic/shared/utils.ts

/**
 * Shared utility functions used across world and mine domains.
 * 
 * This file provides common functionality to prevent code duplication
 * and ensure consistency across the codebase.
 */

import type { HexCoord } from '../world/hex';
import type { MineTileType } from '../mine/mineTypes';
import type { SeededRng } from './types';
import { TILE_DEFS } from '../mine/tileDefinitions';

// ============================================================================
// Hex Coordinate Math
// ============================================================================

/**
 * Get the 6 orthogonal neighbors of a hex tile in axial coordinates.
 * 
 * Direction offsets for axial (q, r):
 * - East:  (+1,  0)
 * - West:  (-1,  0)
 * - NE:    ( 0, -1)
 * - SW:    ( 0, +1)
 * - SE:    (+1, -1)
 * - NW:    (-1, +1)
 * 
 * @param coord - The hex coordinate
 * @returns Array of 6 neighboring coordinates in clockwise order from East
 */
export function getHexNeighbors(coord: HexCoord): HexCoord[] {
    const { q, r } = coord;

    return [
        { q: q + 1, r: r }, // East
        { q: q - 1, r: r }, // West
        { q: q, r: r - 1 }, // NE
        { q: q, r: r + 1 }, // SW
        { q: q + 1, r: r - 1 }, // SE
        { q: q - 1, r: r + 1 }, // NW
    ];
}

/**
 * Get all hex tiles at a specific ring distance from a center.
 * 
 * Ring 0 = just the center tile itself.
 * Ring 1 = 6 tiles adjacent to center.
 * Ring 2 = 12 tiles, and so on (ring n has 6*n tiles for n > 0).
 * 
 * @param center - The center hex coordinate
 * @param ring - The ring number (0 = center, 1 = adjacent, etc.)
 * @returns Array of hex coordinates at that ring, in clockwise order starting from East
 */
export function getHexRing(center: HexCoord, ring: number): HexCoord[] {
    if (ring === 0) {
        return [center];
    }

    const result: HexCoord[] = [];

    // Start at East position of the ring
    let current = { q: center.q + ring, r: center.r };

    // Walk around the 6 sides of the hex ring
    // Direction order for walking: NE, NW, W, SW, SE, E
    const directions = [
        { dq: 0, dr: -1 }, // NE
        { dq: -1, dr: 0 }, // NW
        { dq: -1, dr: 1 }, // W
        { dq: 0, dr: 1 }, // SW
        { dq: 1, dr: 0 }, // SE
        { dq: 1, dr: -1 }, // E
    ];

    for (let side = 0; side < 6; side++) {
        for (let step = 0; step < ring; step++) {
            result.push(current);
            current = {
                q: current.q + directions[side].dq,
                r: current.r + directions[side].dr,
            };
        }
    }

    return result;
}

/**
 * Convert hex coordinate to string ID.
 * 
 * @param coord - Hex coordinate
 * @returns String ID in format "q,r" (e.g., "0,0" for center)
 */
export function hexCoordToId(coord: HexCoord): string {
    return `${coord.q},${coord.r}`;
}

// ============================================================================
// Tile Creation Helpers
// ============================================================================

/**
 * Create a mine tile from its type definition.
 * 
 * @param type - Type of tile to create
 * @returns MineTile with appropriate properties for the type
 */
export function createMineTile(type: MineTileType): import('../mine/mineTypes').MineTile {
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

// ============================================================================
// RNG Helpers
// ============================================================================

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
 * 
 * @param array - Array to shuffle (returned as new array to avoid mutation)
 * @param rng - Seeded RNG for deterministic shuffling
 * @returns New shuffled array
 */
export function shuffleArray<T>(array: T[], rng: SeededRng): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clamp a value to be within min and max bounds.
 * 
 * @param value - Value to clamp
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Value clamped to [min, max] range
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * Check if a value is within an inclusive range.
 * 
 * @param value - Value to check
 * @param min - Minimum of range
 * @param max - Maximum of range
 * @returns True if value is between min and max (inclusive)
 */
export function isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
}

/**
 * Create a default empty object for AgeResources.
 * 
 * @returns AgeResources with all values set to 0
 */
export function createEmptyAgeResources(): import('../mine/mineTypes').AgeResources {
    return {
        coal: 0,
        oil: 0,
        copper: 0,
        superalloy: 0,
    };
}

/**
 * Get the file name from a path for logging purposes.
 * 
 * @param path - File path (absolute or relative)
 * @returns Just the filename without directory path
 */
export function getFileName(path: string): string {
    return path.split('/').pop()?.split('\\').pop() ?? path;
}

/**
 * Format a number with thousand separators.
 * 
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string (e.g., "1,234.56")
 */
export function formatNumber(value: number, decimals = 0): string {
    const format = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
    return format.format(value);
}

/**
 * Debounce a function to limit how often it can be called.
 * 
 * @param fn - Function to debounce
 * @param wait - Milliseconds to wait between calls
 * @returns Debounced version of the function
 */
export function debounce<T extends (...args: unknown[]) => void>(
    fn: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return function (...args: Parameters<T>) {
        if (timeout) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(() => {
            fn(...args);
        }, wait);
    };
}
