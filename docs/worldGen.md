# worldGen Design Document

## Overview

`worldGen` is a deterministic overworld generator for Mines & Choo-Choos. It generates an infinite-in-theory axial hex map whose tiles begin as fog and are revealed by player exploration. The generator is seeded by `SettingsState.worldSeed` and `EngineeringState.resetCount`, so the world regenerates from scratch on reset while remaining deterministic for a given seed/reset pair.

The purpose of `worldGen` is not only to place world tiles, but to support exploration, route planning, balance tuning, and future progression systems. The first implementation should stay simple, readable, and data-driven.

## Goals

- Support a world map built on axial hex coordinates.
- Make exploration feel intentional, readable, and diverse.
- Allow easy balancing through ring-based pools, weights, caps, and formulas.
- Guarantee early progression without requiring full handcrafted maps.
- Keep helper logic small and reusable: rings, neighbors, distance, seeded rolls, naming, and tile selection.
- Allow the world to regenerate from scratch on reset.

## Non-goals

V1 does not include:
- Biomes.
- Road networks.
- Story events.

V1 may include `blocker` as a gameplay tile kind, with blocker flavor such as river, lake, or mountain. These are flavor variants of blocker behavior, not full environmental simulation systems.

## Seed inputs

`worldGen` should be deterministic from:
- `SettingsState.worldSeed`.
- `EngineeringState.resetCount`.

Suggested combined seed model:
- Build a stable string or numeric tuple from `(worldSeed, resetCount)`.
- Feed it into a seeded RNG used for all world generation rolls.

Current naming preference:
- Initial plot naming should stay data-driven.
- For the target case of world seed `123456` with reset count `0`, the plot-name list can be arranged so the normal seeded picker yields `Prague` at the desired index.
- This is preferred over a one-off special-case branch in generation logic.

## World model

### Coordinate system

The map uses axial hex coordinates.

Each tile should have at least:
- `q`, `r`.
- `ring`.
- `tileKind`.
- `discovered` or equivalent reveal state.
- Optional generated name.
- Optional type-specific properties.

Suggested tile kinds:
- `fog`
- `empty`
- `plot`
- `city`
- `factory`
- `blocker`

### Semantics

- `fog`: unrevealed tile; valid exploration destination; not passable.
- `empty`: revealed but non-special tile; passable.
- `plot`: destination for plot expansion and age-resource transfer between plots; passable with penalty.
- `city`: passenger destination; only passenger carts count; passable with penalty.
- `factory`: cargo destination; only cargo carts count; accepts one or more resource types; passable with penalty.
- `blocker`: impassable tile such as future river/lake/mountain flavor obstruction.

## Initial world state

Initial boot state:
- World starts at ring `0` with one starting `plot` tile.
- For the target default start, the seeded naming flow should yield `Prague` through normal list ordering rather than through a hardcoded exception.
- The next six adjacent tiles are ring `1` and start as `fog`.
- The initial visible world therefore contains 7 tiles: one discovered starting plot and six fog tiles in ring 1.

The player always sees the next frontier ring as fog and may choose which fog tile to explore.

## Exploration model

Exploration is selective, not full-ring reveal.

Rules:
- The player can target any visible fog tile.
- A fog tile is a valid destination for any train with any cart layout.
- A common fast-discovery strategy may be to send a strong engine with no carts.
- On arrival, a fog tile is revealed into one of the allowed tile kinds for that ring.
- If the current ring has already hit its cap for special tiles, the revealed tile becomes `empty`.
- A fog tile may reveal into a `blocker` once blockers enter the allowed pool.

This allows the player to either:
- clear one ring at a time, or
- pursue a line through the fog toward a distant target.

## Ring rules

The generator should be driven by per-ring templates.

### Ring 0
- Exactly one starting `plot`.
- Special-case name may be `Prague`.

### Ring 1
- 6 tiles total.
- Pool excludes `plot`.
- Exactly 1 to 3 non-empty special tiles total.
- Those special tiles are split between `city` and `factory` using an adjustable formula.
- Remaining ring 1 tiles reveal as `empty`.
- Factory support may allow multi-resource definitions internally, but early discoveries should usually be single-resource.

### Ring 2
- First ring where `plot` is included in the pool.
- Still relatively conservative balance.

### Ring 3
- Higher cap on non-empty tiles.
- Better ratios for more valuable discoveries.

### Ring 4
- First ring where `blocker` is included in the pool.
- Pool can include `city`, `factory`, `plot`, `empty`, `blocker`.

### Ring 5+
- More blockers.
- Better tiles.
- More room for balance scaling.

## Balance knobs

