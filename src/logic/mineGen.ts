import seedrandom from 'seedrandom';
import type { MinePlot, MineTile, MineTileType } from '../types';

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
        { minDepth: 20, maxDepth: 24, resources: ['dirt', 'super-alloy'] },
    ],

    /** Returns the relative spawn weight for a tile type based on progress within a depth bracket. */
    getTileWeight: (_depth: number, tileType: string) => {
        const offset = _depth % 5;
        if (tileType === 'dirt') {
            return 1.0 - offset * 0.1;
        }
        return 0.1 + offset * 0.1;
    },

    blockerDensity: 0.1,
};

/** Initializes a new tile with default properties. */
function generateTile(_depth: number): MineTile {
    return {
        type: 'dirt',
        level: 1,
        hp: 10,
        maxHp: 10,
        value: 1,
        resourceType: 'none',
    };
}

/** * Generates a deterministic MinePlot based on the provided seed, depth, and index. 
 */
export function generatePlot(worldSeed: string, depth: number, plotIndex: number): MinePlot {
    const rng = seedrandom(`${worldSeed}-${depth}-${plotIndex}`);
    const { rows, cols } = MineGenConfig.getDimensions(depth, plotIndex);

    const tiles: MineTile[][] = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ({
            type: 'empty',
            level: 0,
            hp: 0,
            maxHp: 0,
            value: 0,
            resourceType: 'none',
        })),
    );

    for (let r = 0; r < rows - 1; r++) {
        for (let c = 0; c < cols; c++) {
            tiles[r][c] = generateTile(depth);
        }
    }

    applyBlockers(tiles, rows, cols, rng);
    return { depth, rows, cols, tiles, miners: [], platform: null };
}

/** Populates the mine with blockers while respecting structural constraints. */
function applyBlockers(tiles: MineTile[][], rows: number, cols: number, rng: seedrandom.PRNG) {
    const maxBlockers = Math.floor(rows * cols * MineGenConfig.blockerDensity);
    let placed = 0;

    while (placed < maxBlockers) {
        const r = Math.floor(rng() * (rows - 1));
        const c = Math.floor(rng() * cols);

        if (tiles[r][c].type !== 'blocker' && isPlacementValid(tiles, r, c, rows, cols)) {
            tiles[r][c].type = 'blocker';
            placed++;
        }
    }
}

/** Performs a trial placement to validate blocker integrity and reachability. */
function isPlacementValid(
    tiles: MineTile[][],
    r: number,
    c: number,
    rows: number,
    cols: number,
): boolean {
    tiles[r][c].type = 'blocker';
    const isChainTooLong = wouldCreateLongChain(tiles, r, c, rows, cols);
    const isPocketCreated = wouldCreatePocket(tiles, r, c, rows, cols);
    tiles[r][c].type = 'empty';
    return !isChainTooLong && !isPocketCreated;
}

/** Uses DFS to check if a blocker placement creates a chain exceeding allowed length. */
function wouldCreateLongChain(
    tiles: MineTile[][],
    r: number,
    c: number,
    rows: number,
    cols: number,
): boolean {
    const maxLength = Math.min(rows, cols) - 1;
    const dfs = (currR: number, currC: number, visited: Set<string>): number => {
        visited.add(`${currR},${currC}`);
        let max = 1;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = currR + dr,
                    nc = currC + dc;
                if (
                    nr >= 0 &&
                    nr < rows &&
                    nc >= 0 &&
                    nc < cols &&
                    tiles[nr][nc].type === 'blocker' &&
                    !visited.has(`${nr},${nc}`)
                ) {
                    max = Math.max(max, 1 + dfs(nr, nc, visited));
                }
            }
        }
        return max;
    };
    return dfs(r, c, new Set()) > maxLength;
}

/** Scans neighbors of a new blocker to ensure no 1x1 holes are created. */
function wouldCreatePocket(
    tiles: MineTile[][],
    r: number,
    c: number,
    rows: number,
    cols: number,
): boolean {
    const neighbors = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
    ];
    for (const [nr, nc] of neighbors) {
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && tiles[nr][nc].type !== 'blocker') {
            let walls = 0;
            [
                [nr - 1, nc],
                [nr + 1, nc],
                [nr, nc - 1],
                [nr, nc + 1],
            ].forEach(([nnr, nnc]) => {
                if (
                    nnr < 0 ||
                    nnr >= rows ||
                    nnc < 0 ||
                    nnc >= cols ||
                    tiles[nnr][nnc].type === 'blocker'
                ) {
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

/** Aggregates all tile types present in a plot for analysis. */
export function getPlotStats(plot: MinePlot): Record<MineTileType, number> {
    const stats: Record<string, number> = {};
    plot.tiles.flat().forEach((t) => {
        stats[t.type] = (stats[t.type] || 0) + 1;
    });
    return stats as Record<MineTileType, number>;
}

/** Determines if a plot is 'none', 'soft cleared' (no resources), or 'hard cleared' (no resources, dirt, or rubble). */
export function getClearStatus(plot: MinePlot): 'none' | 'soft' | 'hard' {
    const stats = getPlotStats(plot);
    const resourceCount =
        (stats.coal || 0) + (stats.oil || 0) + (stats.copper || 0) + (stats.superalloy || 0);
    const dirtCount = (stats.dirt || 0) + (stats.rubble || 0);

    if (resourceCount === 0 && dirtCount === 0) {
        return 'hard';
    }
    if (resourceCount === 0) {
        return 'soft';
    }
    return 'none';
}