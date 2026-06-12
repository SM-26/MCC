# MineGen.ts - Technical Design Document

## 1. Overview
`MineGen` is a deterministic, procedural generation engine. It transforms a `worldSeed`, `depth`, and `plotIndex` into a playable grid, ensuring consistent, scalable, and valid terrain generation without persistent storage requirements for the grid state.

## 2. MineGenConfig (Tunables)
The configuration is declarative, enabling easy balancing of the game's economy and difficulty.

```typescript
export const MineGenConfig = {
  // Scaling rules for grid dimensions
  getDimensions: (depth: number, plotIndex: number) => {
    const cols = 5 + Math.floor(depth / 20);
    const rowMap = [5, 6, 6, 7, 7, 8, 8, 8];
    const rows = rowMap[plotIndex] ?? (8 + Math.floor((plotIndex - 7) / 3));
    return { rows, cols };
  },

  // Resource availability based on depth
  resourceBreakpoints: [
    { minDepth: 0,  maxDepth: 4,  resources: ['dirt', 'rubble'] },
    { minDepth: 5,  maxDepth: 9,  resources: ['dirt', 'coal'] },
    { minDepth: 10, maxDepth: 14, resources: ['dirt', 'oil'] },
    { minDepth: 15, maxDepth: 19, resources: ['dirt', 'copper'] },
    { minDepth: 20, maxDepth: 24, resources: ['dirt', 'super-alloy'] },
  ],

  // Dynamic weights to ensure progression within a tier
  getTileWeight: (depth: number, tileType: string) => {
    const offset = depth % 5; 
    // Example: Dirt spawns decrease, Resources increase as depth progresses in a tier
    if (tileType === 'dirt') return 1.0 - (offset * 0.1);
    return 0.1 + (offset * 0.1); 
  },

  blockerDensity: 0.1, // 10% of total tiles
};

```

## 3. Core Logic

* **Determinism:** Seed = `worldSeed + depth + plotIndex`.
* **Constructive Placement:** Blockers are placed iteratively using a `isPlacementValid(row, col)` check to enforce permeability rules (No blocking lines).
* **Docking:** The bottom row (`rows - 1`) is reserved and initialized as `empty`.
* **Probabilistic Scaling:** Resource spawns are calculated using weighted random selection, which dynamically shifts toward higher-value resources as the player nears the end of a depth breakpoint.

## 4. API Specification

### Generation
* `generatePlot(worldSeed: string, depth: number, plotIndex: number): MinePlot`
* Creates and validates a new `MinePlot`.

### Analysis & State
* `getPlotStats(plot: MinePlot): Record<MineTileType, number>`
* Aggregates tile counts for resources and obstacles.
* `getPlotForecast(worldSeed: string, depth: number, plotIndex: number): Record<MineTileType, number>`
* Returns stats for a potential plot without persisting it.
* `getClearStatus(plot: MinePlot): 'none' | 'soft' | 'hard'`
* `soft`: All resources removed.
* `hard`: All resources, dirt, and rubble removed (only blockers/empty remaining).

## 5. Testing Strategy (Vitest)

The `MineGen.test.ts` suite enforces:

* **Constraint Checks:** `assertNoBlockingLines`, `assertBottomRowEmpty`, `assertNoEncapsulation`.
* **Deterministic Tests:** Identical inputs yield identical outputs.
* **Scaling/Weighting Tests:** Verify dimensions and tile-weight distributions match the expected progression curves.

## 6. Types

```typescript
export interface MinePlot {
  depth: number;
  rows: number;
  cols: number;
  tiles: MineTile[][];
  miners: Miner[];
  platform: Platform | null;
}

export type ClearStatus = 'none' | 'soft' | 'hard';

```