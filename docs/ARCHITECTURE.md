# Project Architecture: Mines & Choo Choos

This document outlines the project structure and design philosophy for the game after the feature-based state refactor.

## 1. High-Level Architecture

The application is built on a modular, reactive architecture using Svelte 5 (Runes).

- **Feature State Layer (`src/logic/*/*Types.ts`, `src/logic/*/*Store.svelte.ts`):** The main source of truth for game and UI feature state. Each feature owns its own data contracts and reactive store.
- **Logic Layer (`src/logic/`):** The game brain. Contains pure TypeScript functions for simulation, world generation, routing, save composition, and state helpers.
- **View Layer (`src/views/*.svelte`):** The tab-level screens, World, Mine, Station, Settings. (Engineering is routed as a tab but is still an inline placeholder in `App.svelte`; there is no `EngineeringView.svelte`.)
- **Layout Layer (`src/App.svelte`):** The application shell. Hosts the main structure, navigation UI, and active tab content.

This project no longer treats `src/types.ts` as the central source of truth. Instead, types are owned by the feature that uses them.

## 2. Design Philosophy

The codebase is organized around **feature ownership**.

- A feature owns its own types, helpers, and store.
- **Stores** don't reach across features. **Action modules** deliberately do, `mineActions.ts` and `ageProgression.ts` both spend from `app/gameState`, and `mineActions` mutates `plotsStore`. Keep that composition in `*Actions.ts`-style modules, never in a store.
- Ownership follows the domain, not the folder that happens to use it: age is a *plot* concept, so `mine/ageProgression.ts` owns the age ladder and `station/` imports from it.
- Generic utilities belong in `src/lib/`.
- Game-specific logic belongs in `src/logic/`.

This keeps modules cohesive and avoids a single global “misc state” layer.

## 3. State Model

Reactive state is split by feature.

### Feature-owned modules

- `src/logic/mine/`, mine grids, depths, miners, resources, plot state, and the age ladder (`ageProgression.ts`)
- `src/logic/station/`, stations, platforms, trainyards, trains, trip resolution
- `src/logic/world/`, world map, cells, destinations, hex maths, pathing
- `src/logic/engineering/`, Engineering Ideas progression and reset-related progression state
- `src/logic/app/`, app-shell state and contracts (`gameState`, `navigationStore`, `appContext`, `pwaInstallStore`, settings types)
- `src/logic/save/`, persisted root-state shapes and save/load helpers
- `src/logic/integration/`, cross-feature integration tests

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

`StationView.svelte` manages the station of the **active plot** (`world.activePlotCellId` → `plotsStore.get(activePlotCellId).station`). The station is a single optional object embedded on each plot (`mineTypes.ts: PlotState.station: Station | null`).

- **Source of truth is the embedded `PlotState.station`**, read/written via `plotsStore.get(activePlotCellId)`. The module-level `stationStore` singleton is **deleted**, it predated the per-plot embedding.
- **Mutations go through `stationActions.ts`**, pure functions that take state as an argument and return a `{ ok, nextMoney? }` result (mirrors the `mineActions.ts` convention). The view commits `gameState.current.money = result.nextMoney` and calls `debouncedSave()`.
- **Building:** a station costs money and requires the surface level (expansion 0, depth 0) to be `getClearStatus() === 'hard'`. Building it creates the foundation platform at (0, 0).
- **Platform-depth rule:** eligible depths are the surface and then every fifth level from 6, **0, 6, 11, 16, …** (`isPlatformDepth`: `depth === 0 || (depth > 5 && depth % 5 === 1)`). Depth 1 is *not* eligible.
- **Navigation:** StationView tracks its own focus via `Station.activePlatformId` (independent of MineView's deepest-depth pointer). Switching platforms and switching expansions are both done from the StationView selector.
- **Train yard is built:** engines and carts are bought into `TrainyardInventory`, placed on platforms, assigned a `Route`, and dispatched. Trips carry absolute timestamps, so `processTrains` (`trainTick.ts`) resolves everything due in one pass, including trips that finished while the app was closed. Delivering to a `plot` destination scaffolds it on arrival and deposits the cargo into its `ageResources`.
- **Engine upgrades:** `Train.engineLevel` feeds `getTripDuration`; raised via `upgradeEngine`, capped at `MAX_ENGINE_LEVEL`. Not permitted mid-trip.

## 5. File Structure Map

```text
/public/                # Static browser assets (favicon, manifest, robots.txt)
/CLAUDE.md              # Conventions, commands, agent guidance
/CONTEXT.md             # Domain glossary / ubiquitous language
/AGENTS.md              # Project status + agent tooling
/docs/
├── ARCHITECTURE.md     # this file
├── DESIGN.md           # Design specification
├── DESIGN-SYSTEM.md    # Visual language
├── CheatMenu.md        # Dev cheat panel reference
├── FOLLOW-UPS.md       # Live deferred work
├── worldGen.md         # World generator design
├── adr/                # Architectural decision records
├── agents/             # Agent skill configuration
└── testing/            # Testing guides
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
| `/src/logic/mine` | Mine gameplay data and logic | `mineTypes.ts`, `plotsStore.svelte.ts`, `mineGen.ts` |
| `/src/logic/station` | Station and train domain | `stationTypes.ts`, `stationActions.ts` |
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
- `plotsStore.svelte.ts` owns the cell-keyed plot map (`Record<cellId, PlotState>`); Mine and Station views call `plotsStore.get(activePlotCellId)` and mutate in place
- `worldStore.svelte.ts` manages world cells, destinations, and active plot selection (`activePlotCellId` / `inspectedCellId`)
- `engineeringStore.svelte.ts` manages Engineering Ideas progression
- `saveStore.svelte.ts` handles save serialization and persistence boundaries

App-shell state lives in `src/logic/app/` as several small stores rather than one `appStore`: `gameState.svelte.ts` (money, settings), `navigationStore.svelte.ts`, `appContext.svelte.ts` (screen size), `pwaInstallStore.svelte.ts`.

**Every store must be wired into all three save paths**, `getPersistedSnapshot()`, `applyLoadedState()` and `applyDefaultState()` in `save.svelte.ts`, or it silently stays at its module defaults forever. Nothing type-checks this; `engineeringStore` was missed for weeks and looked like a broken feature rather than an unsaved one. A save/load round-trip test is the only guard.

## 8. Save & Persistence Model

Persistence is defined at the root level.

- `saveTypes.ts` defines the saved root object
- feature state is imported into the root save shape
- `stateFactory.ts` provides the initial baseline state used for resets and structural defaults
- `saveStore.svelte.ts` serializes, parses, imports, and exports save data

This keeps persistence concerns separate from feature ownership.

## 9. CSS & Logging Strategy

- **CSS:** Use global CSS in `src/styles/` for tokens, resets, and shared themes. Use component-scoped CSS for local layout and stateful visual behavior.
- **CSS on bits-ui components:** a class passed as a *prop* to a bits-ui component lands on bits-ui's own element, which carries no Svelte scope hash, a scoped rule matches nothing and the styling silently never applies. Wrap those selectors in `:global(...)`, define each such class in exactly one component, and treat an "Unused CSS selector" warning on one as a rendering bug. See CLAUDE.md for the full rule.
- **Logging:** All game-specific logging should go through `src/lib/logger.ts`.

Logging levels:
- `log.debug`, transient state changes and simulation detail
- `log.info`, lifecycle events, navigation events, major feature actions
- `log.warn`, recoverable edge cases
- `log.error`, failed saves, load errors, generation failures, unexpected logic crashes

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