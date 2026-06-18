# MCC World-Mine Synchronization & Refactoring Plan

## Executive Summary

After recent refactoring, world and mine logic need careful synchronization to prevent drift. This document provides:
1. **Synchronization Checklist** - Ensure world/mine stay in sync
2. **Code Organization Improvements** - Better structure and separation of concerns
3. **Performance Optimizations** - Reduce unnecessary computations
4. **Documentation Updates** - Clearer comments and guides
5. **Testing Strategy** - Faster edge case discovery

---

## 1. World-Mine Synchronization Checklist

### Critical Connection Points

#### A. Initial State Creation (`stateFactory.ts`)

```typescript
// Current flow:
generateWorld(seed, resetCount, 1) → world with plot at ring 0
generatePlot(seed, resetCount, 0, 0) → initial mine depth
```

**⚠️ Potential Drift Risk:** World and mine use separate RNG seeds. They should be deterministic but independent.

**✅ Verification Steps:**
- [ ] Plot cell in world has matching `plotId` with plot in plots array
- [ ] Mine grid dimensions match expected (5x5 for depth 0)
- [ ] Tile types in mine match generation config for depth 0
- [ ] Blockers appear at correct depths (≥2)

#### B. Plot Selection (`worldStore.svelte.ts`)

```typescript
setActivePlotByCellId(cellId): boolean {
  const index = resolveActivePlotIndexFromCellId(cellId);
  if (index === -1) return false;
  
  state.activePlotIndex = index;
  state.selectedCellId = cellId;  // ← CRITICAL: Links world to mine
  return true;
}
```

**⚠️ Potential Drift Risk:** If plot isn't in `plots` array, selection fails silently.

**✅ Verification Steps:**
- [ ] Every discovered plot cell has corresponding entry in `plots` array
- [ ] `createPlotFromCell()` is called when player discovers new plot
- [ ] Plot ID format consistent: `plot-${cellId}`

#### C. Mine State Updates (`mineStore.svelte.ts`)

```typescript
// Mine state is cloned to prevent mutations
cloneMineDepthState(depth: MineDepthState): MineDepthState {
  return {
    depth: depth.depth,
    rows: depth.rows,
    cols: depth.cols,
    tiles: depth.tiles.map((row) => row.map((tile) => ({ ...tile }))),
    miners: depth.miners.map((miner) => ({ ...miner })),
  };
}
```

**⚠️ Potential Drift Risk:** Cloning is expensive for large grids. Consider lazy cloning.

**✅ Verification Steps:**
- [ ] All mutations go through clone functions
- [ ] No direct mutations to `mineStore.current.tiles` or `.miners`
- [ ] Cloning happens at right granularity (not entire store on every tick)

---

## 2. Code Organization Improvements

### A. Create Shared Types File

**Problem:** Types scattered across multiple files (`worldTypes.ts`, `mineTypes.ts`)

**Solution:** Create `src/logic/shared/types.ts`

```typescript
// src/logic/shared/types.ts

// Common types used by both world and mine
export type HexCoord = { q: number; r: number };
export type ResourceType = 'none' | 'money' | 'coal' | 'oil' | 'copper' | 'superalloy';
export type Ages = 'Mechanical' | 'Steam' | 'Diesel' | 'Electric' | 'Maglev';

// Common interfaces
export interface TileBase {
  type: string;
  level: number;
  hp: number;
  maxHp: number;
}

// Export specific types from their domains
export type { 
  WorldCell, 
  WorldCellType, 
  Destination, 
  WorldPlot, 
  WorldState 
} from '../world/worldTypes';

export type {
  MineTile,
  MineTileType,
  AgeResources,
  PlotState,
  NorthExpansion,
  MineDepthState,
  Miner
} from '../mine/mineTypes';
```

**Benefit:** Single source of truth for cross-domain types.

### B. Create Shared Utilities File

