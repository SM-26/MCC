# MVP2 - Station & First Route Prototype

## Goal

Validate that the **station-to-train-to-payout loop** is fun enough to become the second core pillar of **Merge & Choo-Choo**.

This prototype exists to answer one primary question: after the mining loop works, does developing a plot into a station and repeatedly sending a train on a route feel satisfying, readable, and worth expanding?

## Question Being Answered

Can a player enjoy and understand the following loop without needing the full world map, factories, age progression, or prestige systems?

- Develop a cleared plot into a station.
- Open the station tab.
- Buy a train engine.
- Add or upgrade carts.
- Assign the train to one destination.
- Wait for trip completion.
- Collect payout.
- Send the train again.

If this loop is not fun, then the game should not move into full integration with world exploration and multi-plot logistics yet.

## What This Prototype Is

This is a **minimum viable prototype** of the first station and first train loop.

It is not the full station system. It is a focused spike intended to prove that the player enjoys:
- converting a mined plot into a transport asset,
- buying and upgrading one train,
- and operating one simple route repeatedly.

## Scope

### In Scope

- One plot that can be considered “cleared enough” for station development.
- A station tied to that plot.
- A station tab UI.
- One platform.
- One train per platform.
- One train engine.
- Engine level upgrades.
- One or more cart slots, if simple enough.
- At least one passenger destination **or** one factory destination.
- Route assignment.
- Trip timer.
- Payout on trip completion.
- Manual collect.
- Manual resend.
- Basic station status display.
- Placeholder balance values stored as variables.

### Out of Scope

- World map tab as a real system.
- Multi-city discovery flow.
- Exploration timer.
- Multiple plots interacting.
- Multiple stations at once.
- Age progression as a full unlock tree.
- Engineering Ideas / prestige.
- Automatic dispatch.
- Automatic collect.
- Underground platforms / subway.
- Track maintenance.
- Fuel systems.
- Multiple destination capacities.
- Fancy art or full final UI polish.

## Prototype Summary

The player begins from a plot that is already valid for station development or can be instantly marked valid for testing. They build a station on that plot, which unlocks the station tab.

Inside the station tab, the player buys one train engine, optionally attaches a basic cart, assigns the train to one destination, waits for the trip timer to complete, collects money, and sends the train again.

This prototype is successful if this loop feels meaningfully different from mining, but still complementary to it.

## Core Rules

### Plot to Station Transition

- A plot can be developed into a station once it meets the required condition.
- For MVP2, that condition can be simplified to a debug-ready flag or “plot cleared enough.”
- Building the station costs money.
- Each station belongs to exactly one plot.
- The station is the transport identity of that plot.

### Station Rules

- MVP2 contains exactly one platform.
- One platform holds exactly one train.
- If no train exists yet, the player can buy one.
- The station tab should show:
  - station status,
  - platform state,
  - train state,
  - route state,
  - payout readiness.

### Train Rules

- One train belongs to one platform.
- The train can be idle, traveling, or ready for collection.
- The player can manually send the train on a route.
- The player can manually collect payout after arrival.
- The train is then available for another send.

### Engine Rules

- The train has an engine level.
- Engine upgrades increase speed and/or carry capability.
- MVP2 does not need final balance; values should be variable-driven.
- If cart support is included, engine capacity should be enough to justify cart decisions later.

### Cart Rules

For MVP2, use the smallest workable version:

#### Option A - Simpler MVP2
- One basic cart type only.
- Cart count affects payout.
- Cart count affects trip time.

#### Option B - Slightly richer MVP2
- Basic passenger cart.
- Basic cargo cart.
- One active cart setup per train.

If scope is tight, Option A is better.

## Destinations

MVP2 should include only the minimum number of destinations needed to test the loop.

### Recommended MVP2 destination set

- One city destination **or**
- One factory destination

Do not include both unless implementation is trivial.

### City destination behavior

- Passenger route.
- Pays money after trip completion.
- Payout depends on passenger value and distance variables.

### Factory destination behavior

- Cargo route.
- Pays money after trip completion.
- Payout depends on cargo value and distance variables.

For MVP2, destination should be treated as a simple route card with a name, type, trip time, and payout formula.

## Route Loop

The route loop should be extremely clear:

1. Select or confirm destination.
2. Press send.
3. Train enters “traveling” state.
4. Trip timer counts down.
5. Train becomes “arrived / payout ready.”
6. Player presses collect.
7. Money is awarded.
8. Player can send again.

This is the exact loop MVP2 must validate.

## Economy

### MVP2 economy purpose

The economy only needs to answer these questions:

- Does buying a station feel meaningful?
- Does buying a train feel meaningful?
- Does a completed trip feel rewarding?
- Is there a visible benefit to upgrading the train?
- Is the wait length acceptable for mobile play?

### Variable-driven placeholder values

Use variables for:
- station build cost,
- engine cost,
- engine upgrade cost,
- cart cost,
- trip time,
- trip payout,
- speed modifier,
- load modifier.

## UI and Navigation

### Required UI

- A way to open the station tab from a developed plot.
- A platform panel.
- A train panel.
- A route panel.
- A send button.
- A collect button.
- Upgrade buttons.
- Money display.

### Recommended screen layout

Portrait-first station tab:

- Top: money and plot/station name.
- Middle: platform and train card.
- Below that: route info and timer.
- Bottom: main actions, buy/upgrade/send/collect.

### Navigation assumptions

For MVP2, do not build the full world tab yet unless already needed.

Acceptable access models:
- debug button from plot tab,
- simple “Open Station” button on developed plot,
- hardcoded station tab toggle.

The goal is to validate the station loop, not final navigation architecture.

## Success Criteria

This prototype is considered successful if:

- A player understands how to build or access the station.
- A player understands how to buy a train.
- A player understands how to send the train.
- Waiting for the trip to finish feels acceptable.
- Collecting payout feels satisfying.
- Upgrading the engine makes the route loop feel better.
- The station loop feels like a strong second pillar next to mining.

## Testing Checklist

### Basic Functionality

- [ ] Can a station be built or opened?
- [ ] Can a train be bought?
- [ ] Does the train appear on the platform?
- [ ] Can the train be assigned to a destination?
- [ ] Does pressing send start the trip timer?
- [ ] Does the timer complete correctly?
- [ ] Can payout be collected?
- [ ] Does money increase correctly?
- [ ] Can the train be sent again?

### Upgrades

- [ ] Can the engine be upgraded?
- [ ] Does the upgrade visibly change speed and/or payout behavior?
- [ ] If carts exist, can they be added or changed?
- [ ] If carts affect trip time, is that effect visible?

### UX

- [ ] Is the station tab understandable in portrait mode?
- [ ] Are send and collect clearly different states?
- [ ] Does the player know why a button is disabled?
- [ ] Is the train state always obvious?
- [ ] Is the route readable without extra explanation?

## Known Placeholder Values

These should be configurable rather than finalized:

- station build cost,
- route payout,
- route distance/time,
- engine speed multiplier,
- engine capacity multiplier,
- cart effect,
- destination value,
- upgrade scaling.

## Known Risks

- The station loop may feel too passive if waiting is too long.
- The station loop may feel pointless if payout is too small.
- Manual collect + manual resend may feel repetitive in a bad way.
- Train upgrades may feel cosmetic if their effect is too subtle.
- The station tab may become cluttered too early if too many upgrade options are added.

## Recommended Dev Constraints

- Keep exactly one platform.
- Keep one train only.
- Keep one destination type if possible.
- Keep state transitions obvious.
- Use placeholder shapes/cards, not polished station art.
- Avoid implementing the real world tab yet.
- Avoid adding prestige hooks into MVP2.

## What This Prototype Must Teach

By the end of MVP2, the team should know:

- Whether the train dispatch loop is fun enough to support the game.
- Whether the station tab is readable on mobile.
- Whether the wait/collect/resend rhythm feels good.
- Whether engine upgrades create meaningful improvement.
- Whether mining and station play are likely to reinforce each other in MVP4.

## Placeholder Asset Rule

Prototype placeholder representation can use whichever format is fastest and clearest for testing:

- Emoji, such as `🚂` or `⛏️`.
- Short uppercase labels, such as `ENGN`, `STN`, or `C-CART`.
- Simple SVG assets scaled as needed.

The goal of placeholder assets in MVP work is clarity and speed of iteration, not final art direction.

## Recommended Build Strategy

Implement in this order:

1. Open/build station.
2. Buy one train.
3. Add one destination.
4. Send timer.
5. Collect payout.
6. Resend loop.
7. Add engine upgrade.
8. Add cart support only if still small and clear.

That order reduces risk and keeps the prototype answering one question at a time.

## Next Spike

If MVP2 validates well, the next prototype should focus on the world overview and navigation context.

### Candidate Next Spike

**MVP3 - World Tab & Location Navigation Prototype**

That spike would likely test:
- one overview map,
- discovered plot/city/factory nodes,
- entering a plot,
- entering a station,
- understanding what exists in the player’s world.

---

**Status:** Drafted for implementation planning  
**Purpose:** Validate first station and train loop  
**Project:** Merge & Choo-Choo
