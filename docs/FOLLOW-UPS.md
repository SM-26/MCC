# Follow-ups

Live deferred work for this repo. Items are deleted as they land, git history holds what was here
before. Bugs with a clear owner or a save-format impact go to GitHub Issues instead; this file is
for things that would otherwise be forgotten.

## Live bugs

- **HUMAN CHECK NEEDED: the new icon wiring has never been looked at.** Icons are the one thing
  that cannot be verified headlessly, and the browser pane in use never composited frames, so every
  screenshot attempt timed out. The paths, sizes, formats and precache contents are all confirmed by
  measurement, but **nobody has actually seen these icons render.** Worth eyeballing:

  - Browser tab favicon, light and dark theme, and a pinned/bookmarked tab.
  - Android install prompt and the resulting home-screen icon, which now comes from a **WebP**
    manifest entry. This is the highest-risk one: WebP manifest icons are well supported in Chrome,
    but if anything is going to fall back to a generic glyph, it is this.
  - iOS Add to Home Screen, which ignores manifest icons and uses the new
    `<link rel="apple-touch-icon" href="./pwa-192x192.png">`.
  - The deployed `/MCC/` build specifically, since the `favicon.ico` link exists precisely because
    the implicit root request 404s under that base.
  - **The splash logo**, which now draws `pwa-512x512.webp` instead of `favicon.svg`. Confirmed to
    fetch 200 as `image/webp` and decode at 512x512, but nobody has watched it paint.

  If the Android icon misbehaves, the fix is adding the PNG entries back into `manifest.icons`
  alongside the WebP ones, at the cost of ~279 KiB of precache. _(wired 2026-08-02)_

- **`favicon.svg` is 316.7 KiB, is not actually vector, and now earns nothing.** It is out of the
  precache and the splash no longer uses it, so it is no longer urgent, but it still ships and is
  still declared as the tab icon in `index.html`.

  The current file is an Inkscape wrapper containing **zero paths** and one `<image>` holding a
  base64 PNG. That PNG is **byte-identical to `public/pwa-512x512.png`**, and base64 adds 36%, so
  this is the single most expensive copy of that artwork in the repo: 316.7 KiB for a picture that
  ships as 38.7 KiB in WebP. It also cannot scale, which was the only reason to keep an SVG at all.
  (The version before it was genuine vector, 14 paths, but 243 KiB of auto-traced coordinates.)

  For the tab icon it buys nothing over `favicon.ico`, which is 14.7 KiB and covers 16/32/48. Two
  clean endings: drop the `<link rel="icon" type="image/svg+xml">` and delete the file, or replace
  it with a real hand-drawn vector, which for this mark would be 5 to 15 KiB. The master six-frame
  icon is archived at `docs/assets/favicon_all.ico`. _(measured 2026-08-02)_

- **Building a plot silently destroys everything railed into it.** `tryBuildPlot`
  (`mineActions.ts:285`) gates on `coal >= BUILD_COAL_COST && money >= BUILD_MONEY_COST`, then calls
  `plotsStore.set(cellId, buildPlot(...))`, and `buildPlot` returns a *fresh* plot with
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
  (1px `#151116` outline, four-tone ramp, speckled highlights), this one is from a different pass
  and reads as foreign next to the new train sprites. It should be redrawn to match. Flagged by the
  Station design handoff, which deliberately scoped it out. _(noted 2026-07-31)_

- **`WorldCell.capacity` is unimplemented, and the exploit it exists to stop is live.** It is meant
  to cap what a city or factory absorbs in one delivery, so a player cannot park a very long train
  next to a very close destination and farm money. Today nothing reads it: `getCityPayout` scales
  with cart capacity and ring, `getCargoSaleValue` with cargo alone, neither clamped. It is also
  only half-written, `revealFogTile` assigns `Math.floor(10 + rng() * 40)` while ring generation
  never sets it at all, so most destinations have no value to clamp against anyway.

  Implementing it means: set it on both creation paths (as with `acceptedResources`), clamp the
  payout and probably the cargo actually accepted, and backfill existing saves. Worth pairing with
  a look at whether capacity should regenerate over time, otherwise a destination is a one-shot.
  _(intent confirmed by the owner 2026-08-02)_

