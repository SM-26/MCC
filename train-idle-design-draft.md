# Merge & Choo-Choo

**Tagline:** Dig, merge, and build your rail empire from rubble.

## Overview

This project is a mobile-first idle railway tycoon with mining and roguelite-style resets. The player starts from a single ruined plot of land, clears rubble, builds a first station, sends out trains, discovers cities and factories, digs downward for age-defining resources, and eventually resets the station with a literal nuclear strike to gain permanent meta-progression through Engineering Ideas (EI). The game is intended for portrait mobile play first, with possible later support as a PWA that can also be played on desktop.

The design combines several proven incremental structures: a short-session idle loop, spatial expansion, train route optimization, depth-based progression, and prestige tree unlocks that reveal new layers of the game over multiple runs.

## Core fantasy

The player fantasy is to become a rail tycoon from absolute zero. The game begins with nothing but a ruined plot and rubble, then grows into a layered transport empire with stations, routes, cargo contracts, passenger service, underground platforms, and multiple discovered cities.

The intended emotional arc is:

- Start with one miner and one ruined plot.
- Clear rubble for startup money.
- Build the first station.
- Launch the first train.
- Discover new cities and factories.
- Expand sideways and underground.
- Unlock new train ages through mining.
- Reset deliberately to unlock deeper and wider future runs.

This “start from almost nothing” progression is a strong fit for idle and tycoon design because it makes every new system feel earned.

## Platform and format

The primary target is portrait-oriented mobile play. The game is expected to support short, repeatable sessions where the player opens the app, merges miners, collects payouts, dispatches trains again, and makes a small set of meaningful decisions.

A later version may support desktop web play through a PWA-style implementation. If that happens, the first version should preserve the mobile-first logic and either center the portrait layout on desktop or later expand into a wider management layout with more side panels.

## High concept

The game structure has four tightly connected layers:

1. **Plot layer** — clear rubble, buy neighboring plots, and dig downward.
2. **Mining layer** — buy and merge miners to clear rubble and deeper terrain.
3. **Rail layer** — build stations, platforms, trains, carts, and routes.
4. **Meta layer** — nuke a station, gain EI, and unlock new permanent options in a prestige tree.

The important design principle is that these layers feed each other instead of existing as separate minigames. Rubble clearing provides early cash, mining unlocks train ages, trains generate the main long-term money, and prestige unlocks future map complexity and depth.

## Game loop

### Core loop

The minute-to-minute loop is:

- Clear rubble with miners.
- Earn startup money from surface rubble.
- Choose whether to expand sideways, build a station, or dig down.
- Build trains and assign routes.
- Collect trip payouts.
- Reassign or optimize trains and carts.
- Dig deeper for age resources.
- Unlock stronger train ages.
- Eventually nuke the station for EI.

This structure follows a common incremental pattern where one newly unlocked layer becomes the engine that powers the next one.

### Session loop

A normal short session in the midgame is expected to look like this:

- Merge same-level miners.
- Buy additional low-level miners if useful.
- Check each station.
- Collect completed train payouts.
- Send trains back out on routes.
- Make one or two expansion or upgrade decisions.

This is well-suited to mobile play because it provides a short sequence of tactile actions and optimization decisions without requiring long uninterrupted sessions.

## Starting flow

The first five minutes should teach the game in a strict sequence:

1. The player sees that there are multiple cities in the larger world, but only starts with access to the first city.
2. The first city contains a single ruined plot.
3. The plot begins as land covered in rubble.
4. The player hires the first miner.
5. The miner slowly clears rubble tile by tile, inspired by Gold & Goblins-style progression where worker power and merging affect clearing speed.
6. Surface rubble provides early money.
7. After the first layer is cleared, the player can choose one of three actions: expand, build a station, or dig down.

This creates a simple onboarding sequence where every new mechanic is introduced only after the previous one becomes understood.

## World structure

### Cities

Multiple cities exist in the world, but they start locked and hidden until discovered. Cities currently share the same ruleset and do not yet have special traits. This is appropriate for early scope control and MVP design.

Each city begins as a bare ruined plot. Over time, the player can reclaim it, build stations, add underground platforms, connect it to other discovered locations, and eventually use older stations to help bootstrap newer ones through train service.

### Plots

Each city is built from plots. In the current design, the early scope limit is one starting plot and later northward expansion through prestige unlocks. The original working early scope limit is four northward plots, but prestige can unlock higher limits later.

On each plot, the player can:

- Buy more miners.
- Merge miners.
- Buy the next plot north.
- Dig down.

This keeps the available decisions limited and readable on a phone screen.

### Vertical structure

Each plot also extends downward. The player can dig down only after fully clearing the previous level. Lower levels are harder to clear, which naturally creates the choice between merging miners into stronger units or buying many lower-level miners and waiting longer.

At certain depths, especially multiples of five, new structural options open up such as subway tech, meaning underground platforms. Underground layers create additional route choices inside a city and between player-controlled assets.

## Mining system

Mining begins as rubble clearing and later becomes age progression. Surface rubble gives money. Dirt itself does not provide direct income. Deeper layers contain age resources and progression materials.