**Problem:** Utility functions scattered (`hex.ts`, `tileDefinitions.ts`)

**Solution:** Create `src/logic/shared/utils.ts`

```typescript
// src/logic/shared/utils.ts

import type { HexCoord } from './types';
import type { MineTileType } from '../mine/mineTypes';

// Hex math (from hex.ts)
export function getHexNeighbors(coord: HexCoord): HexCoord[] {
  // ... implementation
}

export function getHexRing(center: HexCoord, ring: number): HexCoord[] {
  // ... implementation
}

export function hexCoordToId(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

// Tile creation helpers
export function createTile(type: MineTileType): MineTile {
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

// RNG helpers
import seedrandom from 'seedrandom';

export function makeSeededRng(seedString: string): () => number {
  return seedrandom(seedString);
}

export function shuffleArray<T>(array: T[], rng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

**Benefit:** Reusable utilities prevent code duplication.

### C. Create Configuration File

**Problem:** Balance configs scattered (`worldBalance.ts`, `mineGenConfig`)

**Solution:** Create `src/logic/config/index.ts`

```typescript
// src/logic/config/index.ts

export * from './worldBalance';
export * from './mineGen';
export * from './namePools';  // Extract name pools here
```

```typescript
// src/logic/config/worldBalance.ts
export * from '../../logic/world/worldBalance';

// src/logic/config/mineGen.ts
export { MineGenConfig } from '../../logic/mine/mineGen';

// src/logic/config/namePools.ts
export { 
  PLOT_NAMES,
  CITY_NAMES,
  FACTORY_NAMES,
} from '../../logic/world/worldNames';
```

**Benefit:** Easy to find all configuration in one place.

---

## 3. Performance Optimizations

### A. Lazy Cloning for Mine State

**Current:**
```typescript
cloneMineDepthState(depth: MineDepthState): MineDepthState {
  return {
    depth: depth.depth,
    rows: depth.rows,
    cols: depth.cols,
    tiles: depth.tiles.map((row) => row.map((tile) => ({ ...tile }))),
    miners: depth.miners.map((miner) => ({ ...miner })),
  };
}
```

**Problem:** Clones entire grid even if only one tile changes.

**Optimized:** Use proxy or shallow clone with deep freeze:

```typescript
// Option 1: Shallow clone with path tracking
function cloneMineDepthState(depth: MineDepthState): MineDepthState {
  return {
    depth: depth.depth,
    rows: depth.rows,
    cols: depth.cols,
    tiles: depth.tiles.map(row => row), // Share tile references
    miners: depth.miners.map(miner => ({ ...miner })), // Clone miners only
  };
}

// Option 2: Use Svelte's snapshot for reactive updates
export function cloneMineDepthStateForSnapshot(depth: MineDepthState): MineDepthState {
  return $state.snapshot(depth);
}
```

**Benefit:** Reduces memory allocation on every mining tick.

### B. Memoized Derived Values

**Current:**
```typescript
const activePlot = $derived(getActivePlot(state));
const destinations = $derived(
  state.cells.map((cell) => getDestinationFromCell(cell))
    .filter((d): d is Destination => d !== null)
);
```

**Optimized:** Add memoization for expensive computations:

```typescript
let destinationsCache: Destination[] | null = null;
let destinationsTimestamp: number = 0;

const destinations = $derived(() => {
  if (destinationsTimestamp === state.cells.length) {
    return destinationsCache ?? [];
  }
  
  const newDestinations = state.cells
    .map((cell) => getDestinationFromCell(cell))
    .filter((d): d is Destination => d !== null);
  
  destinationsCache = newDestinations;
  destinationsTimestamp = state.cells.length;
  
  return newDestinations;
});
```

**Benefit:** Avoids recomputing on every store access.

### C. Debounced Heavy Operations

**Current:** Save is already debounced, but world generation could benefit:

```typescript
// In WorldView or initialization
let worldGenerationTimeout: ReturnType<typeof setTimeout> | null = null;

