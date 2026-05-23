# Merge & Choo-Choo Technical Architecture

## Purpose
This document is the system-level entry point for developers and AI agents working on Merge & Choo-Choo. It explains how the game is shaped, where responsibilities live, and how the codebase should be divided into slices, without turning into a task list or implementation checklist.

## Audience
This document is written for an AI coding agent or a human developer joining the project for the first time. It should provide enough context to understand the repo, plan slices, and avoid accidental architectural drift.

## Product frame
Merge & Choo-Choo is a portrait-first, mobile-first idle railway tycoon with mining, route management, and seed-based world generation. The current project direction is single-player and offline-first, with desktop treated as a second-class target until shared progression exists.

## Design source
The current design is based on `train-idle-design-draft.md`, plus the lessons from the MVPs. Prestige and EI are postponed for now, but the architecture should leave a clean future slot for them.

## Goals
- Keep the game understandable on a phone.
- Keep the codebase understandable by AI agents and humans.
- Keep the repo modular enough for parallel slices.
- Keep local offline play simple.
- Keep future cloud save and desktop support possible without a rewrite.

## Non-goals
- No backend-first architecture.
- No shared progression system yet.
- No prestige/EI implementation in the current architecture slice.
- No heavy framework requirement unless later justified.
- No multi-client synchronization logic in v1.

## Terminology
- **World:** The seeded map and its discovered locations.
- **City:** A named location with the same core ruleset as other cities, but different seed-derived identity and train limits.
- **Plot:** A playable land area in a city.
- **Station:** The logistics structure built on a plot.
- **Platform:** A single train slot within a station.
- **Route:** A train assignment from a platform to a destination.
- **Age:** A city-specific progression tier for trains and resource unlocks.
- **Seed:** The deterministic input that generates layout, names, locations, and limits.
- **Slice:** A bounded subsystem that can be owned and developed mostly independently.

## Platform assumptions
The baseline runtime is TypeScript in a browser/PWA shell. Godot remains a possible alternative later, but not the current default. The first release path should optimize for fast iteration, easy debugging, and local save handling rather than engine complexity.

## Tech stack
- **Language:** TypeScript.
- **Build tool:** Vite.
- **UI approach:** Vanilla DOM rendering or very light helpers; no framework by default.
- **Style system:** Plain CSS or CSS modules.
- **Tests:** Optional later, likely Vitest if the project needs it.
- **Lint/format:** Optional later, likely Biome or ESLint if the repo grows enough to justify it.

## Product constraints
The game should be readable and playable on a phone in short sessions. Desktop support is allowed, but it is not the design center yet. Cloud save, shared progression, and account systems are future concerns, not launch dependencies.

## Core pillars
- Seeded world structure.
- Identical city rulesets with different names, positions, and train limits.
- Mining and station systems that feed each other.
- Offline-first local persistence.
- A modular monolith that can later be split by slice ownership.

## Architecture style
The repo should be a single monolith with explicit internal boundaries. The code should be organized by domain slice rather than by generic technical layer alone. Shared utilities should exist, but slice ownership should remain visible.

## System boundaries
The codebase should separate concerns by domain, not by UI screen. World generation, mining, station management, save handling, and shared UI scaffolding should each own their own state and rules, with only narrow interfaces between them.

## Source of truth
- Game state is the source of truth for gameplay.
- UI is a projection of state, not the owner of state.
- Save data is a serialized form of game state, not a second source of truth.
- Seeded content is data-driven, not hardcoded into UI views.
- Cross-slice state must not be duplicated unless there is a clear cache or derived view.

## Runtime model
The game is a stateful client application with local simulation, persistence, and UI rendering inside the same repo. The browser is the primary runtime, and the PWA layer is a packaging and offline-support concern rather than a separate product.

## State model
There should be one authoritative game state object with domain-owned subtrees for world, plots, mines, stations, routes, and player progress. UI should read state and emit actions; domain systems should not depend on the rendering layer.

## Data flow
A player action should follow a simple path: input event, UI action, domain rule, state update, derived view update, persistence. Domain systems should own rules and emit outcomes; the UI should not re-implement game logic.

## Persistence model
Version 1 persistence is browser storage only. The save format should be treated as a local JSON document at a high level, while the concrete schema is reserved for a later spec. Future cloud save or file export/import should be possible without redefining the core game rules.

## Error and recovery model
The app should prefer recovery over failure. Missing saves, malformed local data, or version mismatches should fall back to a safe default state or a migration path when possible. Invalid content should not block the game from loading a minimal playable state.

## World generation
The world is seed-based. The seed determines map layout, city and factory names, location placement, and train limits. Cities are intentionally uniform in rules so the seed changes structure and identity, not mechanics.