Known key resources include:

- Coal.
- Oil.
- Copper.
- Super-alloy.

These resources are mainly used to unlock train ages within a city, though some of them can also be sold to factories for immediate money at the cost of delaying the next age.

### Miner system

The game starts with one miner. The player later buys additional miners and can merge equal-level miners into stronger ones, following the merge-based power pattern used in other idle worker games.

Current miner design principles:

- Miners are represented individually.
- Miners have levels.
- Equal-level miners can be merged into a higher-level miner.
- The player may choose between a few strong miners or an army of weaker miners.
- Higher depths make miner progression relevant throughout the game.

This system gives the excavation layer its own satisfying tactile loop rather than reducing digging to a passive timer.

## Age progression

Age progression is **city-specific**, not global. That means one city can still be at a lower technology stage while another city has already advanced. This is important because it makes each city a local puzzle and supports the fantasy of bootstrapping new areas with help from more developed ones.

Current age ladder:

- Basic starting stage.
- Steam age unlocked by coal.
- Diesel age unlocked by oil.
- Electric age unlocked by copper.
- Maglev age unlocked by super-alloy.

Ages matter because they create major jumps in train strength. Small engine upgrades improve trains incrementally, but advancing into a new age produces the big leap in speed and carry capacity.

### Resource trade-off

Some age resources can also be sold to factories for cash. For example, oil can be sold for money instead of being saved for diesel progression. Copper can also be sold. This creates a healthy strategic tension between short-term profit and long-term advancement.

## Station and platform system

Stations are built on cleared land. A station can then support train operations. The station becomes the core logistics asset of a plot.

Each platform holds exactly one train. This is a strong simplification for mobile play because it makes capacity, assignment, and route management easy to understand.

Underground platforms are unlocked as subway tech. These are effectively underground station extensions that create more route options inside the same city footprint.

### Platform types

The current design suggests platform roles can differ by what the player builds on the plot and underground layer:

- Passenger-oriented surface platforms.
- Factory-oriented cargo platforms.
- Underground platforms for additional route capacity and cross-city/plot connections.

The system should stay flexible enough that later design iterations can decide whether stations specialize more strongly or remain mixed-use.

## Trains and carts

### Train ownership and assignment

A train belongs to a platform, not permanently to one route. The player can change a train’s route from the train yard, swap its carts, and advance its age there.

This creates a station-management style of play rather than a purely fixed route system, which is good for a tycoon game.

### Train progression

Train progression happens on two scales:

- **Incremental engine upgrades** improve performance in smaller steps.
- **Age advancement** provides the major improvement in speed and maximum carrying capability.

The intended result is that normal upgrades feel meaningful, but age unlocks feel transformative.

### Cart types

Current passenger cart types:

- Simple passenger cart.
- Double-floor passenger cart.
- Luxury passenger cart.

Current cargo type:

- Generic factory cargo cart.

Passenger cart differences are defined as follows:

- Simple passenger cart carries X passengers.
- Double-floor passenger cart carries 2X passengers.
- Luxury passenger cart carries X passengers, but each passenger is worth roughly 2X value.

This is a strong design because it makes cart choice a route strategy decision rather than just a linear upgrade path.

## Exploration and destinations

Exploration is an idle action performed by sending a train engine out on a timed discovery route. Exploration takes a fixed amount of time. After the timer completes, a new destination may be discovered.

Destinations include:

- Cities, which become passenger destinations.
- Factories, which become cargo destinations.
- Later, player-owned stations on other plots.

After a destination is discovered, the line’s route time becomes fixed. Distance itself does not change later; improved train speed is the way to improve travel efficiency.

This is a strong mobile-friendly choice because it avoids fiddly map pathing while still preserving a feeling of discovery.

## Route and income model

### Route identity

A route is defined by:

- Origin platform.
- Destination.
- Destination type.
- Fixed discovered distance.
- Assigned train and cart configuration.

Some destinations have train limits of one. Others can support two or more trains. This acts as a scarcity mechanic and prevents the player from endlessly stacking every train onto the single best destination.

### Income calculation

Trip value is currently based on:

- Number of passengers, if the destination is a city.
- Amount of cargo, if the destination is a factory.
- Distance from the home platform.

Train speed and mass then determine how quickly that value is realized over time.

The intended optimization rule is:

- Smaller or faster trains complete more trips but earn less per trip.
- Larger or heavier trains earn more per trip but take longer.

This creates a satisfying throughput-versus-payout trade-off that should remain central to the balancing model.

### Bootstrap routes

When the player opens a second plot and builds another station, trains from the first station can help bootstrap it. For simulation purposes, this is treated similarly to a factory-style destination. This is a good abstraction because it reuses the same logistics logic instead of requiring a separate special-case system.

## Factories

Factories are intentionally simple in the current draft. They differ mainly by which input they accept and how much value they provide. This is appropriate for an MVP because it avoids overcomplicating the production chain before the route economy is proven.

Factories currently serve these purposes:

- Cargo destinations for trains.
- Buyers of selected mined resources such as oil and copper.
- Sources of short-term profit that compete against long-term age progression.