export function triggerWorldGeneration(seed: string, rings: number): void {
  if (worldGenerationTimeout) {
    clearTimeout(worldGenerationTimeout);
  }
  
  worldGenerationTimeout = setTimeout(() => {
    // Perform heavy generation here
    const world = generateWorld(seed, resetCount, rings);
    worldStore.replace({ cells: world.cells, plots: [], ... });
    
    worldGenerationTimeout = null;
  }, 100); // Small delay to allow UI to render
}
```

**Benefit:** Prevents layout shifts during generation.

---

## 4. Documentation Updates

### A. Add JSDoc Comments to Critical Functions

**Example: `generateRing()`**

```typescript
/**
 * Generate all tiles for a specific ring of the world.
 * 
 * Ring 0 = starting plot only
 * Ring 1 = 6 tiles surrounding center
 * Ring N = 6*N tiles (hexagonal expansion)
 * 
 * @param ring - Ring number (0 = center, 1 = first ring, etc.)
 * @param rng - Seeded random number generator for determinism
 * @param state - Generation state tracking tile counts and names
 * @returns Array of WorldCell objects for this ring
 * 
 * @example
 * // Ring 0 generates just the starting plot
 * const ring0 = generateRing(0, rng, state);
 * // ring0.length === 1
 * 
 * @example
 * // Ring 1 generates 6 tiles around center
 * const ring1 = generateRing(1, rng, state);
 * // ring1.length === 6
 */
function generateRing(ring: number, rng: SeededRng, state: GenState): WorldCell[] {
  // ... implementation
}
```

**Files to document:**
- [ ] `worldGen.ts` - All generation functions
- [ ] `worldBalance.ts` - Ring config explanations
- [ ] `mineGen.ts` - Mine tile generation logic
- [ ] `mineActions.ts` - Action result interfaces

### B. Create README for Logic Layer

**File:** `src/logic/README.md`

```markdown
# MCC Logic Layer Architecture

## State Stores (The Brain)

Each store manages a domain:

- **gameState** - Player money, settings, theme
- **worldStore** - World map, cells, plots, destinations
- **mineStore** - Plot state, miners, expansions, ages
- **stationStore** - Platforms, trains, inventory
- **engineeringStore** - Ideas, reset count, unlocks
- **navigationStore** - Active tab, UI preferences
- **appContext** - PWA, loading, screen size

## Domain Logic (The Muscle)

### World Generation (`world/`)
- `worldGen.ts` - Ring-based world generation
- `worldBalance.ts` - Per-ring tile configuration
- `worldNames.ts` - Naming pools and uniqueness
- `hex.ts` - Hex coordinate math

### Mine Generation (`mine/`)
- `mineGen.ts` - Mine tile generation
- `mineTick.ts` - Mining loop and resource extraction
- `mineActions.ts` - Buy miners, dig deeper, expand
- `mineTypes.ts` - Mine state types

### Shared (`shared/`)
- `types.ts` - Cross-domain type definitions
- `utils.ts` - Reusable utilities (hex math, RNG, etc.)
- `config/` - All configuration files

## Data Flow

```
World Generation → worldStore → WorldView → User selects plot
                                                          ↓
Mine State ← mineStore ← MineView ← User interacts with miners
                                                          ↓
Station Logic ← StationView ← User manages trains/cargo
                                                          ↓
All changes → debouncedSave() → localStorage
```

## Key Patterns

1. **Seeded RNG** - Both world and mine use deterministic generation
2. **Action-Result** - All mutations return structured results
3. **Store Reactivity** - UI updates automatically when stores change
4. **Lazy Cloning** - Mine state cloned only when mutated
```

### C. Update AGENTS.md

Add section about world-mine synchronization:

```markdown
## World-Mine Synchronization

### Critical Connection Points

