# MVP3 - World Grid & Exploration Prototype

**Game:** Merge & Choo-Choo  
**Tagline:** Dig, merge, and build your rail empire from rubble.  
**Spike Folder:** `003-world-grid-exploration`  
**MVP Sequence:** 001 → 002 → **003**

---

## Goal

Validate that the **world grid + exploration + navigation** system is understandable and fun when combined with the mining and station loops from MVP1 and MVP2.

This prototype exists to answer one primary question: can a player understand and enjoy discovering destinations on a hex grid, then navigate between the world, their plot, and their station in a coherent loop?

---

## Question Being Answered

When mining and station loops are integrated with a world map:

- Is the hex grid map readable on mobile?
- Does sending an explorer train feel like a good way to discover destinations?
- Do players understand the relationship between:
  - world grid,
  - their plot,
  - cities,
  - factories,
  - and their station?
- Can the player move from world → plot → station without confusion?
- Does exploration create meaningful tension or reward?

If the answer to these is mostly yes, then the core game structure is viable.

---

## What This Prototype Is

This is a **minimum viable prototype** that integrates:

- MVP1 mining loop,
- MVP2 station/train loop,
- plus a new world grid and exploration system.

It is not the full game. It is a focused vertical slice intended to prove that the three major systems work together in a playable flow.

---

## File Structure

```text
003-world-grid-exploration/
├── index.html          # main entry point: world grid + navigation
├── world.html          # hex grid world view (may be merged into index)
├── mines.html          # MVP1 mining board (adapted/reused)
├── station.html        # MVP2 station tab (adapted/reused)
└── README.md           # this file
```

**Entry Point:** Open `index.html` in a browser.

---

## Scope

### In Scope

- Hex grid world view.
- Player starts at their plot cell.
- At least one city or factory already discovered.
- One explorer train action.
- Explorer train takes time, then reveals random or scripted destination.
- Tap a destination to open its context:
  - plot → go to `mines.html`,
  - city/factory → destination info,
  - station → go to `station.html`.
- Mining loop (MVP1) still functional.
- Station & train loop (MVP2) still functional.
- Navigation between world, plot, and station.
- Placeholder balance values stored as variables.

### Out of Scope

- Full hex grid scaling.
- Full discovery randomness.
- Complex route maps.
- Multi-plot logistics.
- Age progression system.
- Engineering Ideas / prestige.
- Full polish.

---

## Prototype Summary

The player opens `index.html` and sees a hex grid world. They start at their plot cell. At least one city or factory is already discovered.

From the world grid, the player can:

- Tap their plot → go to the mining board (`mines.html`).
- Develop the plot into a station → go to the station tab (`station.html`).
- Send an explorer train to discover new destinations.
- Tap discovered cities/factories to see their info.

The prototype is successful if this flow feels coherent and the player understands how the world, plot, and station connect.

---

## Core Rules

### World Grid

- The world is a grid of hex cells.
- Each cell can be:
  - undiscovered/fogged,
  - player plot,
  - city,
  - factory,
  - other discovered location.
- Player starts at their plot cell.
- The grid is simplified for MVP3; exact size and scaling are TBD.

### Discovery

- Explorer train is sent from the station.
- Explorer train takes time to return.
- When it returns, one or more new locations are revealed.
- Discovery can be scripted or random in MVP3.

### Plot to Station

- A plot can be developed into a station once cleared enough.
- This rule is inherited from MVP2.
- For MVP3, this can be simplified as needed.

### Navigation

- World → Plot: tap plot cell → open mining board.
- Plot → Station: develop plot → open station tab.
- Station → World: return to world grid.
- City/Factory → Station: assign route from station to revealed destination.

---

## Success Criteria

This prototype is considered successful if:

- A player understands the hex grid map.
- A player understands what plots, cities, and factories are.
- A player can navigate between world, plot, and station without confusion.
- Exploration creates a sense of progression.
- Mining and station loops feel integrated, not isolated.
- The player feels like they are building a larger empire rather than managing isolated screens.

---

## Testing Checklist

### World Grid & Navigation

- [ ] Is the hex grid readable on mobile portrait?
- [ ] Does the player understand which cell is their plot?
- [ ] Does the player understand what discovered cities/factories are?
- [ ] Can the player tap a plot to open the mining board?
- [ ] Can the player return to the world grid from mining?
- [ ] Can the player navigate to the station from the plot?
- [ ] Does navigation feel natural?

### Exploration

- [ ] Does the explorer train action feel meaningful?
- [ ] Is discovery rewarding?
- [ ] Are new destinations clearly visible on the world grid?
- [ ] Does the player understand how to use discovered destinations?

### Integration

- [ ] Does mining still feel like MVP1?
- [ ] Does station still feel like MVP2?
- [ ] Do mining and station loops feel integrated on the world map?
- [ ] Does the player feel like they are building an empire?

---

## Known Placeholder Values

These should be configurable rather than finalized:

- grid size,
- grid layout,
- discovery chance,
- explorer train time,
- destination payout,
- placeholder art for hex cells.

---

## Known Risks

- The hex grid may be visually noisy on mobile.
- The player may not understand what each cell type is.
- Discovery may feel random without meaningful reward.
- Navigation may become confusing if world → plot → station is not clear.
- The prototype may feel too scattered if integration is weak.

---

## Placeholder Asset Rule

Prototype placeholder representation can use whichever format is fastest and clearest for testing:

- Emoji, such as `🚂` or `⛏️`.
- Short uppercase labels, such as `ENGN`, `STN`, or `C-CART`.
- Simple SVG assets scaled as needed.

The goal of placeholder assets in MVP work is clarity and speed of iteration, not final art direction.

---

## Recommended Dev Constraints

- Keep the hex grid small and simple.
- Keep exploration logic minimal.
- Reuse MVP1 and MVP2 logic as much as possible.
- Keep navigation obvious and consistent.
- Use placeholder shapes/colors for hex cells.
- Avoid adding prestige hooks into MVP3.

---

## What This Prototype Must Teach

By the end of MVP3, the team should know:

- Whether the world grid is readable and fun.
- Whether exploration feels meaningful.
- Whether navigation between world, plot, and station is clear.
- Whether mining and station loops reinforce each other in a world context.
- Whether the game feels like a coherent empire-building experience.

---

## Next Spike

If MVP3 validates well, the next prototype should focus on:

- **MVP4 - Integrated Core Vertical Slice**

That slice would likely test the full loop:
- clear rubble → develop station → buy/send train → discover destinations → route train → expand empire.

---

**Status:** Drafted for implementation planning  
**Purpose:** Validate world grid, exploration, and navigation integrated with mining and station  
**Project:** Merge & Choo-Choo