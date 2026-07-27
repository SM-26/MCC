# Logic Layer — World/Mine Connection Notes

Narrow companion to the general docs. It covers only the things that are easy to break when
refactoring across the world/mine boundary, and that aren't written down elsewhere.

For layout, conventions and commands see `/CLAUDE.md`; for feature ownership see
`docs/ARCHITECTURE.md`; for vocabulary see `/CONTEXT.md`. Don't restate those here.

---

## Seed composition

Both generators are seeded, and the **shape of the seed string is the contract** — change it and
every existing world or mine regenerates differently.

```ts
// World: makeSeededRng (worldGen.ts)
seedrandom(`${worldSeed}-${resetCount}`);

// Mine: one RNG per depth per shaft (mineGen.ts)
seedrandom(`${worldSeed}-${resetCount}-${depth}-${northExpansionIndex}`);
```

The mine seed includes depth and shaft index, which is why a newly bought shaft must be generated
through `generatePlot(seed, resetCount, 0, shaftIndex)` rather than a blank default depth —
otherwise shaft N stops being reproducible from the seed.

`worldSeed` lives in `SettingsState`; `resetCount` in `EngineeringState`.

---

## Connection points

The three places world and mine actually meet. Check these after any cross-boundary refactor.

### 1. Initial state — `stateFactory.ts`

```ts
const world = generateWorld(worldSeed, resetCount, 1);
const homeCellId = world.activePlotCellId ?? '0,0';
world.plots = { [homeCellId]: buildPlot(homeCellId, worldSeed, resetCount) };
```

The starting plot is keyed by its **cell id** — there is no separate plot id. `buildPlot` produces
a fully built plot; `createScaffoldPlot()` (no arguments) produces the tile-less scaffold used for
plots that have been discovered but not built.

### 2. Selection — `worldStore.svelte.ts`

```ts
setActivePlotCellId(cellId: WorldCellId | null) {
  state.activePlotCellId = cellId;
}
```

**It validates nothing.** It does not check that the cell exists, is a plot, or is built. The only
built-plot guard in the codebase runs at load time in `applyLoadedState` (`save.svelte.ts`), which
falls back to the home cell when the persisted active plot isn't a discovered, built plot cell.

Callers are responsible for passing something sensible. `plotsStore.get(activePlotCellId)` is what
Mine and Station then read and mutate in place.

### 3. Persistence — `save.svelte.ts`

`world.plots` (the `Record<cellId, PlotState>` map) is saved as part of `world` — there is no
separate plots array.

**Every store must appear in all three of these**, or it silently never loads:
`getPersistedSnapshot()`, `applyLoadedState()`, `applyDefaultState()`. Nothing type-checks it.
`engineeringStore` was written from `stateFactory` defaults and never read back for weeks, so
`maxNorthExpansions` sat at its module default and the feature gated on it looked broken rather
than unsaved. A save/load round-trip test is the only guard.

---

## Cross-boundary ownership

Age is a **plot** concept, so `mine/ageProgression.ts` owns the age ladder (`AGE_ORDER`,
`AGE_RESOURCE`, `isAgeAtLeast`, `AGE_ADVANCE_COST`, `getMaxDepthForAge`, `advanceAge`) and
`station/` imports from it — not the reverse.

The plot's age caps dig depth (`getMaxDepthForAge`), and that cap is a **ceiling, never a
prerequisite**: `ageResources` pools across all of a plot's mineshafts, so a second shaft can fund
an age without digging deeper. Never gate advancing on a depth.

`station/trainTick.ts` reaches back into mine state on trip completion: delivering to a `plot`
destination scaffolds it if absent and deposits the cargo into its `ageResources`. Station logic
cannot import stores, so it takes the plots map as an argument.

---

## Synchronization checklist

After a refactor that touches the boundary:

- [ ] Every entry in `world.plots` is keyed by its cell id (`"q,r"`) — no separate plotId
- [ ] `activePlotCellId` points at a built plot cell (nothing enforces this at write time)
- [ ] `inspectedCellId` is world-view only and stays out of the save
- [ ] Mine grid is 5×5 at shaft 0 (`BASE_ROWS`/`BASE_COLS`; rows grow with shaft index)
- [ ] Blockers appear only at depth ≥ 2 (`BLOCKERS_START_DEPTH`)
- [ ] Same seed still produces identical world and mine layouts
- [ ] Any new store is wired into all three save paths

Fast regression check:

```bash
pnpm test:run -- src/logic/integration/sync.test.ts
```

---

## Documentation resources

- [`/CLAUDE.md`](../../CLAUDE.md) — conventions, commands, and the rules that bite
- [`/CONTEXT.md`](../../CONTEXT.md) — domain glossary
- [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) — project structure and feature ownership
- [`docs/worldGen.md`](../../docs/worldGen.md) — world generator design
- [`docs/adr/`](../../docs/adr/) — architectural decision records
- [`docs/FOLLOW-UPS.md`](../../docs/FOLLOW-UPS.md) — live deferred work
