# Plots-as-Cell-Keyed-Map Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three redundant, drift-prone "plot" structures with a single cell-keyed map of plot state, edited in place, with a lazy scaffold→built lifecycle — killing the active-plot-sync bug class.

**Architecture:** `WorldState` keeps only the hex grid (`cells`) plus two selection fields (`activePlotCellId`, `inspectedCellId`). Developed plot state lives in one map keyed by World cell id (`Record<WorldCellId, PlotState>`), owned by a new `plotsStore`. Mine/Station views derive `plots[activePlotCellId]` and mutate it **in place** — no working copy. Plots are created lazily as Tile-less scaffolds on discovery; "Built" is a **derived** predicate (`isPlotBuilt`), not a stored flag.

**Tech Stack:** Svelte 5 runes (`$state`/`$derived`), TypeScript, Vitest + happy-dom, seedrandom.

## Global Constraints

- Logging: use `log` from `src/lib/logger.ts` — never `console.*`. (`CLAUDE.md`)
- Stores follow the factory + module-singleton shape; use `$state.snapshot(...)` before JSON serialisation. (`CLAUDE.md`)
- A feature's store must not import another feature's store. Cross-feature composition happens only at `stateFactory.ts` / `save/saveTypes.ts`. Views may compose multiple stores. (`CLAUDE.md`)
- Pre-alpha: **no save migration.** A `meta.saveVersion` mismatch hard-resets. Breaking the save schema is allowed.
- Save key: `mcc_save` in `localStorage`. Autosave debounced 500 ms, only after splash clears.
- Tests sit next to source; run single file with `pnpm test:run -- <path>`. Full check: `pnpm check`.
- Canonical vocabulary (`CONTEXT.md`): Cell (World hex) vs Tile (Mine square); Plot identified by **cell id**, no `plotId`; Mineshaft (not `northExpansion`); a Plot is **Built** when its mineshaft's surface depth has Tiles.

---

## File Structure

| File | Responsibility | Phase |
|---|---|---|
| `src/logic/world/worldTypes.ts` | `WorldState` shape, selection helpers, cell helpers. **Remove** `WorldPlot`, `activePlotIndex`, `selectedCellId`, plot-ref helpers. **Add** `activePlotCellId`, `inspectedCellId`. | A |
| `src/logic/world/worldStore.svelte.ts` | Cells + selection mutators (`setActivePlotCellId`, `setInspectedCellId`). **Remove** all `plots[]` logic. | A |
| `src/logic/world/worldGen.ts` | `generateWorld` returns new `WorldState` shape. | A |
| `src/logic/mine/plotsStore.svelte.ts` | **NEW.** Owns `Record<WorldCellId, PlotState>`: `get`, `ensureScaffold`, `replaceAll`, snapshot, in-place mutators (moved from `mineStore`). | B |
| `src/logic/mine/mineTypes.ts` | `PlotState` keeps lifecycle data; add `isPlotBuilt`, `createScaffoldPlot`. (Drop `plotId` in Phase D.) | B/C |
| `src/logic/mine/mineGen.ts` | `buildPlot(cellId, seed, resetCount)` fills a scaffold's surface depth. | C |
| `src/logic/save/saveTypes.ts` | `world.plots: Record<cellId, PlotState>`; root no longer has top-level `plots[]`. | B |
| `src/logic/save/save.svelte.ts` | Snapshot/apply the map + selection; load guard. | B |
| `src/logic/stateFactory.ts` | Seed home plot `(0,0)` into the map, Built. | B |
| `src/views/{World,Mine,Station}View.svelte` | Read selection from `worldStore`, plot from `plotsStore`. | A/B/C |
| `src/App.svelte` | Autosave signature includes selection; splash timer fix. | B/D |

---

## PHASE A — Selection split

Goal: `worldStore` exposes `activePlotCellId` + `inspectedCellId` instead of `activePlotIndex` + `selectedCellId`. `plots[]` is left in place for now (Phase B replaces it). App stays green.

### Task A1: `WorldState` selection fields

**Files:**
- Modify: `src/logic/world/worldTypes.ts:61-66` (the `WorldState` interface + helpers)
- Test: `src/logic/world/worldTypes.test.ts` (create)

**Interfaces:**
- Produces: `WorldState.activePlotCellId: WorldCellId | null`, `WorldState.inspectedCellId: WorldCellId | null`; helper `getActivePlotCell(world): WorldCell | null`.
- Note: keep `plots: WorldPlot[]` and `getActivePlot` temporarily so the file still compiles; they are deleted in Phase B.

- [ ] **Step 1: Write the failing test**

```ts
// src/logic/world/worldTypes.test.ts
import { describe, it, expect } from 'vitest';
import { getActivePlotCell, type WorldState } from './worldTypes';

function makeWorld(partial: Partial<WorldState> = {}): WorldState {
  return {
    cells: [
      { id: '0,0', name: 'Home', type: 'plot', q: 0, r: 0, ring: 0, discovered: true },
    ],
    plots: [],
    activePlotCellId: '0,0',
    inspectedCellId: null,
    ...partial,
  };
}

describe('getActivePlotCell', () => {
  it('returns the cell named by activePlotCellId', () => {
    expect(getActivePlotCell(makeWorld())?.id).toBe('0,0');
  });
  it('returns null when activePlotCellId is null', () => {
    expect(getActivePlotCell(makeWorld({ activePlotCellId: null }))).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run -- src/logic/world/worldTypes.test.ts`