## Planned work

- **Nothing states what an under-construction plot needs, or what has arrived.** Delivery itself
  works: `trainTick.ts` `case 'plot'` deposits `trip.cargo` into the target's `ageResources`,
  creating a scaffold if the cell was never visited, and pays nothing. But no surface, World cell
  card, Station route card, or platform view, shows a requirement or a running total, so the player
  is railing cargo at an invisible target. Worth designing alongside the `tryBuildPlot` fix above,
  since a "needed vs delivered" readout is meaningless while the pool is wiped on build. Wants a
  per-age requirement (probably scaling with ring distance) rather than today's single coal
  threshold. _(noted 2026-08-01)_

- **Write ADR-0002** for the decisions made during age advancement, whose rationale currently lives
  only in commit messages:
  - The plot's age owns the dig ceiling (`getMaxDepthForAge`), and `EngineeringState.maxUndergroundLevels`
    deliberately stays unused rather than being combined with it.
  - The ceiling is never a prerequisite, `ageResources` pools across mineshafts, so a second shaft
    funds an age without digging deeper.
  - Actions own their own money spend via `gameState.spendMoney` (the commit point; every check that
    can fail runs before it), instead of returning `nextMoney` for the caller to apply. Returning it
    is what made shaft buying a money sink.
  - Gated buttons render disabled with a visible reason, never hidden behind `{#if}`. Hiding the
    buy-shaft button made a real bug undiagnosable from the UI.

## Code health (`pnpm fallow`)

`includeEntryExports` is now on, so dead-export detection actually works, before, the Svelte/vitest
plugins marked ~85 files as entry points and nothing could ever be reported unreachable. That was
hiding a fully dead `src/logic/shared/` folder.

- **42 unused exports + 5 unused types** are now visible and untriaged. Both rules are set to `warn`
  so they don't gate CI. Some are genuinely dead (`worldPathing.ts`'s `getTileCost`,
  `isTilePassableByCell`, `getExplorationTime`; `appTypes.ts`'s `AppContext`, `PWAInstallState`),
  others may be intentional API surface. `fallow fix --dry-run` lists them; triage before deleting.
- **`pnpm fallow` still exits 1** on `health` (82 above threshold, maintainability 88.7). Re-measured
  after the Station rebuild: `StationView.svelte` has dropped off the list entirely (869 LOC and
  cognitive 149, now 87 LOC). The current targets are `WorldView.svelte` (cognitive 60, 341 LOC,
  medium effort) and two components the rebuild introduced, `TrainYardDrawer.svelte` (cognitive 75,
  616 LOC) and `PlatformView.svelte` (cognitive 58, 569 LOC). Splitting one 869-line file into eight
  moved the complexity rather than removing all of it; both are mostly template branching and would
  reduce by extracting the yard's tab bodies and the platform's action rows.
  _(re-measured 2026-08-02)_
- `svelte` is reported as a dev dependency used in production. For a bundled Vite app this is
  cosmetic, dependencies vs devDependencies doesn't change the output. Ignore or suppress.

## Balance / provisional

- Build economy constants are provisional: `BUILD_COAL_COST = 10`, `BUILD_MONEY_COST = 100`
  (`mineActions.ts`). Tune.
- Age advance costs (`AGE_ADVANCE_COST`) and the engine upgrade curve
  (`ENGINE_UPGRADE_COST_MULTIPLIER`, `MAX_ENGINE_LEVEL`) are first-pass. Both carry `ponytail:`
  comments naming the ceiling and what to change.

## Minor test / polish nits (low priority)

- A couple of missing null/miss-path coverage cases.

## Tracked in GitHub Issues

- **#22**, flaky `mineGen` test ("only uses valid fillable tile types above the bottom row") failed
  once and would not reproduce, despite fixed seeds.
