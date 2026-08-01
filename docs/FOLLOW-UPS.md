# Follow-ups

Live deferred work for this repo. Items are deleted as they land — git history holds what was here
before. Bugs with a clear owner or a save-format impact go to GitHub Issues instead; this file is
for things that would otherwise be forgotten.

## Live bugs

- **"Go to mine" / "Go to station" do nothing for an inspected-but-not-active plot.**
  `WorldView.svelte:153-154` enable both buttons when the *inspected* plot is built, but the
  handlers (`goToMine`/`goToStation`, `:45`/`:49`) guard on `activePlotCell` — so clicking is a
  no-op unless that plot is already the active one. Fix: call
  `worldStore.setActivePlotCellId(inspectedCell.id)` before switching tabs. _(verified 2026-07-27)_

- **Icon assets dominate the service-worker precache.** The SW precaches ~1842 KiB, of which
  `favicon.ico` (361 KiB), `favicon.svg` (243 KiB) and `pwa-512x512.png` (233 KiB) account for
  883 KiB — nearly as much as the entire JS bundle (921 KiB). The `.ico` is almost certainly
  carrying oversized frames, and a 243 KiB `.svg` suggests embedded raster data; the splash
  renders it at 120×120. Re-encoding these three is a far bigger win than anything available in
  the JS build, where `chunkSizeWarningLimit` was deliberately raised instead of code-splitting.
  Note the plugin's `precache N entries (KiB)` build line understates the total — it excludes
  `includeAssets`; sum the `sw.js` manifest for the real figure. _(measured 2026-07-31)_

- **Building a plot silently destroys everything railed into it.** `tryBuildPlot`
  (`mineActions.ts:285`) gates on `coal >= BUILD_COAL_COST && money >= BUILD_MONEY_COST`, then calls
  `plotsStore.set(cellId, buildPlot(...))` — and `buildPlot` returns a *fresh* plot with
  `ageResources: createEmptyAgeResources()` and `station: null`. Three consequences:
  - **Only coal is ever checked.** Oil, copper and superalloy delivered to the plot are ignored.
  - **The coal is never spent.** Money is deducted; the coal requirement is a threshold, not a cost.
  - **The whole pool is wiped, not spent**, along with any station scaffold. Railing in 500 coal and
    railing in exactly 10 produce identical results; the surplus evaporates.

  `CONTEXT.md` describes the intent as "the player has **spent** the accumulated resources (and
  money)", so the code and the domain model disagree. The minimal fix is to deduct the cost and
  carry the remaining `ageResources` (and the scaffold's station) through the build rather than
  replacing the plot wholesale. Costs are marked `PROVISIONAL` in-code, so the numbers are open too.
  _(verified 2026-08-01)_

- **`Super_Alloy.webp` is a photoreal outlier.** Every other resource and train asset is pixel art
  (1px `#151116` outline, four-tone ramp, speckled highlights) — this one is from a different pass
  and reads as foreign next to the new train sprites. It should be redrawn to match. Flagged by the
  Station design handoff, which deliberately scoped it out. _(noted 2026-07-31)_

## Planned work

- **Nothing states what an under-construction plot needs, or what has arrived.** Delivery itself
  works: `trainTick.ts` `case 'plot'` deposits `trip.cargo` into the target's `ageResources`,
  creating a scaffold if the cell was never visited, and pays nothing. But no surface — World cell
  card, Station route card, or platform view — shows a requirement or a running total, so the player
  is railing cargo at an invisible target. Worth designing alongside the `tryBuildPlot` fix above,
  since a "needed vs delivered" readout is meaningless while the pool is wiped on build. Wants a
  per-age requirement (probably scaling with ring distance) rather than today's single coal
  threshold. _(noted 2026-08-01)_

- **Redesign the Station and trainyard view.** `DESIGN-SYSTEM.md` currently declares Station
  explicitly out of scope for the design pass; that needs revisiting as part of this.

- **Write ADR-0002** for the decisions made during age advancement, whose rationale currently lives
  only in commit messages:
  - The plot's age owns the dig ceiling (`getMaxDepthForAge`), and `EngineeringState.maxUndergroundLevels`
    deliberately stays unused rather than being combined with it.
  - The ceiling is never a prerequisite — `ageResources` pools across mineshafts, so a second shaft
    funds an age without digging deeper.
  - Actions own their own money spend via `gameState.spendMoney` (the commit point; every check that
    can fail runs before it), instead of returning `nextMoney` for the caller to apply. Returning it
    is what made shaft buying a money sink.
  - Gated buttons render disabled with a visible reason, never hidden behind `{#if}`. Hiding the
    buy-shaft button made a real bug undiagnosable from the UI.

## Code health (`pnpm fallow`)

`includeEntryExports` is now on, so dead-export detection actually works — before, the Svelte/vitest
plugins marked ~85 files as entry points and nothing could ever be reported unreachable. That was
hiding a fully dead `src/logic/shared/` folder.

- **42 unused exports + 5 unused types** are now visible and untriaged. Both rules are set to `warn`
  so they don't gate CI. Some are genuinely dead (`worldPathing.ts`'s `getTileCost`,
  `isTilePassableByCell`, `getExplorationTime`; `appTypes.ts`'s `AppContext`, `PWAInstallState`),
  others may be intentional API surface. `fallow fix --dry-run` lists them; triage before deleting.
- **`pnpm fallow` still exits 1** on `health` (29 complexity findings). The two named refactoring
  targets are `WorldView.svelte` (cognitive 53, 313 LOC, medium effort) and `StationView.svelte`
  (cognitive 149, 869 LOC) — the latter should wait for the Station redesign above rather than be
  refactored twice.
- `svelte` is reported as a dev dependency used in production. For a bundled Vite app this is
  cosmetic — dependencies vs devDependencies doesn't change the output. Ignore or suppress.

## Balance / provisional

- Build economy constants are provisional: `BUILD_COAL_COST = 10`, `BUILD_MONEY_COST = 100`
  (`mineActions.ts`). Tune.
- Age advance costs (`AGE_ADVANCE_COST`) and the engine upgrade curve
  (`ENGINE_UPGRADE_COST_MULTIPLIER`, `MAX_ENGINE_LEVEL`) are first-pass. Both carry `ponytail:`
  comments naming the ceiling and what to change.

## Minor test / polish nits (low priority)

- Double `plotsStore.get` in a `WorldView` `$derived`.
- Round-trip save test is needlessly `async`.
- `tryBuildPlot` already-built test doesn't assert `nextMoney` is unchanged.
- `MineView` renders blank if a plot is built but has empty mineshafts — add an `{:else}` fallback.
- A couple of missing null/miss-path coverage cases.

## Tracked in GitHub Issues

- **#22** — flaky `mineGen` test ("only uses valid fillable tile types above the bottom row") failed
  once and would not reproduce, despite fixed seeds.