Expected: FAIL — `getActivePlotCell` is not exported / `WorldState` lacks `activePlotCellId`.

- [ ] **Step 3: Edit the `WorldState` interface and add the helper**

Replace `worldTypes.ts:61-70` (the `WorldState` interface and `getActivePlot`) with:

```ts
export interface WorldState {
  cells: WorldCell[];
  plots: WorldPlot[]; // DEPRECATED — removed in plots-map phase; kept for compile only
  activePlotCellId: WorldCellId | null;
  inspectedCellId: WorldCellId | null;
}

export function getActivePlotCell(world: WorldState): WorldCell | null {
  if (!world.activePlotCellId) return null;
  return world.cells.find((cell) => cell.id === world.activePlotCellId) ?? null;
}

export function getActivePlot(world: WorldState): WorldPlot | null {
  // DEPRECATED shim — kept until plots[] is removed in the plots-map phase.
  return world.plots.find((plot) => plot.cellId === world.activePlotCellId) ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run -- src/logic/world/worldTypes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/logic/world/worldTypes.ts src/logic/world/worldTypes.test.ts
git commit -m "refactor(world): add activePlotCellId/inspectedCellId to WorldState"
```

### Task A2: `worldStore` selection mutators

**Files:**
- Modify: `src/logic/world/worldStore.svelte.ts` (default state, `replace`, selection methods)
- Test: `src/logic/world/worldStore.selection.test.ts` (create)

**Interfaces:**
- Produces on the store: `get activePlotCell`, `setActivePlotCellId(cellId | null)`, `setInspectedCellId(cellId | null)`.
- Consumes: `getActivePlotCell` (Task A1).

- [ ] **Step 1: Write the failing test**

```ts
// src/logic/world/worldStore.selection.test.ts
import { describe, it, expect } from 'vitest';
import { createWorldStore } from './worldStore.svelte';

describe('worldStore selection', () => {
  it('sets and reads the active plot cell id', () => {
    const store = createWorldStore({
      cells: [{ id: '0,0', name: 'Home', type: 'plot', q: 0, r: 0, ring: 0, discovered: true }],
    });
    store.setActivePlotCellId('0,0');
    expect(store.current.activePlotCellId).toBe('0,0');
    expect(store.activePlotCell?.id).toBe('0,0');
  });

  it('tracks inspection independently of activation', () => {
    const store = createWorldStore({
      cells: [{ id: '1,0', name: 'City', type: 'city', q: 1, r: 0, ring: 1, discovered: true }],
    });
    store.setInspectedCellId('1,0');
    expect(store.current.inspectedCellId).toBe('1,0');
    expect(store.current.activePlotCellId).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run -- src/logic/world/worldStore.selection.test.ts`
Expected: FAIL — `setActivePlotCellId` not a function.

- [ ] **Step 3: Update `createDefaultWorldState`, the `$state` init, `replace`, and selection methods**

In `worldStore.svelte.ts`:

Replace `createDefaultWorldState` (lines 27-34):

```ts
function createDefaultWorldState(): WorldState {
  return {
    cells: [],
    plots: [],
    activePlotCellId: null,
    inspectedCellId: null,
  };
}
```

Replace the `$state<WorldState>({...})` initialiser (lines 48-55):

```ts
  const state = $state<WorldState>({
    ...createDefaultWorldState(),
    ...initial,
    cells: initial?.cells ? [...initial.cells] : [],
    plots: initial?.plots ? [...initial.plots] : [],
    activePlotCellId: initial?.activePlotCellId ?? null,
    inspectedCellId: initial?.inspectedCellId ?? null,
  });

  const activePlotCell = $derived(getActivePlotCell(state));
```

Add `getActivePlotCell` to the import on line 5.

Replace the `replace` method (lines 104-111):

```ts
    replace(next: WorldState) {
      Object.assign(state, {
        ...next,
        cells: [...next.cells],
        plots: [...next.plots],
        activePlotCellId: next.activePlotCellId ?? null,
        inspectedCellId: next.inspectedCellId ?? null,
      });
    },
```

Replace the selection methods `setActivePlotIndex`/`setActivePlotById`/`setActivePlotByCellId`/`setSelectedCellId`/`getActivePlotIndexForCellId` (lines 113-144) with:

```ts
    get activePlotCell() {
      return activePlotCell;
    },

    setActivePlotCellId(cellId: WorldCellId | null) {
      state.activePlotCellId = cellId;
    },

    setInspectedCellId(cellId: WorldCellId | null) {
      state.inspectedCellId = cellId;
    },
```

Delete `findPlotIndexByCellId`, `findPlotIndexByPlotId`, `resolveActivePlotIndexFromCellId`, `clampIndex`, `makePlotIdFromCellId`, `createDefaultWorldPlot`, and the `activePlot`/`getActivePlot` derived + getter (lines 19-25, 36-45, 57, 63-85, 92-94). Also delete `addPlot`/`createPlot`/`createPlotFromCell`/`updatePlot`/`getPlotById` (lines 174-231) — plot membership is no longer a world concern.

