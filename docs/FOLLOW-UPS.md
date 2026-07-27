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

- **Splash "Install App" button is dead on non-Chromium browsers.** `Splash.svelte:132` gates the
  button on `!('deviceMemory' in navigator)`. `deviceMemory` is a Chromium-only API with nothing to
  do with installability, so Firefox and Safari users get a permanently disabled button. The PWA
  wiring itself (`beforeinstallprompt` → `pwaInstallStore`) is correct. _(verified 2026-07-27)_

## Planned work

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
- **#24** — finish the `northExpansion` → Mineshaft rename. Touches the save format
  (`maxNorthExpansions` and `Platform.northExpansionIndex` are both persisted).
