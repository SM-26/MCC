# Developer Cheat Menu

A dev-only panel for setting up test scenarios that are slow to reach through normal play.

**Where:** `SettingsView.svelte`, in a `SettingsSection` accordion titled "Developer Cheats".
**Gating:** rendered only when `gameState.current.settings.devMode === true` (the toggle lives in Settings).

## Available cheats

| Button | Function | What it does |
| --- | --- | --- |
| 💰 Add $1,000 | `cheatAddMoney` | `gameState.addMoney(1000)` |
| 🗺️ Reveal All Cells | `cheatRevealWorld` | Discovers every generated cell, then calls `revealTouchingFrontier` so fog now touching discovered ground is generated too. Repeatable, each press grows the map outward. |
| 🏗️ Build Active Plot | `cheatBuildActivePlot` | `ensurePlotScaffold(activePlotCellId)`. No-ops with a log when there is no active plot. |
| 📍 Discover Neighbor Plot | `cheatDiscoverNeighborPlot` | Finds an undiscovered `plot` cell, generating outward up to `MAX_PLOT_SEARCH_RINGS` (15) rings if none exists yet, then discovers and scaffolds **only that one tile**, its ring-mates stay fogged. |
| ⛏️ Free Lvl 5 Miner | `cheatFreeMiner` | Places a level-5 miner (`CHEAT_MINER_LEVEL`) on the active depth, free. Reaching level 5 by hand costs 16 level-1 miners and 15 merges. |

## Conventions for adding a cheat

- **No new stores, no new files.** Mutate existing state directly in `SettingsView.svelte`.
- **Call `debouncedSave()`** after any mutation.
- **Reuse the real action's logic** instead of duplicating it. `cheatFreeMiner` calls the same
  `placeMiner(activeMine, level)` that `buyMiner` uses, so the cheat cannot drift from real
  placement rules (first free empty tile, never two miners on one tile), it just doesn't pay.
- **Fail as a no-op, not an error.** Log with `log.debug('cheat', …)` and return. A cheat that
  can't apply should never throw or raise a toast.
- **Use `Button.Root` from `bits-ui` with `class="glass-btn"`** for visual consistency.
- Log every action with `log.debug('cheat', …)`, never `console.*`.