> If removing those methods breaks `worldStore.test.ts` or `sync.test.ts`, that is expected — those tests are rewritten in Phase B (Task B5). Comment out the now-failing cases with `it.skip` and a `// TODO(plots-map)` note rather than deleting them, so Phase B can restore intent.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run -- src/logic/world/worldStore.selection.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/logic/world/worldStore.svelte.ts src/logic/world/worldStore.selection.test.ts
git commit -m "refactor(world): replace plot-index selection with cell-id selection"
```

### Task A3: `generateWorld` returns the new shape

**Files:**
- Modify: `src/logic/world/worldGen.ts:299-304`
- Test: `src/logic/world/worldGen.test.ts` (update existing shape assertions)

- [ ] **Step 1: Update the `generateWorld` return**

Replace lines 299-304:

```ts
  return {
    cells: state.generatedCells,
    plots: [],
    activePlotCellId: state.generatedCells.find((c) => c.type === 'plot' && c.ring === 0)?.id ?? null,
    inspectedCellId: null,
  };
```

- [ ] **Step 2: Update any `worldGen.test.ts` assertions referencing `activePlotIndex`/`selectedCellId`**

Replace any `expect(world.activePlotIndex).toBe(0)` with `expect(world.activePlotCellId).toBe('0,0')`, and delete `selectedCellId` assertions.

- [ ] **Step 3: Run the world tests**

Run: `pnpm test:run -- src/logic/world/worldGen.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/logic/world/worldGen.ts src/logic/world/worldGen.test.ts
git commit -m "refactor(world): generateWorld emits cell-id selection"
```

### Task A4: Rewire World/Mine/Station views to the new selection API

**Files:**
- Modify: `src/views/WorldView.svelte:13-55`, `src/views/MineView.svelte:34-40`, `src/views/StationView.svelte:33`
- Modify: `src/components/world/WorldGrid.svelte:18` (uses `selectedCellId`)

**Interfaces:**
- Consumes: `worldStore.setActivePlotCellId`, `worldStore.setInspectedCellId`, `worldStore.activePlotCell` (Task A2).

- [ ] **Step 1: WorldView — replace selection wiring**

In `WorldView.svelte`, replace lines 11-55 with:

```ts
  const cells = $derived(worldStore.current.cells);
  const activePlotCell = $derived(worldStore.activePlotCell);
  const inspectedCell = $derived(
    worldStore.current.inspectedCellId
      ? (worldStore.current.cells.find((cell) => cell.id === worldStore.current.inspectedCellId) ?? null)
      : null,
  );
  const inspectedCellId = $derived(inspectedCell?.id ?? null);

  function selectCell(cell: WorldCell) {
    worldStore.setInspectedCellId(cell.id);
  }

  function selectPlot(cell: WorldCell) {
    worldStore.setInspectedCellId(cell.id);
    if (cell.type === 'plot') {
      worldStore.setActivePlotCellId(cell.id);
      debouncedSave();
    }
  }

  function openMine(cell: WorldCell) {
    if (cell.type !== 'plot') return;
    worldStore.setActivePlotCellId(cell.id);
    worldStore.setInspectedCellId(cell.id);
    debouncedSave();
    navigation.setActiveTab('mine');
  }

  function goToMine() {
    if (activePlotCell) navigation.setActiveTab('mine');
  }

  function goToStation() {
    if (activePlotCell) navigation.setActiveTab('station');
  }

  function clearSelection() {
    worldStore.setInspectedCellId(null);
  }
```

Then in the markup, replace the two `{selectedCell ...}`/`selectedCellId` references: pass `selectedCellId={inspectedCellId}` to `<WorldGrid>` (line 66) and rename the local `selectedCell` reads in the details panel (lines 70-104) to `inspectedCell`.

> Inspection is session-only (no `debouncedSave()` in `selectCell`/`clearSelection`) per `CONTEXT.md`. Only activation saves.

- [ ] **Step 2: MineView — read active plot cell**

In `MineView.svelte`, replace lines 34-36:

```ts
  const activePlotCellId = $derived(worldStore.current.activePlotCellId);
  const activeWorldCell = $derived(worldStore.activePlotCell);
```

Delete the `selectedCellId`/`selectedCell` lines and any `activeShaftIndex` derived from `activePlotIndex`; replace `Shaft ${activeShaftIndex + 1}` label logic (line 40) with `activeWorldCell?.name ?? 'Mine'`. (`activeShaftIndex` was a misuse of plot index — there is one shaft list per plot now.)

- [ ] **Step 3: StationView — header name**

In `StationView.svelte:33`, replace:

```ts
  const headerName = $derived(worldStore.activePlotCell?.name ?? 'Station');