Later versions may expand factories into a more involved chain system, but that is not required for the initial concept.

## Prestige and meta-progression

### Reset fantasy

The reset is literal: the player **nukes** the station. This destroys the local build and returns the player to rubble-clearing, which is why every new run begins by clearing a damaged plot again. This gives the reset mechanic a distinctive and memorable in-world explanation.

### Prestige currency

Prestige points are called **Engineering Ideas (EI)**. EI is shared globally across all cities. This is important because it means every run and every city contributes to one larger account-level progression pool.

### Reset trigger and first milestone

An example early progression path is:

- Before the first reset, the player has no north expansion limit beyond the starter plot.
- The initial dig limit is five levels.
- After clearing five levels and making ten total trips, the player can choose to nuke.
- Nuke grants EI based on how advanced the station was.
- EI can then unlock deeper levels such as 6–10, where coal first appears, or unlock subway tech, or other permanent benefits.

This structure is very strong because the first reset is not just a speed reset; it is a content reveal.

### EI tree

Prestige upgrades are organized in a tree structure rather than a flat shop. This allows the player to make strategic choices about long-term specialization.

Known or proposed EI unlock categories:

- Increase north plot limit.
- Increase dig depth limit.
- Unlock deeper resource layers.
- Start future runs at a later age.
- Unlock subway tech / underground platforms.
- Increase city or factory train limits.
- Unlock the ability to send trains to bootstrap new player plots.

This is an excellent use of prestige because it grants not only power, but also new kinds of map complexity and logistics possibility.

## Roguelite identity

The game currently contains a strong prestige loop, but only a light roguelite identity beyond that. The reset structure is already established, but several roguelite-specific elements are still open.

Possible future roguelite directions include:

- Branching EI tree paths that meaningfully alter each run.
- Different city depth/resource layouts in later versions.
- Milestone-based unlock tracks over the first several resets.
- Optional random discovery variation in route destinations.

For the MVP, the current prestige structure is already sufficient. Additional roguelite depth can be layered in once the base economy is stable.

## User interface direction

### Portrait-first UI

The game should be designed for portrait mobile first, because the player’s main actions are compact, repeated, and decision-light: merge miners, collect payouts, dispatch trains, and choose upgrades.

A likely main-screen structure is:

- Top: current plot and miners clearing rubble.
- Middle: station/platform status.
- Bottom: train cards, route controls, and upgrade actions.

This remains flexible, but the core requirement is that one-handed play and short session readability remain the priority.

### Desktop/PWA adaptation

If a desktop/web version is built later, two sensible approaches exist:

- Keep the portrait layout centered within a desktop window.
- Expand into a wider management view with side panels, while preserving the same underlying interaction model.

The first option is safer for MVP. The second is better for a later premium or polished release.

## Scope assumptions for MVP

The current MVP should deliberately stay narrow.

### Included in MVP

- One basic visual style placeholder.
- Portrait mobile-first interface.
- One city ruleset reused across all discovered cities.
- Surface rubble clearing.
- Buy/merge miners.
- Station building.
- One train per platform.
- Exploration timer that discovers cities and factories.
- Passenger routes.
- Cargo routes.
- City-specific age progression.
- Coal, oil, copper, and super-alloy depth progression.
- EI-based nuke reset.
- EI prestige tree with a small first branch set.

### Explicitly postponed

- Auto-collect.
- Auto-send.
- Fuel upkeep.
- Track maintenance and degradation systems.
- Deep factory production chains.
- City-specific traits.
- Sophisticated visual theming.
- Combat or enemies.
- Large randomness systems.

This is important because the current design is already rich enough to become too large if every future idea is pulled into version one.

## Technical direction

A practical technical target for this concept is a mobile-first web application or PWA, because the game’s interaction model is built around menus, timers, route cards, and simple 2D management screens rather than high-end graphics. PWAs can also support installability and optional offline-friendly play if implemented with the right service worker and storage approach later.

From earlier stack discussion, a TypeScript-first implementation remains the most pragmatic fit for this design because it maps well to web/PWA delivery, mobile-friendly UI, and incremental product iteration.

## Open design questions

The current concept is strong enough to move into structured design, but several questions remain open:

- Visual tone and art direction.
- Exact balance formulas for trip value and speed scaling.
- Whether stations can mix passenger and cargo platforms freely or should specialize more.
- Whether cities will eventually gain unique traits.
- Whether factories will remain simple buyers or evolve into multi-stage production chains.
- The exact structure of the first EI tree branch.
- Whether route discovery is handcrafted, systemic, or mixed.
- How many underground layers per city are reasonable before pacing suffers.
- How and when auto-collect and auto-send should unlock.

These are normal unresolved areas for a first design draft and do not block progression into a more detailed GDD.

## Summary of current identity

The current concept can be summarized as follows:

A portrait-first mobile idle rail tycoon where the player starts from a ruined plot, clears rubble with mergeable miners, builds stations and trains, discovers cities and factories through timed exploration, unlocks stronger train ages by digging for deeper resources, expands both sideways and underground, and repeatedly nukes stations to earn Engineering Ideas that unlock a prestige tree of permanent upgrades and deeper future runs.