1. **Initial State** (`stateFactory.ts`)
   - World generates with plot at ring 0
   - Mine generates at depth 0 for that plot
   - Both use same seed + resetCount for determinism

2. **Plot Selection** (`worldStore.svelte.ts`)
   - `setActivePlotByCellId()` links world cell to mine plot
   - Must ensure plot exists in `plots` array before selection

3. **State Updates** (`mineStore.svelte.ts`)
   - All mutations go through clone functions
   - Never mutate store directly

### Verification Checklist

- [ ] Plot ID format: `plot-${cellId}`
- [ ] Every discovered plot has entry in plots array
- [ ] Mine grid dimensions match config
- [ ] Blockers appear at correct depths (≥2)
```

---

## 5. Testing Strategy for Edge Cases

### A. Create Fast Regression Tests

**File:** `src/logic/world/worldGen.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { generateWorld } from '../worldGen';
import { generatePlot } from '../mine/mineGen';

describe('World-Mine Synchronization', () => {
  const SEED = '123456';
  const RESET_COUNT = 0;

  it('generates consistent world across multiple calls', () => {
    const world1 = generateWorld(SEED, RESET_COUNT, 1);
    const world2 = generateWorld(SEED, RESET_COUNT, 1);
    
    expect(world1.cells.length).toBe(world2.cells.length);
    expect(world1.cells[0].type).toBe(world2.cells[0].type);
    expect(world1.cells[0].name).toBe(world2.cells[0].name);
  });

  it('generates consistent mine for same plot', () => {
    const world = generateWorld(SEED, RESET_COUNT, 1);
    const plotCell = world.cells.find(c => c.type === 'plot' && c.ring === 0);
    
    if (!plotCell) throw new Error('No plot found');
    
    const mine1 = generatePlot(SEED, RESET_COUNT, 0, 0);
    const mine2 = generatePlot(SEED, RESET_COUNT, 0, 0);
    
    expect(mine1.tiles.flat().map(t => t.type)).toEqual(
      mine2.tiles.flat().map(t => t.type)
    );
  });

  it('ring 0 has exactly one plot', () => {
    const world = generateWorld(SEED, RESET_COUNT, 1);
    const ring0Plots = world.cells.filter(c => c.ring === 0 && c.type === 'plot');
    
    expect(ring0Plots.length).toBe(1);
  });

  it('ring 1 has exactly 6 tiles', () => {
    const world = generateWorld(SEED, RESET_COUNT, 1);
    const ring1Tiles = world.cells.filter(c => c.ring === 1);
    
    expect(ring1Tiles.length).toBe(6);
  });

  it('blockers only appear at depth ≥2', () => {
    const mine = generatePlot(SEED, RESET_COUNT, 0, 0);
    
    const hasBlockerAtDepth0 = mine.tiles.flat().some(t => t.type === 'blocker');
    expect(hasBlockerAtDepth0).toBe(false);
  });
});
```

**Benefit:** Run tests instantly without playing game.

### B. Create Integration Test Suite

**File:** `src/logic/integration/sync.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { getInitialState } from '../stateFactory';
import { worldStore } from '../world/worldStore';
import { mineStore } from '../mine/mineStore';

describe('World-Mine Integration', () => {
  it('initial state has matching plot in world and plots array', () => {
    const initialState = getInitialState();
    
    const worldPlotCell = initialState.world.cells.find(
      c => c.type === 'plot' && c.ring === 0
    );
    
    expect(worldPlotCell).toBeDefined();
    
    const plotInArray = initialState.plots[0];
    expect(plotInArray).toBeDefined();
    expect(plotInArray.plotId).toBe(`plot-${worldPlotCell?.id}`);
  });

  it('active plot index starts at 0', () => {
    const initialState = getInitialState();
    
    expect(initialState.plots.length).toBe(1);
    expect(initialState.activePlotIndex).toBe(0);
  });

  it('mine has initial depth 0', () => {
    const initialState = getInitialState();
    const mine = initialState.plots[0].northExpansions[0].mineDepths[0];
    
    expect(mine.depth).toBe(0);
    expect(mine.rows).toBe(5);
    expect(mine.cols).toBe(5);
  });
});
```

### C. Create Manual Testing Checklist

**File:** `docs/testing/edge-cases.md`

```markdown
# Edge Cases to Test Manually

