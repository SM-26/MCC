# MCC Architecture Analysis & Review

## Executive Summary

This document provides a comprehensive analysis of the Mines & Choo-Choos (MCC) V2 architecture, examining the relationship between world generation, mine management, and their integration through shared state stores. The codebase demonstrates solid Svelte 5 practices with Bits-UI integration, though there are several architectural patterns worth documenting and potential areas for improvement.

**Overall Assessment:** ✅ **Well-Structured** - Clear separation of concerns, good use of Svelte runes, proper state management with stores.

---

## Architecture Overview

### Core State Stores (The "Brain")

```
┌─────────────────────────────────────────────────────────────┐
│                    STATE STORES LAYER                        │
├─────────────────────────────────────────────────────────────┤
│  gameState.svelte.ts   - Money, settings, theme              │
│  worldStore.svelte.ts  - World map, cells, plots             │
│  mineStore.svelte.ts   - Plot state, miners, expansions      │
│  stationStore.svelte.ts - Platforms, trains, inventory       │
│  engineeringStore.svelte.ts - Ideas, reset count, unlocks    │
│  navigationStore.svelte.ts - Active tab, UI preferences      │
│  appContext.svelte.ts   - PWA, loading, screen size          │
└─────────────────────────────────────────────────────────────┘
```

### Domain Logic Layers (The "Muscle")

```
┌─────────────────────────────────────────────────────────────┐
│                   DOMAIN LOGIC LAYER                         │
├─────────────────────────────────────────────────────────────┤
│  worldGen.ts          - World generation, ring balancing     │
│  worldBalance.ts      - Per-ring tile configuration          │
│  worldNames.ts        - Naming pools, uniqueness tracking    │
│  mineGen.ts           - Mine tile generation                 │
│  mineTick.ts          - Mining loop, resource extraction     │
│  mineActions.ts       - Buy miners, dig deeper, navigation   │
│  hex.ts               - Hex coordinate math                  │
└─────────────────────────────────────────────────────────────┘
```

### UI Components (The "Face")

```
┌─────────────────────────────────────────────────────────────┐
│                      UI COMPONENT LAYER                      │
├─────────────────────────────────────────────────────────────┤
│  WorldView.svelte     - World map tab                        │
│    └── WorldGrid.svelte - Hex grid rendering                 │
│  MineView.svelte      - Mine tab                             │
│    └── MineGrid.svelte - Mine tile grid                      │
│    └── MineHeader.svelte - Shaft navigation                  │
│  SettingsView.svelte  - Settings tab                         │
│  Splash.svelte        - Loading screen                       │
│  GameTooltip.svelte   - Toast notifications                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Models

### World Model (`worldTypes.ts`)

```typescript
interface WorldCell {
  id: string;           // Unique identifier (e.g., "0,0")
  name: string;         // Generated name (e.g., "Prague", "Narnia")
  type: 'empty' | 'plot' | 'city' | 'factory' | 'blocker';
  q: number;            // Axial hex coordinate q
  r: number;            // Axial hex coordinate r
  ring: number;         // Distance from center (0,0)
  discovered: boolean;  // Fog of war state
  capacity?: number;    // For city/factory destinations
  acceptedResources?: ResourceType[];  // For factories
}

interface WorldPlot {
  plotId: string;       // e.g., "plot-0"
  cellId: WorldCellId;  // Links to world cell
  discovered: boolean;
}
```

**Key Insight:** Plots are tracked separately from world cells. A plot represents a mineable location, while a cell is a map tile. This separation allows for expansion mechanics.

### Mine Model (`mineTypes.ts`)

```typescript
interface PlotState {
  plotId: string;
  currentAge: Ages;     // Mechanical → Steam → Diesel → Electric → Maglev
  ageResources: AgeResources;  // Accumulated resources per age
  northExpansions: NorthExpansion[];  // Horizontal expansion slots
  activeNorthExpansionIndex: number;
  station: Station | null;  // Station built at this plot
}

interface NorthExpansion {
  mineDepths: MineDepthState[];  // Vertical expansion (depths)
  selectedMiner: Miner | null;   // Currently selected miner
  draggedMiner: Miner | null;    // Dragging state
  lastTick: number;              // Last mining tick timestamp
  activeDepthIndex: number;      // Current depth being mined
}