`worldGen` should be easy to rebalance by data.

Suggested knobs:
- Per-ring allowed tile pool.
- Per-ring min/max counts by tile kind.
- Per-ring cap on non-empty tiles.
- Weighted ratios by tile kind.
- Factory vs city ratio formula.
- First-appearance ring for each tile kind.
- Plot frequency by ring.
- Blocker frequency by ring.
- Resource-demand weights for factories.
- Plot acquisition condition thresholds.
- Max acceptable quantity for city/factory destinations.
- Name-pool fallback behavior.

The design goal is for most balancing to happen in config, not in branching generator code.

## Pathing and route cost

Pathing is automatic between two user-selected tiles.

Rules:
- Trains may pass through `empty`, `plot`, `city`, and `factory`.
- Trains may not pass through `fog` or `blocker`.
- Passing through occupied/meaningful tiles applies a penalty.
- The practical form of that penalty is speed reduction, which increases route-finding path cost and therefore travel time.
- Travel time also depends on axial distance, train engine age and level, and train weight.
- A future `railNetwork` tile upgrade should instead apply a bonus, not a penalty.

Suggested separation of concerns:
- `hexDistance(a, b)` for pure axial range math.
- `getTileTraversalCost(tile)` for per-tile movement modifier.
- `getTrainWeight(train)` for cart/load-derived cost input.
- `findRoute(start, end, world, train)` for shortest legal path on revealed map.
- `getRouteTravelTime(route, train)` for final time calculation.

Notes:
- `getTrainWeight(train)` already exists elsewhere in the codebase.
- `getRouteTravelTime(route, train)` may already exist in station logic and should be reused or aligned rather than duplicated.
- `getTileTraversalCost(tile)` should support both positive and negative values so it can model penalties now and bonuses later.

For axial hex grids, distance is commonly computed via cube-distance equivalence derived from axial coordinates. That keeps route-time math straightforward and deterministic. [web:2651][web:2662]

## Destination behavior

### Fog
- Valid exploration destination for any train/cart setup.
- On arrival, exploration consumes time and reveals the tile.

### City
- Destination for passenger routes.
- Only passenger carts count.
- Has a max acceptable quantity for people/passenger throughput, controlled by balancing config or formula.
- Intended later as a source of money and possibly Engineering Ideas.
- Meta rewards are deferred for now.

### Factory
- Destination for cargo routes.
- Only cargo carts count.
- Acts as a resource sink in exchange for money and later possibly Engineering Ideas.
- Has a max acceptable quantity for resource throughput, controlled by balancing config or formula.
- Should support one or more accepted resource types.
- Early rings should mostly produce simple or single-resource factories.

### Plot
- Destination for inter-plot resource transfer.
- Discovering a new plot creates a future expansion opportunity.
- A newly discovered plot can later be purchased if the player meets adjustable requirements.

## Plot acquisition

Plots are both world locations and expansion targets.

A newly discovered plot can be purchased when adjustable conditions are met, such as:
- Enough `GameSessionState.money`.
- Required sunk or delivered resource totals.
- Possibly people or passenger-related requirements.

On successful acquisition:
- The player gains an additional selectable plot.
- The new plot starts with a new mine at depth 0.
- The new plot starts with a station containing a free platform.
- The underground or mine state is fresh pending soft-clear of depth 0.

These requirements should be balance knobs, not hardcoded logic.

## Empty tile flavor

`empty` is a true tile kind, distinct from `fog`.

For UI and story flavor, empty tiles may be rendered contextually as:
- Fields.
- Desert.
- Suburbs if next to a city.
- Forest or Industrial Area if near a factory.

Decision:
- Keep `empty` as stored truth.
- Empty-tile flavor should be derived at render time from nearby tiles until gameplay needs it.

## Blockers

`blocker` is a valid revealed tile kind starting at ring 4.

Rules:
- A fog tile can reveal into a blocker.
- Blockers are impassable.
- Flavor may include river, lake, or mountain.

Because unrevealed fog can always collapse to `empty` when needed, total generator failure is unlikely.

## Naming

The generator should include helper functions for picking names from pools.

### Plot names

Rule of thumb:
- Real cities.

Current starter pool:

```ts
const PLOT_NAMES: string[] = [
  'Prague', 'Brno', 'Berlin', 'Munich', 'Amsterdam',
  'Eindhoven', 'Antwerp', 'Tel Aviv', 'London', 'Tokyo',
  'Sydney', 'Austin TX'
];
```

Rules:
- Plot names must be unique within a run. (e.g. If `Prague` is used as the initial plot name, it should be removed from future plot-name picks for that run.)
- Plot names are finite at runtime, but easy to expand in data.