```

- [ ] **Step 4: WorldGrid — no logic change, confirm prop**

`WorldGrid.svelte` still receives `selectedCellId` as a prop (now fed by `inspectedCellId`). No change needed beyond confirming the `$effect` at line 18 does not reference `worldStore` selection internals. If it does, route it through the `selectedCellId` prop.

- [ ] **Step 5: Type-check and run the app**

Run: `pnpm check`
Expected: no errors in the four edited components (errors remaining only in Phase-B test files are acceptable if they were `it.skip`ped).

- [ ] **Step 6: Commit**

```bash
git add src/views/WorldView.svelte src/views/MineView.svelte src/views/StationView.svelte src/components/world/WorldGrid.svelte
git commit -m "refactor(views): consume cell-id selection (inspect vs active split)"
```

---

## PHASE B — Plots as a cell-keyed map (single source of truth)

Goal: developed plots live in `Record<WorldCellId, PlotState>`, owned by a new `plotsStore`. Views derive `plotsStore.get(activePlotCellId)` and mutate in place. The old `mineStore` copy and `world.plots[]`/`data.plots[]` arrays are removed. Save persists the map under `world`.

### Task B1: `plotsStore` — the keyed map + in-place mutators

**Files:**
- Create: `src/logic/mine/plotsStore.svelte.ts`
- Test: `src/logic/mine/plotsStore.test.ts`

**Interfaces:**
- Produces:
  - `createPlotsStore(initial?: Record<WorldCellId, PlotState>)`
  - `get current(): Record<WorldCellId, PlotState>`
  - `get(cellId): PlotState | null`
  - `has(cellId): boolean`
  - `set(cellId, plot): void` — insert/replace one entry
  - `replaceAll(next): void`
  - `snapshot(): Record<WorldCellId, PlotState>` — `$state.snapshot`
  - In-place active-plot mutators that take the active `cellId`: `setTile(cellId,row,col,updates)`, `setTileType`, `damageTile`, `addMiner`, `removeMiner`, `updateMiner`, `addMineshaft`, `addMineDepth`, `setActiveMineshaftIndex`, `setActiveDepthIndex`, `addAgeResource`, `spendAgeResource`. (Logic moved verbatim from `mineStore.svelte.ts`, reparented to `plots[cellId]`.)
- Module singleton: `export const plotsStore = createPlotsStore();`

- [ ] **Step 1: Write the failing test**

```ts
// src/logic/mine/plotsStore.test.ts
import { describe, it, expect } from 'vitest';
import { createPlotsStore } from './plotsStore.svelte';
import { createScaffoldPlot } from './mineTypes';

