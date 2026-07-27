# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # dev server at http://localhost:8080
pnpm build        # production build
pnpm check        # svelte-check + tsc (type check)
pnpm lint         # ESLint
pnpm format       # Prettier (src/**/*.{js,ts,svelte,css,md,json})
pnpm test         # vitest in watch mode
pnpm test:run     # vitest one-shot
```

Run a single test file: `pnpm test:run -- src/logic/mine/mineGen.test.ts`

## Architecture

**Layer breakdown:**

- `src/App.svelte` — application shell, tab routing, autosave wiring
- `src/views/` — World, Mine, Station, Settings. (Engineering is routed as a tab but is an inline placeholder in `App.svelte`; there is no `EngineeringView.svelte`.)
- `src/logic/` — all game logic and state; pure TypeScript except for stores
- `src/components/` — shared UI components
- `src/lib/` — generic utilities (logger, sizes, theme)

**Logic is split by feature domain** (`app`, `engineering`, `mine`, `save`, `shared`, `station`, `world`). Each feature under `src/logic/<feature>/` owns:
- `*Types.ts` — TypeScript interfaces and type-only helpers
- `*Store.svelte.ts` — reactive state (Svelte 5 `$state`) with a factory function and a module-level singleton export
- `*.ts` — pure logic functions (generation, tick, actions, pathing)

**Store dependencies:** don't import one feature's store from another feature's *store*. Action modules are freer — they compose stores deliberately (`mine/mineActions.ts` and `mine/ageProgression.ts` both spend from `app/gameState`, and `mineActions` mutates `plotsStore`). Keep that composition in `*Actions.ts`-style modules, not in the stores themselves.

**Ownership across mine/station:** age is a *plot* concept, so `mine/ageProgression.ts` owns the ladder (`AGE_ORDER`, `AGE_RESOURCE`, `isAgeAtLeast`, `AGE_ADVANCE_COST`, `getMaxDepthForAge`, `advanceAge`) and station imports from it, not the reverse.

## State management pattern

All stores follow this shape:

```ts
export function createXxxStore(initial?: Partial<XxxState>) {
  const state = $state<XxxState>({ ...defaults, ...initial });
  return {
    get current() { return state; },
    replace(next: XxxState) { Object.assign(state, next); },
    // domain-specific mutators...
  };
}
export const xxxStore = createXxxStore(); // singleton
```

Use `$state.snapshot(store.current)` when you need a plain-object copy (e.g. before JSON serialisation).

## Save / load

- Key: `mcc_save` in `localStorage`
- Entry point: `src/logic/save/save.svelte.ts` (`loadGame`, `debouncedSave`, `manualSave`, `resetProgress`)
- Autosave is debounced 500 ms and only fires after the splash screen clears
- Save version is read from `package.json`'s `version`; the commit hash/message come from `src/assets/git-info.txt`, generated at dev/build start by `gitInfoPlugin` in `vite.config.ts` (git-ignored, not committed)

**Adding a store? Wire it into all three of these or it will silently never load:** `getPersistedSnapshot()` (write), `applyLoadedState()` (read a save), `applyDefaultState()` (new game / reset). `engineeringStore` was missed here for a long time — it was written from `stateFactory` defaults and never read back, so `maxNorthExpansions` sat at its module default forever and the feature gated on it looked broken rather than unsaved. Nothing type-checks this; the only guard is a save/load round-trip test.

## Mine state hierarchy

```
PlotState
└── mineshafts: Mineshaft[]
    └── mineDepths: MineDepth[]   ← depth 0 = surface
        ├── tiles: MineTile[][]   ← [row][col]
        └── miners: Miner[]
```

Active path: `plotsStore.get(activePlotCellId)` → active mineshaft → `activeMineDepth`.

Mine and world grids are **seeded-random** (via `seedrandom`). `generatePlot` and `generateWorld` are deterministic given the same seed + reset count.

**Ore is bracketed by depth**, five depths per bracket (`getActiveResourcesForDepth`): 0–4 rubble, 5–9 coal, 10–14 oil, 15–19 copper, 20–24 superalloy, then pairs. The plot's age caps how deep it may dig (`getMaxDepthForAge` = `9 + 5 × ageIndex`, Maglev uncapped), so each age reaches exactly the ore that funds the next.

That cap is a **ceiling, never a prerequisite**. `ageResources` pools across all of a plot's mineshafts, so a second shaft's depth 0–9 can fund an age without ever digging deeper. Never gate advancing on a depth.

## World state

The world is a hex grid. Cells use axial coordinates `(q, r)`; `ring` is Chebyshev distance from center. Cell IDs are `"q,r"` strings. A Plot is a Cell of type `plot` identified directly by its Cell id — there is no separate plot id.

`WorldState.activePlotCellId` holds the Cell id of the active (managed) plot. `WorldState.inspectedCellId` holds the Cell being viewed/hovered in the World view (read-only, not persisted). Developed plots live in `world.plots: Record<cellId, PlotState>`, owned at runtime by `plotsStore` (`src/logic/mine/plotsStore.svelte.ts`). Mine and Station views read `plotsStore.get(activePlotCellId)` and mutate in place.

## Styling bits-ui components

A class passed as a **prop** to a bits-ui component (`Button.Root`, `Select.Trigger`, …) is rendered on bits-ui's own element, which does not carry Svelte's scope hash. A scoped rule therefore matches nothing and the styling silently never applies. Wrap those selectors in `:global(...)`:

```css
:global(.build-btn) { … }
/* bits-ui sets [data-disabled] alongside :disabled — match both */
:global(.build-btn:hover:not(:disabled):not([data-disabled])) { … }
:global(.build-btn:disabled),
:global(.build-btn[data-disabled]) { … }
```

Define each such class in **exactly one** component — a second `:global` definition of the same class races the first on stylesheet order. Current owners: `.buy-btn` → MineView, `.select-trigger` → SettingsView, `.build-btn` / `.trainyard-btn` → StationView, `.nav-btn` → MineHeader.

Keep `pnpm check` at **0 warnings**. An "Unused CSS selector" on one of these classes is not noise — it means the button is rendering unstyled. The warning only appears when no other component defines the class globally, so a shadowed scoped rule can be broken without any warning at all.

## Logging

Use `log` from `src/lib/logger.ts` — never `console.*` directly:

```ts
import { log } from '../lib/logger';
log.debug('context', 'message');   // transient state
log.info('context', 'message');    // lifecycle events
log.warn('context', 'message');    // recoverable edge cases
log.error('context', 'message');   // data integrity failures
```

## Testing

- Unit tests sit next to their source file (e.g. `mineGen.test.ts`)
- Integration tests live in `src/logic/integration/`
- Test environment: `happy-dom` (configured in `vite.config.ts`)