/**
 * ============================================================================
 * Merge & Choo-Choo - Procedural Mine Generator
 * ============================================================================
 * Generates deterministic mine plots based on a global worldSeed.
 * Rules:
 * - 5x5 grid, bottom row (last 5 tiles) is always empty.
 * - Exactly 8 rubble tiles.
 * - Up to 4 blockers, placed such that no adjacent lines occur.
 * - Remainder are dirt tiles.
 * ============================================================================
 */

import { MineTile, MinePlot } from '@/types/game';

// Deterministic Pseudo-Random Number Generator (Mulberry32)
const mulberry32 = (seed: number) => {
    return () => {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

/**
 * Generates a single mine plot deterministically.
 * @param worldSeed - The global seed from AppState
 * @param plotIndex - The index of the plot (used to vary plots within one world)
 */
export const generatePlot = (worldSeed: number, plotIndex: number): MinePlot => {
    const width = 5;
    const height = 5;
    const totalTiles = width * height;

    // Combine seed and index to ensure every plot is unique
    const random = mulberry32(worldSeed + plotIndex);

    const tiles: MineTile[] = Array(totalTiles).fill(null).map(() => ({
        type: 'dirt',
        level: 1,
        hp: 10,
        maxHp: 10,
    }));

    // Rule: Last row (index 20-24) is always empty
    for (let i = totalTiles - width; i < totalTiles; i++) {
        tiles[i].type = 'empty';
        tiles[i].hp = 0;
    }

    // Helper: Check for neighbor blockers (8 directions)
    const isInvalidPosition = (idx: number, currentTiles: MineTile[]) => {
        const r = Math.floor(idx / width);
        const c = idx % width;

        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < height && nc >= 0 && nc < width) {
                    if (currentTiles[nr * width + nc]?.type === 'blocker') return true;
                }
            }
        }
        return false;
    };

    // 1. Place exactly 8 Rubble
    let placedRubble = 0;
    while (placedRubble < 8) {
        const idx = Math.floor(random() * (totalTiles - width));
        if (tiles[idx].type === 'dirt') {
            tiles[idx].type = 'rubble';
            tiles[idx].hp = 25;
            tiles[idx].maxHp = 25;
            placedRubble++;
        }
    }

    // 2. Place up to 4 Blockers
    let placedBlockers = 0;
    let attempts = 0;
    while (placedBlockers < 4 && attempts < 50) {
        const idx = Math.floor(random() * (totalTiles - width));
        if (tiles[idx].type === 'dirt' && !isInvalidPosition(idx, tiles)) {
            tiles[idx].type = 'blocker';
            placedBlockers++;
        }
        attempts++;
    }

    return {
        depth: plotIndex + 1,
        tiles,
        miners: []
    };
};