interface MineDepthState {
  depth: number;         // 0 = surface, negative = underground
  rows: number;          // Grid height (e.g., 5)
  cols: number;          // Grid width (e.g., 5)
  tiles: MineTile[][];   // 2D grid of tiles
  miners: Miner[];       // Miners on this depth
}

interface Miner {
  level: number;         // Mining power (1+)
  tileIndex: number;     // Position in grid
  facing: number;        // Direction miner is facing
  progress: number;      // Animation/transition state
}
```

**Key Insight:** Mines have both horizontal (`northExpansions`) and vertical (`mineDepths`) expansion axes. This allows for a growing underground empire.

### World Generation Model (`worldGen.ts`)

```typescript
interface RingConfig {
  pool: WorldCellType[];           // Available tile types for this ring
  minCounts: Record<Type, number>; // Minimum required tiles
  maxCounts: Record<Type, number>; // Maximum allowed tiles
  nonEmptyCap: number;             // Max special tiles per ring
  weights: Record<Type, number>;   // Weighted random selection
  factoryToCityRatio: number;      // Balance between cities and factories
}
```

**Key Insight:** Ring-based generation with configurable balance knobs allows for easy tuning of world composition without changing core logic.

---

## Key Architectural Patterns

### 1. **Seeded Deterministic Generation**

Both world and mine generation use seeded RNG:

```typescript
// World generation seed
const worldSeed = '123456';
const resetCount = 0;
const rng = seedrandom(`${worldSeed}-${resetCount}`);

// Mine generation seed (includes depth and shaft)
const rng = seedrandom(`${worldSeed}-${resetCount}-${depth}-${shaftIndex}`);
```

**Benefit:** Same seed + reset count always produces identical world/mine layouts. Enables reproducible testing and "seed sharing" with players.

### 2. **Store-Based State Management**

All state lives in `$state` stores with derived values:

```typescript
export const worldStore = createWorldStore();

const activePlot = $derived(getActivePlot(state));
const destinations = $derived(
  state.cells.map((cell) => getDestinationFromCell(cell))
    .filter((d): d is Destination => d !== null)
);
```

**Benefit:** Reactive updates flow automatically. UI components subscribe to store changes without manual event handling.

### 3. **Action-Result Pattern for Mutations**

Mine actions follow a consistent pattern:

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

**Benefit:** All mutations return structured results with success/failure states, enabling consistent error handling in UI.

### 4. **Ring-Based World Balancing**

World generation uses per-ring configuration:

```typescript
export const WORLD_BALANCE: Record<number, RingConfig> = {
  0: { pool: ['plot'], minCounts: { plot: 1 }, ... },
  1: { pool: ['city', 'factory', 'empty'], nonEmptyCap: 3, ... },
  2: { pool: ['city', 'factory', 'plot', 'empty'], nonEmptyCap: 5, ... },
  // ...
};
```

**Benefit:** Easy to tune world composition by adjusting ring configs without touching generation logic.

### 5. **Name Pool Depletion System**

Unique names are tracked and depleted:

```typescript
interface NameState {
  usedPlotNames: Set<string>;
  usedCityNames: Set<string>;
  plotNamesDepleted: boolean;
  cityNamesDepleted: boolean;
}

export function pickUniquePlotName(state: NameState, rng: SeededRng): string | null {
  if (state.plotNamesDepleted) {
    return null;
  }

  const available = PLOT_NAMES.filter(
    (name) => !state.usedPlotNames.has(name)
  );

  if (available.length === 0) {
    state.plotNamesDepleted = true;
    log.info('worldNames', 'Plot name pool exhausted');
    return null;
  }

  // ... pick and return name ...
}
```

**Benefit:** Prevents name collisions while allowing graceful degradation when pools are exhausted.

---

## Component Relationships

### WorldView ↔ WorldGrid ↔ WorldStore

```
WorldView.svelte (Tab View)
    ↓ selects/selectPlot/openMine events
WorldGrid.svelte (Hex Grid Renderer)
    ↓ displays cells from worldStore.current.cells
WorldStore (State Source)
```

**Flow:**
1. User clicks fog tile in `WorldGrid`
2. `WorldGrid` calls `onSelectCell(cell)` prop
3. `WorldView` calls `worldStore.setSelectedCellId(cell.id)`
4. UI updates to show selected cell info

### MineView ↔ MineGrid ↔ MineStore

```
MineView.svelte (Tab View)
    ↓ displays mine state