## World Map Tab

- [ ] Discover all tiles in ring 1 (should reveal mix of types)
- [ ] Select each discovered plot/city/factory and verify details panel updates
- [ ] Click fog tile and verify it reveals correctly
- [ ] Test with different seeds (try: 123456, 999999, abcdef)

## Mine Tab

- [ ] Buy first miner and verify it appears on grid
- [ ] Drag miner to different tiles (empty, rubble, resources)
- [ ] Verify mining tick runs every second (watch money increase)
- [ ] Clear all tiles and verify "dig deeper" button appears
- [ ] Dig deeper and verify new depth generates correctly
- [ ] Buy second miner and verify they can merge on same tile

## Expansion

- [ ] Unlock second shaft and verify it generates with same seed
- [ ] Compare tile distribution between shafts (should be similar but not identical)
- [ ] Verify each shaft has its own mine state

## Save/Load

- [ ] Make several changes (buy miners, dig deeper, expand)
- [ ] Wait for autosave or manually save
- [ ] Refresh browser and verify state loads correctly
- [ ] Verify money, plot count, and mine states match

## Edge Cases

- [ ] Test with seed that generates many blockers early
- [ ] Test name pool exhaustion (play multiple worlds)
- [ ] Test rapid tab switching (world → mine → world)
- [ ] Test miner drag while saving
- [ ] Test expanding while miners are active
```

---

## 6. Immediate Action Items

### High Priority (Do Now)

1. **Add JSDoc to critical functions** in `worldGen.ts` and `mineGen.ts`
2. **Create `src/logic/shared/types.ts`** with cross-domain types
3. **Add regression tests** in `src/logic/world/worldGen.test.ts`
4. **Update AGENTS.md** with synchronization checklist

### Medium Priority (This Week)

1. **Create `src/logic/shared/utils.ts`** with hex math and RNG helpers
2. **Optimize mine state cloning** to reduce memory allocation
3. **Add memoization** to expensive derived values in worldStore
4. **Create integration tests** in `src/logic/integration/sync.test.ts`

### Low Priority (Next Sprint)

1. **Create configuration file** at `src/logic/config/index.ts`
2. **Update all README files** with architecture documentation
3. **Add performance monitoring** to identify bottlenecks
4. **Create style guide** for consistent code organization

---

## 7. Verification Commands

### Run All Tests (Fast)
```bash
pnpm test:run
```

### Check for Memory Leaks
```bash
# Open DevTools → Performance tab
# Navigate through all tabs
# Take snapshot to check memory usage
```

### Verify Deterministic Generation
```bash
# Create two instances and compare
node -e "
const seedrandom = require('seedrandom');
const rng1 = seedrandom('123456-0');
const rng2 = seedrandom('123456-0');
console.log('RNG 1:', rng1(), rng1(), rng1());
console.log('RNG 2:', rng2(), rng2(), rng2());
console.log('Match:', rng1() === rng2());
"
```

---

## Conclusion

The world-mine synchronization is **fundamentally sound** but needs:
- ✅ Better documentation (JSDoc, README files)
- ✅ Shared utilities to prevent drift
- ✅ Tests for fast regression checking
- ✅ Performance optimizations for large grids

With these improvements, you'll have:
- Clear understanding of how world and mine connect
- Fast way to catch regressions before they become problems
- Better performance as game scales
- Easier onboarding for new developers (including yourself!)

---

**Next Steps:** Start with high priority items. Run tests after each change to ensure no regressions.
