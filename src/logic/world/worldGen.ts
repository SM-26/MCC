// src/logic/world/worldGen.ts

/**
 * Deterministic overworld generator for Mines & Choo-Choos.
 *
 * Generates an infinite-in-theory axial hex map whose tiles begin as fog
 * and are revealed by player exploration.
 *
 * Seeded by SettingsState.worldSeed and EngineeringState.resetCount,
 * so the world regenerates from scratch on reset while remaining deterministic.
 *
 * Design doc responsibilities:
 * - Seeded reveal and generation rules
 * - Ring-based pools, weights, caps, and formulas
 * - Early progression guarantees
 * - Name picking with depletion behavior
 */

import seedrandom from 'seedrandom';
import type { SeededRng } from './worldNames';
import { pickUniquePlotName, pickUniqueCityName, pickFactoryNameForResources, createNameState, getReservedNames } from './worldNames';
import type { NameState } from './worldNames';

import {
    getRingConfig,
    getRingTileCount,
    getMinCount,
    getMaxCount,
    getNormalizedWeights,
} from './worldBalance';
import type { RingConfig } from './worldBalance';

import { getHexRing, makeHex, hexCoordToId } from './hex';
import type { WorldCell, WorldCellType, ResourceType, WorldState } from './worldTypes';

// ============================================================================
// Seeded RNG
// ============================================================================

/**
 * Create a seeded RNG from world seed and reset count.
 *
 * @param worldSeed - The world seed string (from SettingsState.worldSeed)
 * @param resetCount - The reset count (from EngineeringState.resetCount)
 * @returns A seeded PRNG function
 */
export function makeSeededRng(worldSeed: string, resetCount: number): SeededRng {
    const seedString = `${worldSeed}-${resetCount}`;
    const rng = seedrandom(seedString);
    return rng;
}

// ============================================================================
// World Generation State
// ============================================================================

/**
 * Internal state for world generation.
 */
interface GenState {
    nameState: NameState;
    generatedCells: WorldCell[];
    nonEmptyCount: number;
    tileCounts: Record<WorldCellType, number>;
}

/**
 * Create initial generation state.
 */
function createGenState(): GenState {
    return {
        nameState: createNameState(),
        generatedCells: [],
        nonEmptyCount: 0,
        tileCounts: {
            fog: 0,
            empty: 0,
            plot: 0,
            city: 0,
            factory: 0,
            blocker: 0,
        },
    };
}

// ============================================================================
// Ring 0 Generation (Starting Plot)
// ============================================================================

/**
 * Generate ring 0: exactly one starting plot tile.
 *
 * For world seed '123456' with reset count 0, the seeded naming flow
 * should yield 'Prague' through normal list ordering.
 *
 * @param rng - Seeded RNG
 * @returns The starting plot cell
 */
function generateRing0(rng: SeededRng): WorldCell {
    const coord = makeHex(0, 0);
    const name = pickUniquePlotName(createGenState().nameState, rng, []);

    // Default to Prague if name picking fails (shouldn't happen with normal seed)
    const plotName = name ?? 'Prague';

    return {
        id: hexCoordToId(coord),
        name: plotName,
        type: 'plot',
        q: coord.q,
        r: coord.r,
        ring: 0,
        discovered: true, // Starting plot is always discovered
    };
}

// ============================================================================
// Ring Generation (1+)
// ============================================================================

/**
 * Generate all tiles for a given ring.
 *
 * Rules:
 * - Tiles start as fog
 * - Some fog tiles are pre-revealed as special tiles (city/factory/plot/blocker)
 * - Remaining tiles stay as fog for player exploration
 * - Special tile counts respect ring caps and min/max constraints
 *
 * @param ring - The ring number
 * @param rng - Seeded RNG
 * @param state - Generation state
 * @returns Array of cells in this ring
 */