### City names

Rule of thumb:
- Fictional places.

Current starter pool:

```ts
const CITY_NAMES: string[] = [
  'Narnia', 'Atlantis', 'The Shire', 'Omicron Persei 8',
  'Vulcanus', 'Fulgora', 'The Citadel'
];
```

Rules:
- City names must be unique within a run.
- City names are finite at runtime, but easy to extend in data at any time.

### Factory names

Rule of thumb:
- Punny, relevant, and industrial.

Current starter pool:

```ts
const FACTORY_NAMES: Record<string, string[]> = {
  Oil: ['The Crude Awakening Refinery', 'Liquid Gold Ltd'],
  Coal: ['The Soot-able Manufacturing Co.'],
  Copper: ['The Penny Pincher Foundry', 'Caesar Crappy Copper'],
  SuperAlloy: ['The Metal-morphosis Plant'],
  OilAndCoal: ['The Black Gold Junction']
};
```

Rules:
- Factory names may repeat.
- Factories do not need to be constrained by a finite unique-name pool.
- Factory naming should be keyed by one or more accepted `ResourceType` values rather than by a separate bespoke enum where possible.

### Name depletion behavior

If a unique plot or city name cannot be assigned:
- The event should be logged.
- A world-state depletion flag should be set.
- Once that flag is set, every future city or plot roll should resolve to `blocker`.
- The game should treat this as a strong signal that the player is encouraged to reset the world.
- Resetting increases Engineering Ideas and produces a new world because reset count changes the seed input.

UI note:
- A reset dialog may be offered when this occurs.
- If one of the two pools still has names left, the player may ignore the reset and keep playing.
- If both plot and city pools are exhausted, the UI may eventually force a no-ignore reset path.
- This dialog behavior may sit above `worldGen` and belong to UI or session orchestration rather than to the generator itself.

## Helper functions

Suggested helper surface:

- `getHexNeighbors(coord)`
- `getHexRing(center, ring)`
- `getHexDistance(a, b)`
- `getRingIndex(coord)`
- `makeSeededRng(worldSeed, resetCount)`
- `pickWeightedTileKind(ring, context, rng)`
- `pickUniquePlotName(pools, state, rng)`
- `pickUniqueCityName(pools, state, rng)`
- `pickFactoryName(factoryType, pools, rng)`
- `revealFogTile(tile, ringConfig, worldState, rng)`
- `getTileTraversalCost(tile)`
- `findRoute(start, end, world, train)`

## Validation philosophy

The generator should prefer graceful fallback over hard failure.

Validation priorities:
- Early rings should not be boring.
- Early rings should not starve progression.
- Ring rules should preserve enough access to cities, factories, and plots to keep expansion possible.
- If a reveal roll would break ring caps or generate an undesirable result, fallback should usually convert to `empty`.

Current design assumption:
- World generation does not truly fail because fog can always reveal into `empty`.

## V2 note already worth preserving

Possible later system:
- The player may spend Engineering Ideas to upgrade an `empty` tile into a `railNetwork` tile.
- `railNetwork` would improve speed or pathing for routes that pass through it.
- This should be considered in V1 data-model design even though it is not implemented yet.

## Recommended module split

To avoid a god-file, split responsibilities:
- `worldGen.ts`: seeded reveal and generation rules.
- `hex.ts`: axial coordinate math, rings, neighbors, distance.
- `worldTypes.ts`: tile and config types.
- `worldBalance.ts`: ring configs, weights, caps, formulas.
- `worldNames.ts`: name pools and naming behavior.
- `worldPathing.ts`: route-finding and traversal cost.

## Design decisions and remaining open questions

### Resolved decisions

- Empty-tile flavor should be derived rather than stored in V1.
- Ring 2 and ring 3 ratios should use weights plus caps.
- Per-ring configuration should use a split schema built from `pool + caps + guarantees`, with city-to-factory ratio handled by formula where needed.
- City and factory capacity should be stored on the generated tile, even if produced from config and formula inputs.
- Plot purchase requirements should live outside `worldGen` in progression or economy logic unless a later design explicitly moves them into generated world data.
- Route-finding should minimize total travel time only.
- Blocker clustering for V2 should be low soft clustering; V1 does not need visible clustering behavior.
- Name depletion for unique plot and city pools should fallback to `blocker`, with reset surfaced by UI above the generator.

### Remaining open questions

- Infinite-world loading strategy is documented as future-facing hybrid intent, but V1 implementation should stay ring-based only.
- The exact config schema fields and formula signatures still need to be written as final TypeScript types.
