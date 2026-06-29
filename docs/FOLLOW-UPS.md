# Follow-ups

Deferred items from the plots-as-cell-keyed-map refactor (branch `refactor/fresh-start`).
See `docs/adr/0001-plots-as-cell-keyed-map.md` and `docs/superpowers/plans/2026-06-29-plots-as-cell-keyed-map.md`.

## Pre-existing breakage (out of refactor scope)

- **`worldPathing.ts` / `worldPathing.test.ts` — stale world model.** These are the 6 remaining
  `pnpm check` errors. `worldPathing.ts` still compares cell types against the removed `'fog'`
  literal (fog is no longer a stored type — cells are `discovered`/undiscovered). The test file
  also builds `plots: [{ plotId, cellId, plotName, discovered }]` — the old `WorldPlot[]` array
  shape, which no longer exists (`world.plots` is now `Record<cellId, PlotState>`). Needs a
  rewrite to the post-refactor world model. Predates this refactor; never in the plan.

## Latent bug — fix when the feature lands

- **Engineering state is not round-tripped through save.** `getPersistedSnapshot` snapshots
  `defaults.engineering` instead of live `engineeringStore.current`, and `applyLoadedState` /
  `applyDefaultState` never restore/reset `engineeringStore`. Currently harmless because nothing
  in the app mutates engineering state (the Engineering tab is a placeholder; the store's
  mutators are defined but never called). **When the Engineering feature becomes player-mutable,
  wire it in:** import `engineeringStore` in `save.svelte.ts`; `engineering:
  $state.snapshot(engineeringStore.current)`; `engineeringStore.replace(snapshot.engineering)` on
  load; `engineeringStore.reset()` on default — plus a round-trip test. (Also revisit prestige/
  "Nuke" reset so EI survives a plot reset.)

## UX / behavior gaps (train system incomplete)

- **"Go to mine" / "Go to station" no-op for a built-but-not-active inspected plot.** In
  `WorldView`, those buttons are enabled when the *inspected* plot is built, but the handlers
  guard on `activePlotCell`, so clicking does nothing unless that plot is already active. Fix:
  on click, `worldStore.setActivePlotCellId(inspectedCell.id)` before navigating.
- **Scaffold-on-discovery isn't wired to a real train-arrival event** (train/route system
  incomplete); `ensurePlotScaffold` is invoked on the "Build plot" click for now.
- **No resource flow accumulates coal into unbuilt plots' `ageResources`** yet, so the build
  gate (`BUILD_COAL_COST`) can't be satisfied through normal play. Revisit when resource rail is live.
- **Build economy constants are provisional:** `BUILD_COAL_COST = 10`, `BUILD_MONEY_COST = 100`
  (named constants in `mineActions.ts`) — tune.

## Naming consistency (mineshaft rename leftovers)

- Station-internal `northExpansionIndex` was intentionally left un-renamed: `Platform.northExpansionIndex`,
  `getPlatformsForNorthExpansion`, `EligiblePosition.northExpansionIndex` (`stationTypes.ts`,
  `stationActions.ts`, `stationStore` was deleted), and the `northExpansionIndex` parameter of
  `generatePlot`/`getExpansionLabel`. Rename to `mineshaft*` for consistency with the domain model.
- Engineering field `maxNorthExpansions` (and `unlock/canUnlockNorthExpansion`) likewise not
  renamed — rename to `maxMineshafts` when convenient.
- Stale comment in `stationActions.ts:10` still references the now-deleted `stationStore` singleton.

## Minor test/polish nits (low priority)

- A few derived/test polish items flagged during review: double `plotsStore.get` in a WorldView
  `$derived`; round-trip save test needlessly `async`; `tryBuildPlot` already-built test doesn't
  assert `nextMoney` unchanged; `MineView` renders blank if a plot is built but has empty
  mineshafts (add an `{:else}` fallback); a couple of missing null/miss-path coverage cases.