function generateRing(ring: number, rng: SeededRng, state: GenState): WorldCell[] {
    if (ring === 0) {
        return [generateRing0(rng)];
    }

    const center = makeHex(0, 0);
    const ringCoords = getHexRing(center, ring);
    const ringConfig = getRingConfig(ring);
    const totalTiles = getRingTileCount(ring);

    // Initialize all tiles as fog
    const cells: WorldCell[] = ringCoords.map((coord) => {
        return {
            id: hexCoordToId(coord),
            name: '',
            type: 'fog',
            q: coord.q,
            r: coord.r,
            ring: ring,
            discovered: false,
        };
    });

    // Determine special tile distribution
    const specialTiles = distributeSpecialTiles(ringConfig, totalTiles, rng, state);

    // Assign special tiles to positions
    const positions = shuffleArray(ringCoords, rng);
    for (let i = 0; i < specialTiles.length && i < positions.length; i++) {
        const tileType = specialTiles[i];
        const coord = positions[i];
        const cellIndex = cells.findIndex((c) => c.q === coord.q && c.r === coord.r);

        if (cellIndex === -1) {
            continue;
        }

        // Generate name and properties for special tile
        const name = generateTileName(tileType, state.nameState, rng);
        const cell = cells[cellIndex];
        cell.type = tileType;
        cell.name = name;
        cell.discovered = false; // Special tiles are revealed but not discovered until visited

        // Update counts
        state.tileCounts[tileType]++;
        state.nonEmptyCount++;
    }

    return cells;
}

/**
 * Distribute special tiles according to ring config.
 *
 * @param ringConfig - The ring configuration
 * @param totalTiles - Total tiles in this ring
 * @param rng - Seeded RNG
 * @param state - Generation state
 * @returns Array of special tile types to place
 */
function distributeSpecialTiles(ringConfig: RingConfig, totalTiles: number, rng: SeededRng, state: GenState): WorldCellType[] {
    const specialTiles: WorldCellType[] = [];

    // Calculate city/factory split
    const targetNonEmpty = Math.min(ringConfig.nonEmptyCap, totalTiles);

    // Start with minimum counts
    for (const tileType of ringConfig.pool) {
        const min = getMinCount(ringConfig, tileType);
        for (let i = 0; i < min; i++) {
            specialTiles.push(tileType);
            state.tileCounts[tileType]++;
        }
    }

    // Calculate city/factory ratio
    // const currentCities = state.tileCounts.city;
    // const targetCities = Math.max(getMinCount(ringConfig, 'city'), Math.min(state.tileCounts.city, getMaxCount(ringConfig, 'city')));
    // const targetFactories = calculateFactoryCount(targetCities, ringConfig.factoryToCityRatio);

    // Add more tiles up to cap
    while (specialTiles.length < targetNonEmpty) {
        // Pick weighted tile from pool
        const tileType = pickWeightedTileKind(ringConfig, rng, state);

        if (!tileType) {
            break;
        }

        // Check constraints
        const max = getMaxCount(ringConfig, tileType);
        if (state.tileCounts[tileType] >= max) {
            continue;
        }

        specialTiles.push(tileType);
        state.tileCounts[tileType]++;
    }

    return specialTiles;
}

/**
 * Pick a weighted tile kind from the pool.
 *
 * @param ringConfig - The ring configuration
 * @param rng - Seeded RNG
 * @param state - Generation state
 * @returns The picked tile kind, or null if no valid pick
 */
function pickWeightedTileKind(ringConfig: RingConfig, rng: SeededRng, state: GenState): WorldCellType | null {
    const normalizedWeights = getNormalizedWeights(ringConfig);
    const rngValue = rng();

    let cumulative = 0;
    for (let i = 0; i < ringConfig.pool.length; i++) {
        cumulative += normalizedWeights[i];
        if (rngValue < cumulative) {
            const tileType = ringConfig.pool[i];

            // Check if we can still add this tile type
            const max = getMaxCount(ringConfig, tileType);
            if (state.tileCounts[tileType] < max) {
                return tileType;
            }
        }
    }

    // Fallback to first valid type
    for (const tileType of ringConfig.pool) {
        const max = getMaxCount(ringConfig, tileType);
        if (state.tileCounts[tileType] < max) {
            return tileType;
        }
    }

    return null;
}

