# MCC Logic Layer Architecture

This document provides an overview of the Mines & Choo-Choos (MCC) logic layer architecture, helping you understand how world and mine systems connect and interact.

## Table of Contents

- [Overview](#overview)
- [State Stores (The Brain)](#state-stores-the-brain)
- [Domain Logic (The Muscle)](#domain-logic-the-muscle)
- [Data Flow](#data-flow)
- [Key Patterns](#key-patterns)
- [World-Mine Connection Points](#world-mine-connection-points)
- [Synchronization Checklist](#synchronization-checklist)
- [Common Pitfalls](#common-pitfalls)

---

## Overview

The MCC logic layer is organized into three main layers:

1. **State Stores** - Reactive state management using Svelte 5 `$state` and `$derived`
2. **Domain Logic** - Business logic for world generation, mine operations, etc.
3. **UI Components** - Svelte components that display and interact with the state

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    STATE STORES LAYER                        │
├─────────────────────────────────────────────────────────────┤
│  gameState      - Money, settings, theme                     │
│  worldStore     - World map, cells, plots, destinations      │
│  mineStore      - Plot state, miners, expansions, ages       │
│  stationStore   - Platforms, trains, inventory               │
│  engineeringStore - Ideas, reset count, unlocks              │
│  navigationStore - Active tab, UI preferences                │
│  appContext     - PWA, loading, screen size                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   DOMAIN LOGIC LAYER                         │
├─────────────────────────────────────────────────────────────┤
│  World Generation (world/)                                   │
│    - worldGen.ts      : Ring-based world generation          │
│    - worldBalance.ts  : Per-ring tile configuration          │
│    - worldNames.ts    : Naming pools and uniqueness          │
│    - hex.ts           : Hex coordinate math                  │
│                                                                │
│  Mine Generation (mine/)                                     │
│    - mineGen.ts       : Mine tile generation                 │
│    - mineTick.ts      : Mining loop, resource extraction     │
│    - mineActions.ts   : Buy miners, dig deeper, expand       │
│    - tileDefinitions.ts : Tile type definitions              │
│                                                                │
│  Station Logic (station/)                                    │
│    - stationTypes.ts  : Station model                         │
│    - stationStore.ts  : Platform and train management         │
│                                                                │
│  Shared (shared/)                                            │
│    - types.ts         : Cross-domain type definitions        │
│    - utils.ts         : Reusable utilities                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                      UI COMPONENT LAYER                      │
├─────────────────────────────────────────────────────────────┤
│  WorldView    - World map tab (explore, select destinations) │
│  MineView     - Mine tab (mine resources, expand plots)      │
│  StationView  - Station tab (manage trains, cargo/passengers)│
│  SettingsView - Settings tab (configure game options)        │
└─────────────────────────────────────────────────────────────┘
```

---

## State Stores (The Brain)

All state lives in Svelte 5 stores using the `$state` and `$derived` runes. This makes the UI automatically reactive to state changes.

### Store Responsibilities

| Store | Responsibility | Key Properties |
|-------|---------------|----------------|
| **gameState** | Player resources and settings | `money`, `settings` (theme, navbar, etc.) |
| **worldStore** | World map and destinations | `cells`, `plots`, `activePlotIndex`, `selectedCellId` |
| **mineStore** | Plot state and mining | `northExpansions`, `activeNorthExpansionIndex`, `ageResources` |
| **stationStore** | Train station infrastructure | `platforms`, `trainyardInventory`, `trains` |
| **engineeringStore** | Tech tree progress | `engineeringIdeas`, `resetCount`, `maxNorthExpansions` |
| **navigationStore** | Tab navigation | `activeTab`, `tabs`, UI preferences |
| **appContext** | App-level context | `isPWAInstalled`, `isLoading`, `screenSize` |

### Store Patterns

All stores follow the same pattern:

```typescript
export function createStore(initial?: Partial<T>) {
  const state = $state<T>({
    ...createDefaultState(),
    ...initial,
  });

  return {
    get current() {
      return state;
    },
    
    // Mutations return boolean or structured result
    setProperty(value: T['property']): boolean {
      state.property = value;
      return true;
    },
    
    // Derived values computed from state
    get derivedValue() {
      return $derived(computeFromState(state));
    },
  };
}
```

---

## Domain Logic (The Muscle)

Domain logic handles business rules and transformations. It's organized by domain:

### World Generation (`world/`)

**Purpose:** Generate the world map with hexagonal grid, fog of war, and tile types.

**Key Functions:**

- `generateWorld(seed, resetCount, ringsToGenerate)` - Generate complete world state
- `generateRing(ring, rng, state)` - Generate tiles for one ring
- `distributeSpecialTiles(...)` - Place cities, factories, plots according to balance config
- `revealFogTile(cell, seed, resetCount)` - Reveal a fog tile when explored

**Balance Configuration:**

World generation uses per-ring configuration in `worldBalance.ts`:

```typescript
export const WORLD_BALANCE: Record<number, RingConfig> = {
  0: { pool: ['plot'], minCounts: { plot: 1 }, ... },  // Center: just starting plot
  1: { pool: ['city', 'factory', 'empty'], nonEmptyCap: 3, ... },  // First ring: mix of types
  2: { pool: ['city', 'factory', 'plot', 'empty'], nonEmptyCap: 5, ... },  // Second ring: include plots
  // ...
};
```

### Mine Generation (`mine/`)

**Purpose:** Generate mine grids with tiles, resources, and blockers.

**Key Functions:**

- `generatePlot(seed, resetCount, depth, shaftIndex)` - Generate mine at specific depth
- `runMiningTick(activeMine, currentMoney)` - Run one mining tick (every second)
- `buyMiner(money, activeMine)` - Buy a new miner
- `digDeeper(...)` - Dig to next depth
- `moveOrMergeMiner(...)` - Move or merge miners

**Progression System:**

Mines progress through ages: Mechanical → Steam → Diesel → Electric → Maglev

Each age unlocks new resources and capabilities.

### Station Logic (`station/`)

**Purpose:** Manage train stations, platforms, and trains.

**Key Concepts:**

- **Platforms:** Loading docks at each mine depth
- **Trains:** Vehicles that travel between destinations
- **Inventory:** Engines and carts available to buy
- **Routes:** Paths from mine to city/factory destinations

---

## Data Flow

### Initialization Flow

```typescript
// 1. Create initial state
const initialState = getInitialState();

// 2. Initialize stores with initial state
worldStore.replace(initialState.world);
mineStore.replace(initialState.plots[0]);
gameState.setMoney(initialState.money);
// ... etc
```

### User Interaction Flow

```typescript
// User clicks fog tile in world map
WorldGrid.onSelectCell(cell)
  ↓
WorldView.selectCell(cell)
  ↓
worldStore.setSelectedCellId(cell.id)
  ↓
UI updates to show selected cell info
  ↓
debouncedSave() → Save to localStorage
```

### Mining Flow

```typescript
// Mining tick runs every second
setInterval(handleMiningTick, 1000)
  ↓
runMiningTick(activeMine, currentMoney)
  ↓
Miners damage adjacent tiles
  ↓
Tiles cleared → Resources collected → Money earned
  ↓
debouncedSave() → Save progress
```

---

## Key Patterns

### 1. Seeded Deterministic Generation

Both world and mine use seeded RNG for reproducible generation:

```typescript
// World generation seed
const worldSeed = '123456';
const resetCount = 0;
const rng = seedrandom(`${worldSeed}-${resetCount}`);

// Mine generation seed (includes depth and shaft)
const mineRng = seedrandom(`${worldSeed}-${resetCount}-${depth}-${shaftIndex}`);
```

**Benefit:** Same seed always produces identical world/mine layouts.

### 2. Action-Result Pattern

All mutations return structured results:

```typescript
export interface BuyMinerResult {
  ok: boolean;
  message?: string;
  minerCost: number;
  nextMoney?: number;
}

export function buyMiner(money: number, activeMine: MineDepth | null): BuyMinerResult {
  if (!activeMine) {
    return { ok: false, message: 'No active mine', minerCost: getMinerCost(activeMine) };
  }

  // ... validation and logic ...

  return { ok: true, minerCost, nextMoney: money - minerCost };
}
```

**Benefit:** Consistent error handling in UI.

### 3. Store Reactivity

UI components subscribe to store changes automatically:

```svelte
<script>
  import { worldStore } from '../logic/world/worldStore';
  
  const cells = $derived(worldStore.current.cells);
  const activePlot = $derived(worldStore.activePlot);
</script>

{#each cells as cell (cell.id)}
  <!-- UI automatically updates when worldStore changes -->
{/each}
```

### 4. Lazy Cloning

Mine state is cloned only when mutated:

```typescript
function cloneMineDepthState(depth: MineDepthState): MineDepthState {
  return {
    depth: depth.depth,
    rows: depth.rows,
    cols: depth.cols,
    tiles: depth.tiles.map((row) => row), // Share tile references
    miners: depth.miners.map((miner) => ({ ...miner })), // Clone miners only
  };
}
```

**Benefit:** Reduces memory allocation.

---

## World-Mine Connection Points

These are the critical points where world and mine logic connect:

### 1. Initial State Creation (`stateFactory.ts`)

```typescript
export function getInitialState(): GameState {
  const worldSeed = '123456';
  const resetCount = 0;
  
  // Generate world with plot at ring 0
  const world = generateWorld(worldSeed, resetCount, 1);
  
  // Find the plot cell
  const plotCell = world.cells.find((cell) => cell.type === 'plot' && cell.ring === 0);
  const plotId = plotCell ? `plot-${plotCell.id}` : 'plot-0';
  
  // Generate initial mine for that plot
  const initialPlot: PlotState = {
    plotId,
    northExpansions: [
      {
        mineDepths: [generatePlot(worldSeed, resetCount, 0, 0)],
        // ... other fields
      },
    ],
    // ...
  };
  
  return { money: 75, world, plots: [initialPlot], engineering: {...}, settings: {...} };
}
```

**Key Connection:** Plot ID links world cell to mine plot.

### 2. Plot Selection (`worldStore.svelte.ts`)

```typescript
setActivePlotByCellId(cellId: WorldCellId): boolean {
  const index = resolveActivePlotIndexFromCellId(cellId);
  if (index === -1) {
    return false; // Plot not found in plots array
  }

  state.activePlotIndex = index;
  state.selectedCellId = cellId; // ← CRITICAL: Links world to mine
  return true;
}
```

**Key Connection:** `selectedCellId` tells mine which world cell is active.

### 3. State Persistence (`save.svelte.ts`)

```typescript
function getPersistedSnapshot(): PersistedGameState {
  return {
    ...defaults,
    money: gameState.current.money,
    settings: $state.snapshot(gameState.current.settings),
    world: $state.snapshot(worldStore.current),
    plots: $state.snapshot(mineStore.current ? [mineStore.current] : []),
    engineering: $state.snapshot(defaults.engineering),
    navigation: $state.snapshot(navigation.current),
  };
}
```

**Key Connection:** Both world and mine states are saved together.

---

## Synchronization Checklist

After any refactoring, verify these connection points:

- [ ] **Plot ID Format:** Every plot has `plotId` matching `plot-${cellId}` format
- [ ] **World-Plot Link:** Every discovered plot cell has entry in `plots` array
- [ ] **Active Plot Index:** `activePlotIndex` correctly references existing plot
- [ ] **Selected Cell ID:** `selectedCellId` matches a world cell
- [ ] **Mine Dimensions:** Mine grid dimensions match config (5x5 for depth 0)
- [ ] **Tile Types:** Mine tiles match generation config for each depth
- [ ] **Blocker Placement:** Blockers only appear at depths ≥2
- [ ] **RNG Consistency:** Same seed produces identical world/mine layouts

---

## Common Pitfalls

### 1. Direct Store Mutation

**❌ Bad:**
```typescript
// Don't mutate store directly!
mineStore.current.tiles[0][0].type = 'coal';
```

**✅ Good:**
```typescript
// Use clone and replace
const newTiles = mineStore.current.tiles.map(row => 
  row.map(tile => ({ ...tile, type: 'coal' }))
);

mineStore.replace({
  ...mineStore.current,
  northExpansions: mineStore.current.northExpansions.map(expansion => ({
    ...expansion,
    mineDepths: expansion.mineDepths.map(depth => ({
      ...depth,
      tiles: newTiles
    }))
  }))
});
```

### 2. Missing Plot in Plots Array

**❌ Bad:**
```typescript
// User discovers plot but it's not in plots array
worldStore.createPlotFromCell(cellId); // Must be called!
```

**✅ Good:**
```typescript
// Always call createPlotFromCell when discovering new plot
if (cell.type === 'plot' && !plotExists) {
  const ok = worldStore.createPlotFromCell(cell.id);
  if (!ok) {
    log.error('Failed to create plot entry for discovered plot');
  }
}
```

### 3. Inconsistent Seed Usage

**❌ Bad:**
```typescript
// Different seeds for world and mine!
const worldRng = seedrandom('123456');
const mineRng = seedrandom('789012'); // Wrong!
```

**✅ Good:**
```typescript
// Same seed for both, different reset counts if needed
const worldRng = seedrandom(`${worldSeed}-${resetCount}`);
const mineRng = seedrandom(`${worldSeed}-${resetCount}-${depth}-${shaftIndex}`);
```

---

## Testing Strategy

### Fast Regression Tests

Run these tests after any change:

```bash
pnpm test:run src/logic/integration/sync.test.ts
```

These tests verify:
- World-mine connection points
- Deterministic generation
- State consistency
- Plot ID format

### Manual Testing Checklist

See `docs/testing/edge-cases.md` for comprehensive manual testing guide.

---

## Documentation Resources

- [`ARCHITECTURE-ANALYSIS.md`](../ARCHITECTURE-ANALYSIS.md) - Detailed architecture analysis
- [`WORLD-MINE-SYNC-PLAN.md`](../WORLD-MINE-SYNC-PLAN.md) - Synchronization and refactoring plan
- [`worldGen.md`](../worldGen.md) - World generation design document
- [`BITS-UI-BEST-PRACTICES.md`](../BITS-UI-BEST-PRACTICES.md) - Bits-UI integration guide

---

## Summary

The MCC logic layer is well-architected with:

✅ **Clear separation of concerns** between state, logic, and UI  
✅ **Reactive state management** using Svelte 5 stores  
✅ **Deterministic generation** for reproducible testing  
✅ **Action-result pattern** for consistent error handling  
✅ **Shared utilities** to prevent code duplication  

The world-mine connection is solid but requires careful attention at three key points:
1. Initial state creation (plot ID linking)
2. Plot selection (active plot index)
3. State persistence (save/load)

With the shared types and utilities in place, future development can focus on features rather than infrastructure.
