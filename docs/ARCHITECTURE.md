# Project Architecture: Mines & Choo Choos

This document outlines the project structure and design philosophy for the game after the feature-based state refactor.

## 1. High-Level Architecture

The application is built on a modular, reactive architecture using Svelte 5 (Runes).

- **Feature State Layer (`src/logic/*/*Types.ts`, `src/logic/*/*Store.svelte.ts`):** The main source of truth for game and UI feature state. Each feature owns its own data contracts and reactive store.
- **Logic Layer (`src/logic/`):** The game brain. Contains pure TypeScript functions for simulation, world generation, routing, save composition, and state helpers.
- **View Layer (`src/views/*.svelte`):** The tab-level screens. Each view renders one major gameplay or app area such as World, Mine, Station, Engineering, or Settings.
- **Layout Layer (`src/App.svelte`):** The application shell. Hosts the main structure, navigation UI, and active tab content.

This project no longer treats `src/types.ts` as the central source of truth. Instead, types are owned by the feature that uses them.

## 2. Design Philosophy

The codebase is organized around **feature ownership**.

- A feature owns its own types, helpers, and store.
- Cross-feature composition happens at the root state level, not inside random feature modules.
- Generic utilities belong in `src/lib/`.
- Game-specific logic belongs in `src/logic/`.

This keeps modules cohesive and avoids a single global “misc state” layer.

## 3. State Model

Reactive state is split by feature.

### Feature-owned modules

- `src/logic/mine/` — mine grids, depths, miners, carts, resources, plot state
- `src/logic/station/` — stations, platforms, trainyards, trains
- `src/logic/world/` — world map, cells, destinations, route references, world-level plot references
- `src/logic/engineering/` — Engineering Ideas progression and reset-related progression state
- `src/logic/app/` — navigation types, settings types, and app-shell contracts
- `src/logic/save/` — persisted root-state shapes and save/load helpers

### Root composition

- `src/logic/stateFactory.ts` creates the initial root game state
- `src/logic/save/saveTypes.ts` defines the persisted root-state shape
- feature stores manage live state inside their own domain boundaries

The root state composes feature-owned state instead of redefining it inline.

## 4. Navigation & View Loading

Navigation is handled through reactive tab state.

1. `App.svelte` reads the active tab and conditionally renders the matching view.
2. Each view is mounted only when active, keeping the screen model simple and isolated.
3. Navigation state is defined in `src/logic/app/navigationTypes.ts`.
4. Persisted navigation is composed into save data, but still belongs conceptually to the app/navigation domain.

The current tab set is:

- `world`
- `mine`
- `station`
- `engineering`
- `settings`

### Station tab specifics

`StationView.svelte` manages the station of the **active plot** (`world.activePlotIndex` → `PlotState.station`). The station is a single optional object embedded on each plot (`mineTypes.ts: PlotState.station: Station | null`).