MineGrid.svelte (Tile Grid Renderer)
    ↓ renders activeNorthExpansion.mineDepths[activeDepthIndex].tiles
MineStore (State Source)
```

**Flow:**
1. User drags miner in `MineGrid`
2. `MineGrid` calls `onMinerPointerDown(event, miner)` prop
3. `MineView` updates `activeNorthExpansion.selectedMiner` and `draggedMiner`
4. Mining tick runs automatically via `setInterval`

### State Flow Between World and Mine

```
WorldView (select plot)
    ↓ calls setActivePlotByCellId(cell.id)
WorldStore
    ↓ updates activePlotIndex, selectedCellId
MineStore (via navigation to mine tab)
    ↓ displays state from worldStore.activePlot.cellId
```

**Key Insight:** The world map selects which plot is "active", and the mine view displays that plot's state. This creates a clear master-detail relationship.

---

## Bits-UI Integration

### Tabs Component Usage (`App.svelte`)

```svelte
<Tabs.Root 
  value={currentTab} 
  onValueChange={(value) => handleTabChange(value as TabId)} 
  class="tabs-root nav-pos-{effectiveNavbarPosition}"
>
  <Tabs.List class="navtab-list">
    {#each navigation.current.tabs as tab (tab)}
      <Tabs.Trigger value={tab} title={config.label}>
        <span class="tab-icon">{config.icon}</span>
        {#if isVisible}
          <span class="tab-label">{config.label}</span>
        {/if}
      </Tabs.Trigger>
    {/each}
  </Tabs.List>

  <div class="tabs-panels">
    <Tabs.Content value="world"><WorldView /></Tabs.Content>
    <Tabs.Content value="mine"><MineView /></Tabs.Content>
    <!-- ... -->
  </div>
</Tabs.Root>
```

**Bits-UI Best Practice Alignment:** ✅ **Good** - Uses `onValueChange` for custom logic instead of two-way binding, matching the "Fully Controlled Value State" pattern from Bits-UI docs.

### Tooltip Component (`GameTooltip.svelte`)

```svelte
<Tooltip.Provider delayDuration={150}>
  <Tooltip.Root>
    <Tooltip.Trigger class="tooltip-desktop-trigger">
      {@render trigger()}
    </Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content class="tooltip-box" side="top" align="center" sideOffset={6}>
        <div class="tooltip-header">Details:</div>
        <p class="tooltip-message">"{message}"</p>
        <Tooltip.Arrow class="tooltip-arrow" />
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
</Tooltip.Provider>
```

**Bits-UI Best Practice Alignment:** ✅ **Excellent** - Properly wraps with Provider, uses Portal for content outside root, follows recommended structure.

---

## Performance Considerations

### 1. **Derived Values for Computed State**

```typescript
const activePlot = $derived(getActivePlot(state));
const destinations = $derived(
  state.cells.map((cell) => getDestinationFromCell(cell))
    .filter((d): d is Destination => d !== null)
);
```

**Benefit:** Svelte only recomputes when dependencies change, avoiding unnecessary recalculations.

### 2. **Lazy Initialization of Stores**

Stores are created once and reused:

```typescript
export const worldStore = createWorldStore();
export const mineStore = createMineStore();
export const gameState = createGameStateStore();
```

**Benefit:** No re-initialization on component mounts.

### 3. **Efficient Grid Rendering**

Mine grid uses indexed keys for stable rendering:

```svelte
{#each activeMine.tiles as row, r (`row-${r}`)}
  {#each row as tile, c (`tile-${r}-${c}`)}
    <!-- ... -->
  {/each}
{/each}
```

**Benefit:** Stable element keys prevent unnecessary DOM updates during miner dragging.

---

## Memory Management & Cleanup

### ✅ **Properly Implemented**

1. **MineView** - `onDestroy` clears interval and event listeners
2. **App.svelte** - `onMount` cleanup for splash timer and resize listener
3. **Splash.svelte** - Timeout cleanup in `onMount` return function
4. **save.svelte.ts** - `beforeunload` listener for module-level timeout

```typescript
// MineView example
onMount(() => {
  interval = setInterval(handleMiningTick, 1000);
  window.addEventListener('pointermove', handleGlobalPointerMove, { passive: false });
  // ...
});

onDestroy(() => {
  clearInterval(interval);
  window.removeEventListener('pointermove', handleGlobalPointerMove);
  // ...
});
```

**Status:** ✅ **No memory leaks** - All intervals, timeouts, and event listeners have corresponding cleanup.

---

## Type Safety & TypeScript Usage

### ✅ **Strong Typing**

- All stores use `$state<T>` with explicit generics
- Props are typed with interface types
- Event handlers have proper parameter types
- Union types used for state (e.g., `TabId`, `ScreenSize`)

### ⚠️ **Minor Type Assertion Usage**

```svelte
<Tabs.Root 
  value={currentTab} 
  onValueChange={(value) => handleTabChange(value as TabId)}
>
```

**Recommendation:** Consider using function binding for better type safety:

```svelte
<Tabs.Root 
  bind:value={(getValue, setValue) => ({
    getValue: () => currentTab,
    setValue: (tab: string) => handleTabChange(tab as TabId)
  })}
>
```

---

## Accessibility Considerations

### ✅ **Good Practices**

- Bits-UI components inherit accessibility from Radix/ARIA
- Grid roles and labels on mine tiles
- Tooltip has proper structure with Provider/Root/Content

### ⚠️ **Areas for Improvement**

1. **Tab Navigation** - Could add `aria-current="tab"` to active tab
2. **World Cell Labels** - Consider always showing cell names in dev mode or adding aria-labels
3. **Miner Dragging** - Could improve keyboard accessibility for miner selection

---

## Testing Strategy (Out of Scope)

Test files (*.test.ts) are excluded from this analysis, but the architecture supports:

1. **Unit Tests** - Logic functions like `buyMiner()`, `generateWorld()`
2. **Integration Tests** - Store interactions between world/mine/station
3. **E2E Tests** - User flows through tabs and actions

---

## Recommendations

### High Priority

1. **Add ARIA Attributes** - Enhance tab navigation with `aria-current`
2. **Consider Function Binding for Tabs** - Improve type safety with `bind:value={getValue, setValue}`

### Medium Priority

3. **Create Shared UI Components** - Build reusable wrappers for common Bits-UI patterns (e.g., custom `MineTab`, `WorldMap`)
4. **Add Loading States** - Consider loading indicators during world generation or large operations

### Low Priority

5. **Consistent Styling** - Create shared styles file for Bits-UI component styling
6. **Documentation Comments** - Add JSDoc comments to complex functions like `generateRing()` and `applyBlockers()`

---

## Conclusion

The MCC V2 codebase demonstrates **excellent architectural practices**:

✅ **Clear separation of concerns** between state, logic, and UI  
✅ **Proper use of Svelte 5 runes** (`$state`, `$derived`, `$effect`)  
✅ **Memory-safe** with proper cleanup in all lifecycle hooks  
✅ **Type-safe** with strong TypeScript usage  
✅ **Bits-UI integrated correctly** following best practices  
✅ **Configurable balance** through data-driven ring configs  

The world-mine-station architecture creates a cohesive gameplay loop where:
- World map provides exploration and destination selection
- Mine view handles resource extraction and expansion
- Station view manages train logistics and cargo/passenger routing

All three views share state through the store system, creating a reactive, maintainable codebase.

---

## Appendix: Key File Dependencies

### WorldView.svelte depends on:
- `WorldGrid.svelte` - Hex grid rendering
- `worldStore.svelte.ts` - World state
- `navigationStore.svelte.ts` - Tab navigation
- `gameState.svelte.ts` - Money, settings
- `save.svelte.ts` - Debounced save

### MineView.svelte depends on:
- `MineGrid.svelte` - Mine tile grid
- `MineHeader.svelte` - Shaft navigation UI
- `mineStore.svelte.ts` - Plot/mine state
- `worldStore.svelte.ts` - Active plot selection
- `gameState.svelte.ts` - Money for miner purchases
- `engineeringStore.svelte.ts` - Max shafts/unlocks
- `mineTick.ts` - Mining loop logic
- `mineActions.ts` - Buy/dig/expansion actions

### worldGen.ts depends on:
- `worldBalance.ts` - Ring configuration
- `worldNames.ts` - Naming pools and uniqueness
- `hex.ts` - Hex coordinate math
- `seedrandom` - Seeded RNG

### mineGen.ts depends on:
- `tileDefinitions.ts` - Tile type definitions
- `seedrandom` - Seeded RNG for determinism

---

**Document Version:** 1.0  
**Last Updated:** 2026-06-18  
**Author:** AI Code Review Assistant