## World slice
The world slice owns the global map, discovery state, seeded destinations, and the logic that decides what is visible or locked. It should not know about miner behavior or station internals beyond the data it needs to display and route to destinations.

## Mines slice
The mines slice owns plots, depths, tile states, miner units, merging, clearing behavior, and depth-based excavation rules. It should expose outcomes to the rest of the game in a simple way, such as cleared plots, resource yields, and unlock conditions.

## Station slice
The station slice owns station construction, platforms, train assignment, route selection, cart composition, and trip state. It should handle logistics gameplay without needing to know mining internals beyond the resource or unlock outputs that influence progression.

## Content slice
Content covers named cities, factories, destination templates, train categories, and other authored or seeded data that feeds the systems. This slice should stay data-oriented so the game can grow without hardcoding rules into the UI.

## UI slice
The UI slice is responsible for layout, navigation, screen composition, and user input translation. It should remain thin and mostly present the state owned by the domain slices.

## Save slice
The save layer owns serialization, deserialization, versioning, compatibility handling, and migration boundaries. It should be designed so a future cloud sync layer can sit above it without forcing the rest of the game to care where the save came from.

## Platform slice
The platform slice owns browser-specific concerns such as storage adapters, PWA support, feature detection, and future desktop packaging differences. It should isolate environment details from the game systems.

## Dependency rules
- `app` may depend on everything needed to assemble the runtime.
- `ui` may depend on domain slices, but should not own domain logic.
- `world`, `mines`, and `station` may depend on `core` and `content`, but should avoid depending on each other’s private internals.
- `save` may depend on `core` and state contracts, but not on DOM rendering.
- `platform` may provide adapters to the rest of the app, but should not contain gameplay rules.

## Folder structure
A single-repo monolith is the planned structure. The folder layout should reflect slices and shared utilities rather than separate apps.

- `src/core/` — shared types, event helpers, and low-level utilities used by multiple slices.
- `src/world/` — seeded map generation, discovery logic, and world-state rules.
- `src/mines/` — plot clearing, miner behavior, depth progression, and excavation rules.
- `src/station/` — stations, platforms, routes, carts, and train lifecycle logic.
- `src/save/` — local persistence, serialization, migration, and compatibility handling.
- `src/ui/` — screens, components, navigation, and presentation state.
- `src/content/` — seeded names, destination templates, and other authored data.
- `src/platform/` — browser, PWA, storage, and runtime adapters.
- `src/app/` — app composition, bootstrapping, and top-level wiring.

## Slice ownership
Each slice should own its own rules and avoid reaching into another slice’s private state. Cross-slice communication should happen through narrow data contracts or game actions rather than direct mutation.

## Branch slicing
Future GitHub work should be assignable by slice rather than by arbitrary task size. Typical slices are world, mines, station, save, UI, and content, with app wiring and platform work isolated when needed.

## Testing philosophy
The most important tests are those that protect the game loop, save integrity, seeded generation, and slice boundaries. The architecture should encourage testability at the domain level, even if the initial implementation stays light on tests.

## Content pipeline
Seeded names and destination generation should come from content data, not from UI code. If a later authored content layer appears, it should plug into the content slice without changing world or station rules.

## Performance envelope
The game should remain smooth on mobile devices, with low-cost rendering and a modest simulation budget. The architecture should favor simple data structures and predictable updates over heavy client-side complexity.

## Agent framing
This repository is intended to be understandable by AI coding agents as well as human developers. The architecture doc should explain the system shape, while `Agents.md` can later define the operational rules for making changes in this repo.

## AI agent constraints
The architecture doc should state the boundaries an AI contributor must respect: keep changes within a slice when possible, avoid inventing new stack layers without a reason, preserve the seed/save model, and prefer refactors that keep the monolith understandable. The later `Agents.md` file should carry the execution-specific rules such as tool usage, package manager preferences, formatting, and workflow habits.

## Release boundaries
A slice is ready for branch-level work when it has a clear owner, narrow inputs and outputs, and minimal dependency entanglement. Slices should be small enough that an AI agent can modify them without needing to understand the entire game at once.

## Future evolution
The architecture should leave room for later systems without requiring them now. The most important future slots are cloud save, desktop-first adaptations, and prestige/EI if the game later proves it needs them.

## Extensibility notes
Any new system should be added as a slice or clearly attached to an existing slice. Shared progress, cloud sync, and prestige should not force a rewrite of the world, mines, or station systems.

## Open questions
- How much of the future save layer should be schema-versioned from day one.
- Whether the long-term desktop product remains browser-based or migrates to a different client runtime.
- How much authored content the seed layer should generate versus selecting from templates.
- Which future system should become the first major post-MVP slice.
- What exact shape prestige/EI should take if it returns later.