describe('plotsStore', () => {
  it('stores and reads a plot by cell id', () => {
    const store = createPlotsStore();
    store.set('0,0', createScaffoldPlot('0,0'));
    expect(store.has('0,0')).toBe(true);
    expect(store.get('0,0')?.plotId).toBe('0,0');
    expect(store.get('1,1')).toBeNull();
  });

  it('mutates the active plot in place (no copy-back needed)', () => {
    const store = createPlotsStore({ '0,0': createScaffoldPlot('0,0') });
    store.addMineshaft('0,0');
    store.addMineDepth('0,0', 0);
    const ok = store.addMiner('0,0');
    expect(ok).toBe(true);
    expect(store.get('0,0')?.mineshafts[0].mineDepths[0].miners.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run -- src/logic/mine/plotsStore.test.ts`
Expected: FAIL — `createPlotsStore` / `createScaffoldPlot` not defined. (Task B2 adds `createScaffoldPlot`; if running B1 first, stub it in `mineTypes.ts` then flesh out in B2.)

- [ ] **Step 3: Implement `plotsStore`**

Create `src/logic/mine/plotsStore.svelte.ts`. Move the clone helpers and active-plot mutators from `mineStore.svelte.ts` (lines 64-330), but key every operation on `plots[cellId]` instead of a single `state`. Skeleton (mutators follow the exact bodies from `mineStore`, with `const plot = state[cellId]; if (!plot) return false;` guards):

```ts
// src/logic/mine/plotsStore.svelte.ts
import type { WorldCellId } from '../world/worldTypes';
import type { MineTile, MineTileType, Miner, PlotState, ResourceType } from './mineTypes';
import { clonePlotState } from './mineTypes';

export function createPlotsStore(initial?: Record<WorldCellId, PlotState>) {
  const state = $state<Record<WorldCellId, PlotState>>(
    Object.fromEntries(Object.entries(initial ?? {}).map(([id, p]) => [id, clonePlotState(p)])),
  );

  function activeDepth(cellId: WorldCellId) {
    const plot = state[cellId];
    if (!plot) return null;
    const shaft = plot.mineshafts[plot.activeMineshaftIndex];
    return shaft?.mineDepths[shaft.activeDepthIndex] ?? null;
  }

  return {
    get current() { return state; },
    get(cellId: WorldCellId): PlotState | null { return state[cellId] ?? null; },
    has(cellId: WorldCellId): boolean { return cellId in state; },
    set(cellId: WorldCellId, plot: PlotState) { state[cellId] = clonePlotState(plot); },
    replaceAll(next: Record<WorldCellId, PlotState>) {
      for (const key of Object.keys(state)) delete state[key];
      for (const [id, p] of Object.entries(next)) state[id] = clonePlotState(p);
    },
    snapshot() { return $state.snapshot(state) as Record<WorldCellId, PlotState>; },

    addMineshaft(cellId: WorldCellId) { /* port mineStore.addNorthExpansion, push to plot.mineshafts */ },
    addMineDepth(cellId: WorldCellId, depth: number, rows = 5, cols = 5) { /* port mineStore.addMineDepth */ },
    setActiveMineshaftIndex(cellId: WorldCellId, index: number) { /* port setActiveNorthExpansionIndex */ },
    setActiveDepthIndex(cellId: WorldCellId, index: number) { /* port setActiveDepthIndex */ },
    addMiner(cellId: WorldCellId, miner?: Partial<Miner>): boolean { /* port, via activeDepth(cellId) */ return false; },
    removeMiner(cellId: WorldCellId, index: number): boolean { return false; },
    updateMiner(cellId: WorldCellId, index: number, updates: Partial<Miner>): boolean { return false; },
    setTile(cellId: WorldCellId, row: number, col: number, updates: Partial<MineTile>): boolean { return false; },
    setTileType(cellId: WorldCellId, row: number, col: number, type: MineTileType): boolean { return false; },
    damageTile(cellId: WorldCellId, row: number, col: number, amount: number): boolean { return false; },
    addAgeResource(cellId: WorldCellId, resourceType: Exclude<ResourceType, 'none' | 'money'>, amount = 1) {},
    spendAgeResource(cellId: WorldCellId, resourceType: Exclude<ResourceType, 'none' | 'money'>, amount = 1) {},
  };
}

export const plotsStore = createPlotsStore();
```

Fill each stubbed body by copying the corresponding `mineStore` method verbatim, replacing `activeMineDepth`→`activeDepth(cellId)` and `state.*`→`state[cellId].*`. Move `clonePlotState`/`cloneMineshaft`/`cloneMineDepthState` into `mineTypes.ts` as exports (Task B2) so both stores can import them.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run -- src/logic/mine/plotsStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/logic/mine/plotsStore.svelte.ts src/logic/mine/plotsStore.test.ts
git commit -m "feat(mine): add plotsStore (cell-keyed map, in-place mutation)"
```

### Task B2: `mineTypes` — `createScaffoldPlot`, clone exports, `mineshafts` field

**Files:**
- Modify: `src/logic/mine/mineTypes.ts`
- Test: `src/logic/mine/mineTypes.test.ts` (extend)

**Interfaces:**
- Produces: `createScaffoldPlot(cellId): PlotState`, `clonePlotState(plot): PlotState`, and renames `NorthExpansion`→`Mineshaft`, `PlotState.northExpansions`→`mineshafts`, `activeNorthExpansionIndex`→`activeMineshaftIndex`.
- `createScaffoldPlot` returns a Tile-less plot: one Mineshaft with `mineDepths: []`, station `null`, ageResources zeroed, `plotId === cellId`.

> The `Mineshaft` rename touches `mineStore`, `mineActions`, `mineTick`, views, and tests. Doing the rename here (Phase B) rather than Phase D avoids churning `plotsStore` twice. Phase D then only handles `plotId` removal + docs.

- [ ] **Step 1: Write the failing test**

```ts
// src/logic/mine/mineTypes.test.ts  (add)
import { createScaffoldPlot, isPlotBuilt } from './mineTypes';

describe('createScaffoldPlot', () => {
  it('is Tile-less and not built', () => {
    const plot = createScaffoldPlot('2,1');
    expect(plot.plotId).toBe('2,1');
    expect(plot.mineshafts).toHaveLength(1);
    expect(plot.mineshafts[0].mineDepths).toHaveLength(0);
    expect(plot.station).toBeNull();
    expect(isPlotBuilt(plot)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run -- src/logic/mine/mineTypes.test.ts`
Expected: FAIL — `createScaffoldPlot`/`isPlotBuilt` not exported.

- [ ] **Step 3: Rename + add factories in `mineTypes.ts`**

Rename `NorthExpansion`→`Mineshaft`, `northExpansions`→`mineshafts`, `activeNorthExpansionIndex`→`activeMineshaftIndex`, `activeDepthIndex` stays. Add:

```ts
export function createScaffoldPlot(cellId: PlotId): PlotState {
  return {
    plotId: cellId,
    currentAge: 'Mechanical',
    ageResources: createEmptyAgeResources(),
    mineshafts: [{ mineDepths: [], selectedMiner: null, draggedMiner: null, lastTick: 0, activeMineshaftIndex: 0, activeDepthIndex: 0 } as unknown as Mineshaft],
    activeMineshaftIndex: 0,
    station: null,
  };
}

export function isPlotBuilt(plot: PlotState): boolean {
  const surface = plot.mineshafts[0]?.mineDepths.find((d) => d.depth === 0);
  return !!surface && surface.tiles.length > 0;
}

export function clonePlotState(plot: PlotState): PlotState { /* moved from mineStore */ }
```

> Fix the `Mineshaft` literal in `createScaffoldPlot` to the real field set (no `activeMineshaftIndex` inside a shaft — that lived on the shaft as `activeDepthIndex`). Final shaft shape: `{ mineDepths: [], selectedMiner: null, draggedMiner: null, lastTick: 0, activeDepthIndex: 0 }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run -- src/logic/mine/mineTypes.test.ts`
Expected: PASS.

- [ ] **Step 5: Propagate the `Mineshaft` rename across the codebase**

Run: `pnpm check` and fix every `northExpansion`/`activeNorthExpansionIndex` reference in `mineStore.svelte.ts`, `mineActions.ts`, `mineTick.ts`, `MineView.svelte`, and tests. (Mechanical rename.)

- [ ] **Step 6: Commit**

```bash
git add src/logic/mine/
git commit -m "refactor(mine): rename northExpansion->mineshaft; add scaffold + isPlotBuilt"
```

### Task B3: Save schema — `world.plots` map, drop root `plots[]`

**Files:**
- Modify: `src/logic/save/saveTypes.ts`, `src/logic/world/worldTypes.ts` (add `plots` map to `WorldState`, remove `WorldPlot`)
- Test: covered by Task B4's round-trip test.

**Interfaces:**
- Produces: `WorldState.plots: Record<WorldCellId, PlotState>` (replaces `WorldPlot[]`); `GameState` no longer has top-level `plots`.

- [ ] **Step 1: Update `WorldState.plots` type and delete `WorldPlot`**

In `worldTypes.ts`: change `plots: WorldPlot[]` → `plots: Record<WorldCellId, PlotState>`; delete the `WorldPlot` interface, `getPlotById`, and the deprecated `getActivePlot` shim. Import `PlotState` type from `../mine/mineTypes` (type-only import — allowed; ownership stays in mine).

- [ ] **Step 2: Update `saveTypes.ts`**

```ts
import type { GameSessionState } from '../app/gameState.svelte';
import type { NavigationState } from '../app/navigationTypes';
import type { EngineeringState } from '../engineering/engineeringTypes';
import type { WorldState } from '../world/worldTypes';

export interface GameState extends GameSessionState {
  world: WorldState; // world.plots holds the developed-plot map
  engineering: EngineeringState;
}
// PersistedGameState, SaveMetadata, SaveFile unchanged except GameState no longer has top-level plots.
```

- [ ] **Step 3: Type-check**

Run: `pnpm check`
Expected: errors only in `save.svelte.ts`, `stateFactory.ts`, and tests touched by Tasks B4–B5 (fixed there).

- [ ] **Step 4: Commit**

```bash
git add src/logic/world/worldTypes.ts src/logic/save/saveTypes.ts
git commit -m "refactor(save): plots become world.plots map; drop WorldPlot + root plots[]"
```

### Task B4: `stateFactory` + `save.svelte` snapshot/apply the map

**Files:**
- Modify: `src/logic/stateFactory.ts`, `src/logic/save/save.svelte.ts`
- Test: `src/logic/save/save.svelte.test.ts` (replace plot-array assertions)

**Interfaces:**
- Consumes: `plotsStore.snapshot/replaceAll` (B1), `worldStore` selection (A2), `buildPlot` (C1 — but home plot can be seeded Built directly here).

- [ ] **Step 1: Write the failing round-trip test**

```ts
// src/logic/save/save.svelte.test.ts  (replace the plots[] cases)
it('round-trips the plots map and active selection', () => {
  // load defaults, mutate the home plot, save, reload, assert the mutation + activePlotCellId survive
  // (use the existing harness; assert plotsStore.get('0,0') tile change persists and worldStore.current.activePlotCellId === '0,0')
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test:run -- src/logic/save/save.svelte.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update `stateFactory.ts`**

```ts
export function getInitialState(): GameState {
  const worldSeed = '123456';
  const resetCount = 0;
  const world = generateWorld(worldSeed, resetCount, 1);
  const homeCellId = world.activePlotCellId ?? '0,0';
  world.plots = { [homeCellId]: buildPlot(homeCellId, worldSeed, resetCount) };
  return {
    money: 75,
    world,
    engineering: { engineeringIdeas: 0, resetCount: 0, maxMineshafts: 1, maxUndergroundLevels: 0 },
    settings: { ...createDefaultSettingsState(), worldSeed },
  };
}
```

(`buildPlot` from Task C1 returns a Built home plot — surface depth with tiles + station foundation. Rename `maxNorthExpansions`→`maxMineshafts` in `engineeringTypes.ts` as part of the Phase-B rename.)

- [ ] **Step 4: Update `save.svelte.ts`** — replace `getPersistedSnapshot`, `applyDefaultState`, `applyLoadedState`:

```ts
function getPersistedSnapshot(): PersistedGameState {
  const defaults = getInitialState();
  const world = $state.snapshot(worldStore.current);
  world.plots = plotsStore.snapshot();
  return {
    ...defaults,
    money: gameState.current.money,
    settings: $state.snapshot(gameState.current.settings),
    world,
    engineering: $state.snapshot(defaults.engineering),
    navigation: $state.snapshot(navigation.current),
  };
}

function applyDefaultState(): void {
  const defaults = getInitialState();
  gameState.setMoney(defaults.money);
  gameState.updateSettings(defaults.settings);
  worldStore.replace(defaults.world);
  plotsStore.replaceAll(defaults.world.plots);
  navigation.replace(createDefaultNavigationState());
}

function applyLoadedState(snapshot: PersistedGameState): void {
  gameState.setMoney(snapshot.money);
  gameState.updateSettings(snapshot.settings);
  worldStore.replace(snapshot.world);
  plotsStore.replaceAll(snapshot.world.plots ?? {});
  // Load guard: active plot must be a discovered, built plot cell, else fall back to home.
  const world = snapshot.world;
  const active = world.activePlotCellId;
  const cell = active ? world.cells.find((c) => c.id === active) : null;
  const plot = active ? snapshot.world.plots?.[active] : null;
  const valid = !!cell && cell.type === 'plot' && cell.discovered && !!plot && isPlotBuilt(plot);
  if (!valid) {
    const home = world.cells.find((c) => c.type === 'plot' && c.ring === 0)?.id ?? null;
    worldStore.setActivePlotCellId(home);
  }
  navigation.replace(snapshot.navigation);
}
```

Update `persistSnapshot` to drop the `plots` field from `GameState` (it now rides inside `world`). Remove `getPlotIdForCell`.

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm test:run -- src/logic/save/save.svelte.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/logic/stateFactory.ts src/logic/save/save.svelte.ts src/logic/save/save.svelte.test.ts src/logic/engineering/engineeringTypes.ts
git commit -m "refactor(save): snapshot/apply world.plots map + active-plot load guard"
```

### Task B5: Retire `mineStore`; point views at `plotsStore` + active cell id

**Files:**
- Modify: `src/views/MineView.svelte`, `src/views/StationView.svelte`, `src/logic/mine/mineActions.ts`, `src/logic/station/stationActions.ts` (signatures already take state; pass `plotsStore.get(activeCellId)`)
- Delete: `src/logic/mine/mineStore.svelte.ts` (+ its test) once no importers remain
- Test: rewrite `src/logic/integration/sync.test.ts` to the map model; restore A2's `it.skip`ped cases.

**Interfaces:**
- Consumes: `plotsStore` (B1), `worldStore.current.activePlotCellId` (A2), `isPlotBuilt` (B2).

- [ ] **Step 1: MineView — derive the active plot from the map**

```ts
  const activePlotCellId = $derived(worldStore.current.activePlotCellId);
  const activePlotState = $derived(activePlotCellId ? plotsStore.get(activePlotCellId) : null);
  const activeMineshaft = $derived(activePlotState?.mineshafts[activePlotState.activeMineshaftIndex] ?? null);
  const activeMine = $derived(activeMineshaft?.mineDepths[activeMineshaft.activeDepthIndex] ?? null);
```

Replace every `mineStore.setTile(...)` → `plotsStore.setTile(activePlotCellId!, ...)`, etc. Guard the view: if `!activePlotState || !isPlotBuilt(activePlotState)` render a "not built yet" panel instead of the grid.

- [ ] **Step 2: StationView — same reparenting**

Point `StationView` at `plotsStore.get(activePlotCellId)?.station`; commit station mutations back via `plotsStore.set(activePlotCellId, updatedPlot)` or in-place mutator.

- [ ] **Step 3: Delete `mineStore` and rewrite `sync.test.ts`**

Remove `mineStore.svelte.ts` + `mineStore` imports. Rewrite `sync.test.ts` to assert: activating a discovered plot cell creates a scaffold entry, building it makes `isPlotBuilt` true, and switching `activePlotCellId` swaps which plot the view reads without copy-back.

- [ ] **Step 4: Full check + targeted tests**

Run: `pnpm check && pnpm test:run -- src/logic/integration/sync.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(mine): retire mineStore; views read plotsStore by active cell id"
```

---

## PHASE C — Lifecycle (lazy scaffold → built)

Goal: discovering a plot creates a Tile-less scaffold; an explicit build action fills it; tabs gate on `isPlotBuilt`.

### Task C1: `buildPlot` — fill a scaffold's surface depth

**Files:**
- Modify: `src/logic/mine/mineGen.ts` (add `buildPlot`)
- Test: `src/logic/mine/mineGen.test.ts` (add)

**Interfaces:**
- Produces: `buildPlot(cellId: string, seed: string, resetCount: number): PlotState` — a Built plot (surface `MineDepth` with tiles via existing `generatePlot`, station foundation null→created by station flow, `isPlotBuilt === true`).

- [ ] **Step 1: Write the failing test**

```ts
// src/logic/mine/mineGen.test.ts (add)
import { buildPlot } from './mineGen';
import { isPlotBuilt } from './mineTypes';

it('buildPlot yields a Built plot with a tiled surface depth', () => {
  const plot = buildPlot('0,0', '123456', 0);
  expect(isPlotBuilt(plot)).toBe(true);
  expect(plot.mineshafts[0].mineDepths[0].depth).toBe(0);
  expect(plot.mineshafts[0].mineDepths[0].tiles.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test:run -- src/logic/mine/mineGen.test.ts`
Expected: FAIL — `buildPlot` not exported.

- [ ] **Step 3: Implement `buildPlot`** using the existing `generatePlot(seed, resetCount, mineshaftIndex, depth)`:

```ts
export function buildPlot(cellId: string, seed: string, resetCount: number): PlotState {
  const surface = generatePlot(seed, resetCount, 0, 0);
  return {
    plotId: cellId,
    currentAge: 'Mechanical',
    ageResources: createEmptyAgeResources(),
    mineshafts: [{ mineDepths: [surface], selectedMiner: null, draggedMiner: null, lastTick: 0, activeDepthIndex: 0 }],
    activeMineshaftIndex: 0,
    station: null,
  };
}
```

- [ ] **Step 4: Run to verify it passes** → `pnpm test:run -- src/logic/mine/mineGen.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/logic/mine/mineGen.ts src/logic/mine/mineGen.test.ts
git commit -m "feat(mine): buildPlot fills scaffold surface depth (Built)"
```

### Task C2: Discovery creates a scaffold; build action fills it

**Files:**
- Modify: `src/logic/mine/mineActions.ts` (add `ensurePlotScaffold`, `tryBuildPlot`), `src/views/WorldView.svelte` (wire build button)
- Test: `src/logic/mine/mineActions.test.ts` (create)

**Interfaces:**
- Consumes: `plotsStore.has/set/get` (B1), `createScaffoldPlot`/`isPlotBuilt` (B2), `buildPlot` (C1).
- Produces: `ensurePlotScaffold(cellId)` (idempotent insert of scaffold), `tryBuildPlot(cellId, seed, resetCount, money): { ok, nextMoney }` (checks ledger threshold, replaces scaffold with `buildPlot`).

- [ ] **Step 1: Write the failing tests** (scaffold idempotency + build gating). Assert `ensurePlotScaffold` twice yields one entry; `tryBuildPlot` flips `isPlotBuilt` to true and deducts cost.

- [ ] **Step 2: Run to verify they fail.**

- [ ] **Step 3: Implement both functions** in `mineActions.ts`, operating on `plotsStore`. Threshold rule (copy verbatim into the plan when the economy constant is chosen): require `plot.ageResources.coal >= BUILD_COAL_COST` and `money >= BUILD_MONEY_COST`; on success `plotsStore.set(cellId, buildPlot(cellId, seed, resetCount))` and return `nextMoney = money - BUILD_MONEY_COST`.

- [ ] **Step 4: Wire WorldView** — when an inspected plot cell is discovered but `!isPlotBuilt`, show "Ship resources / Build" affordances calling `ensurePlotScaffold`/`tryBuildPlot`; only Built plots enable "Go to mine".

- [ ] **Step 5: Run tests** → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/logic/mine/mineActions.ts src/logic/mine/mineActions.test.ts src/views/WorldView.svelte
git commit -m "feat(mine): lazy scaffold on discovery + build action"
```

---

## PHASE D — Fallout (do last)

### Task D1: Drop `plotId`; key purely by cell id

- [ ] Remove `PlotState.plotId` and `PlotId` type; update `plotsStore`/`createScaffoldPlot`/`buildPlot` to stop setting it. Fix references. `pnpm check` clean. Commit `refactor(mine): drop plotId; plots keyed solely by cell id`.

### Task D2: Remove dead code

- [ ] Delete the unused `stationStore` singleton (ARCHITECTURE.md §4 notes it is dead). Delete `mineLabels`/`mineStore` leftovers if unreferenced. `pnpm check`. Commit.

### Task D3: Splash-timer startup fix

- [ ] In `App.svelte:98-104`, reduce the hard-coded 2500 ms splash `setTimeout` to fire `isReadyToSave`/`setSplashVisible(false)` as soon as `loadGame()` completes (e.g. `requestAnimationFrame` after mount) instead of a fixed delay. Verify the app shows content immediately. Commit `perf(app): clear splash on load-complete, not fixed 2.5s timer`.

### Task D4: Docs

- [ ] Rewrite `docs/DESIGN.md` line 18 + "Active City": `Plot → mineshafts → mineDepths`; City/Factory are destination siblings of Plot, not parents. Update `docs/ARCHITECTURE.md` §4 (`world.activePlotIndex → world.activePlotCellId`; `PlotState.station`). Update `CLAUDE.md` "Mine state hierarchy" + "World state" sections to the map model. Commit `docs: align DESIGN/ARCHITECTURE/CLAUDE with plots-map model`.

### Task D5: Close RFC #12

- [ ] Comment on GitHub issue #12 summarising the outcome (model refactor shipped; Web Worker dropped as non-bottleneck; splash-timer was the real lag) and link ADR `docs/adr/0001-plots-as-cell-keyed-map.md`. Close the issue.

---

## Self-Review notes

- **Spec coverage:** ADR decisions map to tasks — cell-keyed map (B1/B3), in-place mutation (B1/B5), identity=cellId (D1), lifecycle+derived built (B2/C1/C2), load guard (B4), save folds under world (B3/B4), rejected `mineStore` copy (B5), fallout incl. DESIGN rewrite + splash fix (D). 
- **Open economy constants:** `BUILD_COAL_COST` / `BUILD_MONEY_COST` (Task C2) are gameplay-tuning numbers, not yet specified — pick provisional values during C2 and note them; they do not affect the architecture.
- **Ordering risk:** the `northExpansion → mineshaft` rename is pulled into Phase B (Task B2) deliberately, so `plotsStore` is written once against final names. Phase D handles only `plotId` removal + docs.
