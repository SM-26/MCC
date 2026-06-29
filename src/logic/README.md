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
│  worldStore     - World map, cells, destinations, selection  │
│  plotsStore     - Cell-keyed plot map, mine/station state    │
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
│    - stationActions.ts: Platform build and train management   │
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
| **worldStore** | World map, cells, and selection | `cells`, `activePlotCellId`, `inspectedCellId` |
| **plotsStore** | Cell-keyed plot map (`Record<cellId, PlotState>`) | `get(cellId)` → `mineshafts`, `station`, `ageResources` |
| **engineeringStore** | Tech tree progress | `engineeringIdeas`, `resetCount` |
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
plotsStore.replace(initialState.world.plots); // Record<cellId, PlotState>
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
worldStore.setInspectedCellId(cell.id)  // read-only inspection, not persisted
  ↓
UI updates to show inspected cell info
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
  
  // Generate world with plot cell at ring 0
  const world = generateWorld(worldSeed, resetCount, 1);
  
  // Find the starting plot cell (always (0,0))
  const plotCell = world.cells.find((cell) => cell.type === 'plot' && cell.ring === 0);
  const cellId = plotCell?.id ?? '0,0';
  
  // Create scaffold for the starting plot — keyed by its cell id
  const initialPlot: PlotState = {
    mineshafts: [
      {
        mineDepths: [generatePlot(worldSeed, resetCount, 0, 0)],
        // ... other fields
      },
    ],
    station: null,
    // ...
  };
  
  world.plots[cellId] = initialPlot;
  world.activePlotCellId = cellId;
  
  return { money: 75, world, engineering: {...}, settings: {...} };
}
```

**Key Connection:** Cell id is the plot key — no separate plotId.

### 2. Plot Selection (`worldStore.svelte.ts`)

```typescript
setActivePlotCellId(cellId: WorldCellId): boolean {
  const plot = plotsStore.get(cellId);
  if (!plot || !isPlotBuilt(plot)) {
    return false; // Not a built plot
  }

  state.activePlotCellId = cellId; // ← CRITICAL: tells Mine/Station which plot is active
  return true;
}
```

**Key Connection:** `activePlotCellId` is the single selection handle; `plotsStore.get(activePlotCellId)` gives the live plot state.

### 3. State Persistence (`save.svelte.ts`)

```typescript
function getPersistedSnapshot(): PersistedGameState {
  return {
    ...defaults,
    money: gameState.current.money,
    settings: $state.snapshot(gameState.current.settings),
    world: $state.snapshot(worldStore.current), // world.plots holds all PlotState entries
    engineering: $state.snapshot(defaults.engineering),
    navigation: $state.snapshot(navigation.current),
  };
}
```

**Key Connection:** `world.plots` (the `Record<cellId, PlotState>` map) is saved as part of `world`; no separate plots array.

---

## Synchronization Checklist

After any refactoring, verify these connection points:

- [ ] **Plot Key:** Every plot entry in `world.plots` is keyed by its Cell id (`"q,r"`) — no separate plotId
- [ ] **World-Plot Link:** Every discovered plot cell has an entry in `world.plots` (Record keyed by cellId)
- [ ] **Active Plot Cell ID:** `activePlotCellId` references a Built plot cell
- [ ] **Inspected Cell ID:** `inspectedCellId` (World-view only, not persisted) matches a world cell
- [ ] **Mine Dimensions:** Mine grid dimensions match config (5x5 for depth 0)
- [ ] **Tile Types:** Mine tiles match generation config for each depth
- [ ] **Blocker Placement:** Blockers only appear at depths ≥2
- [ ] **RNG Consistency:** Same seed produces identical world/mine layouts

---

## Common Pitfalls

### 1. Direct Store Mutation

**❌ Bad:**
```typescript
// Don't mutate plot state directly!
plotsStore.get(cellId).mineshafts[0].mineDepths[0].tiles[0][0].type = 'coal';
```

**✅ Good:**
```typescript
// Mutate via plotsStore — it owns the reactive PlotState in place
const plot = plotsStore.get(cellId);
if (plot) {
  plot.mineshafts[0].mineDepths[0].tiles[0][0] = { ...tile, type: 'coal' };
}
```

### 2. Missing Plot Entry on Discovery

**❌ Bad:**
```typescript
// User discovers plot but scaffold is never created
cell.discovered = true; // Plot has no entry in world.plots yet!
```

**✅ Good:**
```typescript
// Create the scaffold in world.plots when a plot cell is first discovered
if (cell.type === 'plot' && !plotsStore.get(cell.id)) {
  plotsStore.set(cell.id, createScaffoldPlot());
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
- Plot key integrity (cellId matches a plot cell)

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
1. Initial state creation (scaffold keyed by cell id)
2. Plot selection (`activePlotCellId`)
3. State persistence (`world.plots` map saved as part of world)

With the shared types and utilities in place, future development can focus on features rather than infrastructure.