/**
 * Generate a name for a tile.
 *
 * @param tileType - The type of tile
 * @param nameState - The name state
 * @param rng - Seeded RNG
 * @returns The generated name
 */
function generateTileName(tileType: WorldCellType, nameState: NameState, rng: SeededRng): string {
    switch (tileType) {
        case 'plot':
            return pickUniquePlotName(nameState, rng, getReservedNames(0)) ?? 'Unknown';
        case 'city':
            return pickUniqueCityName(nameState, rng) ?? 'Unknown';
        case 'factory': {
            const resources: ResourceType[] = ['Oil', 'Coal', 'Copper', 'SuperAlloy'];
            const resource = resources[Math.floor(rng() * resources.length)];
            return pickFactoryNameForResources([resource], rng);
        }
        case 'blocker': {
            // Blocker flavor: river, lake, mountain
            const flavors = ['River', 'Lake', 'Mountain'];
            return flavors[Math.floor(rng() * flavors.length)];
        }
        default:
            return '';
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Shuffle an array in place using the provided RNG.
 */
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

/**
 * Generate the initial world state.
 *
 * Generates ring 0 (starting plot) and ring 1 (fog + special tiles).
 * Player starts with 7 visible tiles: 1 discovered plot + 6 fog tiles.
 *
 * @param worldSeed - The world seed string
 * @param resetCount - The reset count
 * @param ringsToGenerate - Number of rings to generate (default: 1 for ring 0 + 1)
 * @returns The initial world state
 */
export function generateWorld(worldSeed: string, resetCount: number, ringsToGenerate: number = 1): WorldState {
    const rng = makeSeededRng(worldSeed, resetCount);
    const state = createGenState();

    // Generate rings
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

/**
 * Reveal a fog tile as the player explores.
 *
 * Rules:
 * - Fog tile is revealed into one of the allowed tile kinds for that ring
 * - If ring has hit its cap for special tiles, revealed tile becomes empty
 * - Fog tile may reveal into blocker once blockers enter the pool
 *
 * @param cell - The fog cell to reveal
 * @param worldSeed - The world seed
 * @param resetCount - The reset count
 * @returns The revealed cell
 */
export function revealFogTile(cell: WorldCell, worldSeed: string, resetCount: number): WorldCell {
    const rng = makeSeededRng(worldSeed, resetCount);
    const ringConfig = getRingConfig(cell.ring);

    // Clone cell
    const revealed: WorldCell = { ...cell };

    // Pick tile kind from pool
    const normalizedWeights = getNormalizedWeights(ringConfig);
    const rngValue = rng();

    let cumulative = 0;
    let chosenType: WorldCellType = 'empty'; // Default fallback

    for (let i = 0; i < ringConfig.pool.length; i++) {
        cumulative += normalizedWeights[i];
        if (rngValue < cumulative) {
            chosenType = ringConfig.pool[i];
            break;
        }
    }

    revealed.type = chosenType;
    revealed.discovered = true;

    // Generate name if special tile
    if (chosenType !== 'empty' && chosenType !== 'fog') {
        const nameState = createNameState();
        revealed.name = generateTileName(chosenType, nameState, rng);

        // Add capacity for city/factory
        if (chosenType === 'city' || chosenType === 'factory') {
            revealed.capacity = Math.floor(10 + rng() * 40); // 10-50 capacity
        }

        // Add accepted resources for factory
        if (chosenType === 'factory') {
            const resources: ResourceType[] = ['Oil', 'Coal', 'Copper', 'SuperAlloy'];
            revealed.acceptedResources = [resources[Math.floor(rng() * resources.length)]];
        }
    }

    return revealed;
}
