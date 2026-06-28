---
status: accepted
---

# Plots stored as a cell-keyed map of lazily-grown scaffolds

## Decision

Persistent plot state lives in a single map keyed by World **cell id** (`"q,r"`) —
`world.plots: Record<cellId, PlotState>` — replacing the three structures that previously
described a plot (`world.cells[]` type flag, `world.plots[]` reference array, and the positional
`data.plots[]` array). A Plot is identified by its Cell; there is no separate `plotId`. Entries
are created **lazily on discovery**, not at world generation: an undiscovered plot has no entry
and is regenerated from seed. The Mine and Station views read and mutate `plots[activePlotCellId]`
**in place** — there is no separate working copy to sync back.

## Context

The old shape kept "a plot" smeared across three structures joined by id, kept a *separate copy*
of the active plot in `mineStore`, and never reconciled `worldStore.activePlotIndex` with that
copy. The result was a recurring class of "active plot didn't save / wrong plot shown" bugs,
plus a load path that *guessed* the active plot via a three-way fallback. We also confirmed the
runtime only ever held **one** plot despite the model claiming many.

## Considered options

- **Parallel arrays joined by id (status quo)** — rejected: the redundancy is the bug source;
  positional arrays make load logic guess.
- **Keep `mineStore` as a hot working copy of the active plot** — rejected: re-introduces the
  exact dual-source-of-truth drift we are trying to delete.
- **Fold full plot state (mines, tiles) into the World cell** — rejected: makes `world` a
  god-object that owns mine/station internals, breaking feature ownership. (We *do* fold the
  plots map under `world` in the **save shape**, but runtime logic stays modular.)
- **Discriminated union on a stored `built` flag** — rejected in favor of the uniform
  scaffold-that-grows below; building is incremental, which a growable structure models better
  than a flag that flips, and a derived predicate cannot drift from reality.

## Lifecycle & "Built"

A plot moves Undiscovered → Under construction → Built (one-way). On discovery a **scaffold** is
created: a Station with no Platform and a single Mineshaft with **no Depths and no Tiles**. The
scaffold is **Tile-less until Built**, which keeps an unbuilt plot's stored cost negligible
(the tile grids are the only expensive part). The player rails age resources into the plot
(accumulating in its `ageResources`) and spends them to fill the scaffold.

There is **no stored `built` flag and no separate build ledger**. "Built" is **derived**:
`isPlotBuilt(plot)` ⇔ the Mineshaft's surface Mine Depth (with Tiles) is materialized. The
"investment so far" is just the accumulating `ageResources`.

## Consequences

- The old "guard middleware" reduces to one invariant, checked on load: `activePlotCellId` must
  reference a discovered `plot` Cell that is Built; otherwise fall back to the home plot `(0,0)`.
- `activePlotCellId` is persisted (reload returns to the managed plot); `inspectedCellId`
  (World-view inspection/tooltip) is session-only and never persisted — these are now distinct
  concepts, ending the `selectedCellId` conflation.
- Save size scales with plots the player has *touched*, not map size.
- Known follow-up fallout (deferred): rename `northExpansion` → `mineshaft`; drop the
  `"plot-<cellId>"` id machinery; collapse `world.plots[]`/`data.plots[]`; rewrite the stale
  "City → plots → mines" wording in `docs/DESIGN.md` (City/Factory are destination siblings of
  Plot, not parents). The pre-alpha hard-reset-on-version-mismatch policy means no save migration
  is needed.

## Note on the originating RFC (#12)

This decision supersedes the framing of RFC #12. The "5s startup hang" is almost certainly the
hard-coded 2500 ms splash timer in `App.svelte`, not JSON parsing; the proposed Web Worker would
have addressed a non-bottleneck. The real win in that RFC is this model: fewer plots proxied
(only touched ones) and the removal of redundant, drift-prone structures.
