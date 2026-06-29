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
- `src/views/` — one component per tab: World, Mine, Station, Engineering, Settings
- `src/logic/` — all game logic and state; pure TypeScript except for stores
- `src/components/` — shared UI components
- `src/lib/` — generic utilities (logger, sizes, theme)

**Logic is split by feature domain.** Each feature under `src/logic/<feature>/` owns:
- `*Types.ts` — TypeScript interfaces and type-only helpers
- `*Store.svelte.ts` — reactive state (Svelte 5 `$state`) with a factory function and a module-level singleton export
- `*.ts` — pure logic functions (generation, tick, actions, pathing)

Cross-feature composition happens only at `src/logic/stateFactory.ts` and `src/logic/save/saveTypes.ts`. Don't import a feature's store from another feature's store.

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
- Save version is read from `src/assets/version.txt` at build time via Vite's `?raw` import

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

## World state

The world is a hex grid. Cells use axial coordinates `(q, r)`; `ring` is Chebyshev distance from center. Cell IDs are `"q,r"` strings. A Plot is a Cell of type `plot` identified directly by its Cell id — there is no separate plot id.

`WorldState.activePlotCellId` holds the Cell id of the active (managed) plot. `WorldState.inspectedCellId` holds the Cell being viewed/hovered in the World view (read-only, not persisted). Developed plots live in `world.plots: Record<cellId, PlotState>`, owned at runtime by `plotsStore` (`src/logic/mine/plotsStore.svelte.ts`). Mine and Station views read `plotsStore.get(activePlotCellId)` and mutate in place.

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