- **Source of truth is the embedded `PlotState.station`**, read/written via `mineStore.current`. The module-level `stationStore` singleton is currently **dead/unused** — it predates the per-plot embedding and is kept only for reference.
- **Mutations go through `stationActions.ts`** — pure functions that take state as an argument and return a `{ ok, nextMoney? }` result (mirrors the `mineActions.ts` convention). The view commits `gameState.current.money = result.nextMoney` and calls `debouncedSave()`.
- **Building:** a station costs money and requires the surface level (expansion 0, depth 0) to be `getClearStatus() === 'hard'`. Building it creates the foundation platform at (0, 0).
- **Platform-depth rule:** the foundation is depth 0 (expansion 0 only); every other platform goes at depths 1, 6, 11, 16, … (`depth > 0 && depth % 5 === 1`), on a hard-cleared level. See `isPlatformDepth` in `stationActions.ts`.
- **Navigation:** StationView tracks its own focus via `Station.activePlatformId` (independent of MineView's deepest-depth pointer). Switching platforms and switching expansions are both done from the StationView selector.
- **Train yard** (train assignment, carts, routes, trip ticks) is deferred — the view shows a placeholder panel for now.

## 5. File Structure Map

```text
/public/                # Static browser assets (favicon, manifest, robots.txt)
/docs/
├── ARCHITECTURE.md     # this file
└── DESIGN.md           # Design Specification
/src/
├── assets/             # Processed images and icons
├── components/         # Reusable UI components
├── views/              # Top-level tab screens
├── logic/              # Feature logic, state, and factories
│   ├── app/            # App-shell types (navigation, settings, app context)
│   ├── engineering/    # Engineering Ideas feature state
│   ├── mine/           # Plot, mine, miner, cart, and resource logic
│   ├── save/           # Save-state types and persistence helpers
│   ├── station/        # Station, platform, and train logic
│   ├── world/          # World map and routing logic
│   └── stateFactory.ts # Initial root-state composition
├── lib/                # Generic utilities
├── styles/             # Global CSS
└── App.svelte          # Main shell
```

## 6. Folder Breakdown

| Folder | Responsibility | Example |
| --- | --- | --- |
| `/public` | Static browser and OS files | `favicon.ico`, `manifest.json` |
| `/docs` | Documentation | `DESIGN.md`, `ARCHITECTURE.md` |
| `/src/assets` | Optimized game assets | `sprite.png`, `background.webp` |
| `/src/components` | Reusable UI building blocks | `Button.svelte`, `Navbar.svelte` |
| `/src/views` | Full tab screens | `WorldView.svelte`, `StationView.svelte` |
| `/src/logic/app` | App-wide contracts and preferences | `navigationTypes.ts`, `settingsTypes.ts` |
| `/src/logic/mine` | Mine gameplay data and logic | `mineTypes.ts`, `mineStore.svelte.ts`, `mineGen.ts` |
| `/src/logic/station` | Station and train domain | `stationTypes.ts`, `stationActions.ts`, `stationStore.svelte.ts` |
| `/src/logic/world` | World map and destination domain | `worldTypes.ts`, `worldStore.svelte.ts` |
| `/src/logic/engineering` | Engineering Ideas progression | `engineeringTypes.ts`, `engineeringStore.svelte.ts` |
| `/src/logic/save` | Save-file contracts and persistence helpers | `saveTypes.ts`, `saveStore.svelte.ts` |
| `/src/lib` | Generic helper code | `logger.ts`, `sizes.ts` |
| `/src/styles` | Global design tokens and CSS | `theme.css`, `reset.css` |

## 7. Store Strategy

This project uses **feature stores**, not one monolithic global store.

- Each feature store owns mutations inside its own domain.
- Stores may import shared types from other features when needed, but ownership stays with the defining feature.
- Pure helper logic should stay outside stores whenever possible.
- Type-only modules do not need stores.

Examples:
- `mineStore.svelte.ts` mutates plot/mine/miner state
- `worldStore.svelte.ts` manages world cells, destinations, and active plot selection
- `engineeringStore.svelte.ts` manages Engineering Ideas progression
- `saveStore.svelte.ts` handles save serialization and persistence boundaries

There is currently no separate `appStore.svelte.ts`, because app-shell state is still small enough to stay as plain contracts and local usage.

## 8. Save & Persistence Model

Persistence is defined at the root level.

- `saveTypes.ts` defines the saved root object
- feature state is imported into the root save shape
- `stateFactory.ts` provides the initial baseline state used for resets and structural defaults
- `saveStore.svelte.ts` serializes, parses, imports, and exports save data

This keeps persistence concerns separate from feature ownership.

## 9. CSS & Logging Strategy

- **CSS:** Use global CSS in `src/styles/` for tokens, resets, and shared themes. Use component-scoped CSS for local layout and stateful visual behavior.
- **Logging:** All game-specific logging should go through `src/lib/logger.ts`.

Logging levels:
- `log.debug` — transient state changes and simulation detail
- `log.info` — lifecycle events, navigation events, major feature actions
- `log.error` — failed saves, load errors, generation failures, unexpected logic crashes

## 10. Decision Test (Logic vs. Lib)

> **If this code were reused in a completely different game, would it still be useful?**

- **Yes** → it is a generic utility → `src/lib/`
- **No** → it is game-specific logic → `src/logic/`

## 11. Decision Test (Feature Ownership)

> **Which folder should own this file?**

Ask:

1. Which feature understands this concept best?
2. Which feature would change first if the rules changed?
3. Is this a domain model, persistence model, or generic utility?

Rules:
- If it describes mine gameplay, it belongs in `mine/`
- If it describes world navigation or map state, it belongs in `world/`
- If it describes Engineering Ideas progression, it belongs in `engineering/`
- If it is only used to compose persisted state, it belongs in `save/`
- If it is generic across many unrelated features, it belongs in `lib/` or a very small shared type file

## 12. Testing Priorities

Tests should focus on behavior, not just declarations.

High-value targets:
- pure game logic helpers
- generation functions
- `stateFactory.ts`
- save serialization and parsing
- cross-feature composition boundaries

Low-value targets:
- plain interface/type-only files
- trivial constant declarations
- empty shared type files

The goal is to protect gameplay behavior and root-state composition, not to over-test passive type definitions.